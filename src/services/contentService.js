import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as hivesRepository from '../repositories/hivesRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';
import * as inventoryService from './inventoryService.js';
import * as validadoresDeJogo from './validadoresDeJogo.js';


export const ESTADOS = {
  disponivel: 'disponivel',
  concluido: 'concluido',
  travadoPorCelulaAnterior: 'travado-por-celula-anterior',
  travadoPorPercentual: 'travado-por-percentual',
  travadoPorItem: 'travado-por-item',
  travadoPorPatrimonio: 'travado-por-patrimonio',
};

export function faixasVisiveis(faixas, codigoDoJogador) {
  const dele = faixas.find((faixa) => faixa.code === codigoDoJogador);
  if (!dele) return [];

  return faixas
    .filter((faixa) => Number(faixa.min_age) <= Number(dele.min_age))
    .map((faixa) => faixa.code);
}

export function estadoDoFavo({ favo, progressoDoAnterior, temItemExigido, patrimonio }) {
  const exigePercentual = Boolean(favo.anterior_id);
  const percentualDoAnterior = Number(progressoDoAnterior?.percent ?? 0);

  if (exigePercentual && percentualDoAnterior < Number(favo.unlock_percent)) {
    return {
      estado: ESTADOS.travadoPorPercentual,
      motivo: `Conclua ${favo.unlock_percent}% do favo anterior para abrir este`,
    };
  }

  if (favo.required_item_id && !temItemExigido) {
    return {
      estado: ESTADOS.travadoPorItem,
      motivo: `Você precisa de ${favo.required_item_name ?? 'um item especial'} para abrir este favo`,
    };
  }

  if (Number(favo.required_patrimony) > 0 && Number(patrimonio) < Number(favo.required_patrimony)) {
    return {
      estado: ESTADOS.travadoPorPatrimonio,
      motivo: `Você precisa de ${favo.required_patrimony} de patrimônio para abrir este favo`,
    };
  }

  return { estado: ESTADOS.disponivel, motivo: null };
}

export function estadosDasCelulas(celulas) {
  let anteriorConcluida = true;

  return celulas.map((celula) => {
    const concluida = Boolean(celula.first_completed_at) && Number(celula.stars) >= 1;

    const estado = concluida
      ? ESTADOS.concluido
      : anteriorConcluida
        ? ESTADOS.disponivel
        : ESTADOS.travadoPorCelulaAnterior;

    const motivo = estado === ESTADOS.travadoPorCelulaAnterior ? 'Conclua a célula anterior para abrir esta' : null;

    anteriorConcluida = concluida;
    return { ...celula, concluida, estado, motivo };
  });
}

export async function faixasDoJogador(idUsuario) {
  const [perfil, faixas] = await Promise.all([
    profilesRepository.buscarDetalhadoPorUsuario(idUsuario),
    profilesRepository.listarFaixasEtarias(),
  ]);

  return faixasVisiveis(faixas, perfil?.faixa_etaria);
}

async function contextoDoJogador(idUsuario) {
  const [perfil, faixas, progressos, patrimonio, itensPossuidos] = await Promise.all([
    profilesRepository.buscarDetalhadoPorUsuario(idUsuario),
    profilesRepository.listarFaixasEtarias(),
    progressRepository.listarProgressoDosFavos(idUsuario),
    inventoryService.valorEmPatrimonio(idUsuario),
    inventoryService.idsPossuidos(idUsuario),
  ]);

  return {
    codigosVisiveis: faixasVisiveis(faixas, perfil?.faixa_etaria),
    progressoPorFavo: new Map(progressos.map((linha) => [Number(linha.hive_id), linha])),
    patrimonio,
    itensPossuidos,
  };
}

