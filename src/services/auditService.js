import { hashDoIpDaRequisicao, idDaRequisicao } from '../config/contextoRequisicao.js';
import { logger } from '../config/logger.js';
import * as auditLogsRepository from '../repositories/auditLogsRepository.js';
import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';


export function usuario(id) {
  return { tipo: 'usuario', id };
}

export function admin(id) {
  return { tipo: 'admin', id };
}

export function sistema() {
  return { tipo: 'sistema', id: null };
}

export function atorDaSessao(sessao) {
  return sessao?.ehAdmin ? admin(sessao.usuarioId) : usuario(sessao.usuarioId);
}

export async function registrar(ator, acao, alvo) {
  const { entidade, id = null, antes = null, depois = null } = alvo;

  try {
    await auditLogsRepository.registrar({
      atorTipo: ator.tipo,
      atorId: ator.id,
      acao,
      entidade,
      entidadeId: id,
      estadoAnterior: antes,
      estadoNovo: depois,
      ipHash: hashDoIpDaRequisicao() ?? null,
      requestId: idDaRequisicao() ?? null,
    });
  } catch (erro) {
    logger.error(
      { erro, acao, entidade, entidadeId: id, atorTipo: ator.tipo, atorId: ator.id },
      'Falha ao registrar auditoria — a operação seguiu, mas o rastro se perdeu',
    );
  }
}

export async function retratoDoSaldo(idUsuario) {
  const [carteira, nivel] = await Promise.all([
    walletsRepository.buscarPorUsuario(idUsuario),
    userLevelsRepository.buscarPorUsuario(idUsuario),
  ]);

  return {
    mel: Number(carteira?.coins ?? 0),
    polen: Number(carteira?.points_total ?? 0),
    xp: Number(nivel?.xp_total ?? 0),
    nivel: Number(nivel?.level ?? 0),
  };
}

export async function registrarRecompensa(ator, acao, { entidade, id = null, antes, depois, detalhes = null }) {
  await registrar(ator, acao, {
    entidade,
    id,
    antes,
    depois: detalhes ? { ...depois, ...detalhes } : depois,
  });
}
