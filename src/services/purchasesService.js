import { emTransacao } from '../config/database.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as purchasesRepository from '../repositories/purchasesRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as idempotencyService from './idempotencyService.js';
import * as itemsService from './itemsService.js';
import * as streakService from './streakService.js';


const ESCUDO = 'escudo-de-sequencia';
const MAXIMO_DE_ESCUDOS = 2;

async function exigirVagaParaEscudo(idUsuario, item) {
  if (item.slug !== ESCUDO) return;
  if ((await streakService.escudosDisponiveis(idUsuario)) < MAXIMO_DE_ESCUDOS) return;

  throw new ErroAplicacao('Você já tem dois Escudos de Sequência guardados', {
    status: 422,
    codigo: 'LIMITE_DE_ESCUDOS',
  });
}

async function registrarCompra(conexao, { idUsuario, idItem, slug, preco }) {
  await coinsService.debitar(conexao, idUsuario, preco, {
    motivo: 'compra',
    referenciaTipo: 'item',
    referenciaId: idItem,
  });

  const compra = await purchasesRepository.criar(conexao, {
    idUsuario,
    idItem,
    quantidade: 1,
    precoUnitario: preco,
    precoTotal: preco,
  });

  await inventoryRepository.adicionar(conexao, {
    idUsuario,
    idItem,
    idCompra: compra,
    valorInicial: preco,
  });

  if (slug === ESCUDO) await streakService.sincronizarEscudos(conexao, idUsuario);

  return compra;
}

export async function comprar(idUsuario, idItem, { chaveDeIdempotencia = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const preco = Number(item.price);

  await exigirVagaParaEscudo(idUsuario, item);

  const pendencias = await itemsService.requisitosNaoCumpridos(idItem, idUsuario);
  const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);

  if (bloqueios.length > 0) {
    throw new ErroAplicacao('Você ainda não cumpre os requisitos deste item', {
      status: 422,
      codigo: 'REQUISITO_NAO_CUMPRIDO',
      detalhes: bloqueios,
    });
  }

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  if (!chaveDeIdempotencia) {
    const idCompra = await emTransacao((conexao) =>
      registrarCompra(conexao, { idUsuario, idItem, slug: item.slug, preco }),
    );
    return concluir(idUsuario, idItem, item, preco, idCompra, pendencias, saldoAntes);
  }

  const { idCompra, repetida } = await idempotencyService.executarUmaVezSo(
    {
      chave: chaveDeIdempotencia,
      idUsuario,
      operacao: 'compra',
      pedido: { idItem },
    },
    {
      executar: async (conexao) => ({
        idCompra: await registrarCompra(conexao, { idUsuario, idItem, slug: item.slug, preco }),
        repetida: false,
      }),
      aoRepetir: async () => ({
        idCompra: (await purchasesRepository.buscarUltimaDoItem(idUsuario, idItem))?.id ?? null,
        repetida: true,
      }),
    },
  );

  if (repetida) {
    return { idCompra, item, precoPago: preco, repetida: true, avisos: [] };
  }

  return concluir(idUsuario, idItem, item, preco, idCompra, pendencias, saldoAntes);
}

async function concluir(idUsuario, idItem, item, preco, idCompra, pendencias, saldoAntes) {
  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'compra.realizada', {
    entidade: 'purchase',
    id: idCompra,
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { idItem, item: item.name, precoTotal: preco },
  });

  return {
    idCompra,
    item,
    precoPago: preco,
    repetida: false,
    avisos: pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
  };
}

export async function listarDoUsuario(idUsuario) {
  return purchasesRepository.listarPorUsuario(idUsuario);
}