export async function listarTrilha(idUsuario) {
  const contexto = await contextoDoJogador(idUsuario);
  const favos = await hivesRepository.listarPorFaixas(contexto.codigosVisiveis);

  const totais = await cellsRepository.contarPorFavos(
    favos.map((favo) => favo.id),
    contexto.codigosVisiveis,
  );

  const trilha = [];
  let anteriorDaFaixa = null;

  for (const favo of favos) {
    const anterior = anteriorDaFaixa?.age_band_id === favo.age_band_id ? anteriorDaFaixa : null;
    const progresso = contexto.progressoPorFavo.get(Number(favo.id)) ?? null;

    const { estado, motivo } = estadoDoFavo({
      favo: { ...favo, anterior_id: anterior?.id ?? null },
      progressoDoAnterior: anterior ? contexto.progressoPorFavo.get(Number(anterior.id)) : null,
      temItemExigido: contexto.itensPossuidos.has(Number(favo.required_item_id)),
      patrimonio: contexto.patrimonio,
    });

    trilha.push({
      ...favo,
      percentual: Number(progresso?.percent ?? 0),
      celulasConcluidas: Number(progresso?.completed_cells ?? 0),
      celulasTotais: totais.get(Number(favo.id)) ?? Number(progresso?.total_cells ?? 0),
      concluido: Boolean(progresso?.completed_at),
      estado,
      motivo,
    });

    anteriorDaFaixa = favo;
  }

  return trilha;
}

async function exigirFavoVisivel(idUsuario, idFavo) {
  const trilha = await listarTrilha(idUsuario);
  const favo = trilha.find((linha) => Number(linha.id) === Number(idFavo));

  if (!favo) throw erroNaoEncontrado('Favo não encontrado');
  return favo;
}

function podeJogar(slugDoTipoDeJogo, corpo) {
  if (!corpo) return false;

  try {
    validadoresDeJogo.conferirForma(slugDoTipoDeJogo, corpo);
    return true;
  } catch {
    return false;
  }
}

export async function listarCelulasDoFavo(idUsuario, idFavo) {
  const favo = await exigirFavoVisivel(idUsuario, idFavo);
  if (favo.estado !== ESTADOS.disponivel) throw erroAcessoNegado(favo.motivo);

  const codigosDeFaixa = await faixasDoJogador(idUsuario);
  const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, codigosDeFaixa);
  const conteudos = await contentsRepository.listarConteudoAtualDasCelulas(celulas.map((c) => c.id));
  const corpoPorCelula = new Map(conteudos.map((linha) => [Number(linha.cell_id), linha.body]));

  return {
    favo,
    celulas: estadosDasCelulas(celulas).map((celula) => ({
      ...celula,
      temConteudo: corpoPorCelula.has(Number(celula.id)),
      temJogo: podeJogar(celula.game_type_slug, corpoPorCelula.get(Number(celula.id))),
    })),
  };
}

export async function proximaCelulaJogavel(idUsuario, idCelula) {
  const celula = await cellsRepository.buscarPorId(idCelula);
  if (!celula) return null;

  const { celulas } = await listarCelulasDoFavo(idUsuario, celula.hive_id);
  const posicao = celulas.findIndex((linha) => Number(linha.id) === Number(idCelula));
  const proxima = celulas[posicao + 1];

  if (!proxima || !proxima.temJogo || proxima.estado === ESTADOS.travadoPorCelulaAnterior) return null;
  return { id: Number(proxima.id), titulo: proxima.title, idFavo: Number(celula.hive_id) };
}

export async function abrirCelula(idUsuario, idCelula) {
  const celula = await cellsRepository.buscarPorId(idCelula);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  const { celulas } = await listarCelulasDoFavo(idUsuario, celula.hive_id);
  const escolhida = celulas.find((linha) => Number(linha.id) === Number(idCelula));

  if (!escolhida) throw erroNaoEncontrado('Célula não encontrada');
  if (escolhida.estado === ESTADOS.travadoPorCelulaAnterior) throw erroAcessoNegado(escolhida.motivo);

  const conteudo = await contentsRepository.buscarAtualDaCelula(idCelula);
  if (!conteudo) throw erroNaoEncontrado('Esta célula ainda não tem conteúdo');

  return { celula: escolhida, conteudo };
}
