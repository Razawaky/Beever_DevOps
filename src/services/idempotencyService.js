import { createHash } from 'node:crypto';

import { emTransacao } from '../config/database.js';
import * as idempotencyKeysRepository from '../repositories/idempotencyKeysRepository.js';
import { ErroAplicacao, erroAcessoNegado } from '../utils/erros.js';


class OperacaoJaExecutada extends Error {}

function hashDoPedido(pedido) {
  if (pedido === null || pedido === undefined) return null;
  return createHash('sha256').update(JSON.stringify(pedido)).digest('hex');
}

function exigirMesmoPedido(registro, idUsuario, hash) {
  if (Number(registro.user_id) !== Number(idUsuario)) {
    throw erroAcessoNegado('Esta chave de idempotência é de outro jogador');
  }

  if (registro.response_hash !== null && hash !== null && registro.response_hash !== hash) {
    throw new ErroAplicacao('Esta chave já foi usada para outro pedido', {
      status: 409,
      codigo: 'CHAVE_REUTILIZADA',
    });
  }
}

export async function executarUmaVezSo({ chave, idUsuario, operacao, pedido = null }, { executar, aoRepetir }) {
  const hash = hashDoPedido(pedido);

  try {
    return await emTransacao(async (conexao) => {
      const primeira = await idempotencyKeysRepository.reservar(conexao, {
        chave,
        idUsuario,
        operacao,
        hashDoPedido: hash,
      });

      if (!primeira) throw new OperacaoJaExecutada();
      return executar(conexao);
    });
  } catch (erro) {
    if (!(erro instanceof OperacaoJaExecutada)) throw erro;
  }

  const registro = await idempotencyKeysRepository.buscar(chave);
  exigirMesmoPedido(registro, idUsuario, hash);
  return aoRepetir();
}
