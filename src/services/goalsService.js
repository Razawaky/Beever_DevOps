import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as goalPlannerService from './goalPlannerService.js';
import * as goalProgressSources from './goalProgressSources.js';
import * as pointsService from './pointsService.js';


export async function listarDoUsuario(idUsuario) {
  return goalsRepository.listarPorUsuario(idUsuario);
}

export async function listarAtivas(idUsuario) {
  return goalsRepository.listarAtivasPorUsuario(idUsuario);
}

export async function exigirPosse(idMeta, idUsuario) {
  const meta = await goalsRepository.buscarPorId(idMeta);
  if (!meta) throw erroNaoEncontrado('Meta não encontrada');
  if (Number(meta.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return meta;
}

export async function expirarVencidas(idUsuario) {
  const vencidas = await goalsRepository.listarVencidasPorUsuario(idUsuario);
  if (vencidas.length === 0) return { expiradas: 0 };

  await emTransacao((conexao) => goalsRepository.expirarVencidasDoUsuario(conexao, idUsuario));

  for (const meta of vencidas) {
    await auditService.registrar(auditService.usuario(idUsuario), 'meta.expirada', {
      entidade: 'goal',
      id: meta.id,
      antes: { status: 'ativa', progresso: Number(meta.current_value), alvo: Number(meta.target_value) },
      depois: { status: 'expirada', recompensaPaga: 0 },
    });
  }

  return { expiradas: vencidas.length };
}

export async function sincronizarProgresso(idUsuario) {
  await expirarVencidas(idUsuario);

  const metas = await goalsRepository.listarAtivasPorUsuario(idUsuario);
  let sincronizadas = 0;

  for (const meta of metas) {
    const valor = await goalProgressSources.medir(meta.progress_source, idUsuario);
    if (valor === null) continue;
    if (valor === Number(meta.current_value)) continue;

    await emTransacao((conexao) => goalsRepository.atualizarProgresso(conexao, meta.id, Number(valor)));
    sincronizadas += 1;
  }

  return { sincronizadas };
}

export async function listarRenovaveis(idUsuario) {
  await expirarVencidas(idUsuario);
  return goalsRepository.listarExpiradasRenovaveis(idUsuario);
}

export async function renovar(idMeta, idUsuario) {
  const meta = await exigirPosse(idMeta, idUsuario);
  if (meta.status !== 'expirada') {
    throw erroValidacao('Só meta vencida pode ser renovada');
  }

  const plano = await goalPlannerService.planoAtual(idUsuario);
  if (!plano) throw erroValidacao('Sem dias marcados na semana não há prazo para a meta renovada');

  const desconto = await rewardConfigsRepository.buscarModificador(rewardConfigsRepository.META_RENOVADA);
  if (!desconto) throw erroValidacao('Falta a configuração de recompensa da meta renovada');

  const prazo = new Date(Date.now() + plano.diasDePrazo * 24 * 60 * 60 * 1000);
  const recompensaMoedas = Math.round(Number(meta.reward_coins) * desconto.coins_factor);
  const recompensaPontos = Math.round(Number(meta.reward_points) * desconto.points_factor);

  const idNovaMeta = await emTransacao(async (conexao) => {
    const afetadas = await goalsRepository.marcarRenovada(conexao, idMeta);
    if (afetadas === 0) throw erroValidacao('Esta meta já foi renovada');

    const id = await goalsRepository.criar(conexao, {
      idUsuario,
      idTipo: meta.goal_type_id,
      idDificuldade: meta.difficulty_id,
      titulo: meta.title,
      alvo: Number(meta.target_value),
      recompensaMoedas,
      recompensaPontos,
      prazo,
      renovadaDe: idMeta,
    });

    await goalsRepository.atualizarProgresso(conexao, id, Number(meta.current_value));
    return id;
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.renovada', {
    entidade: 'goal',
    id: idMeta,
    antes: {
      status: 'expirada',
      progresso: Number(meta.current_value),
      recompensaMoedas: Number(meta.reward_coins),
      recompensaPontos: Number(meta.reward_points),
    },
    depois: {
      status: 'renovada',
      novaMeta: idNovaMeta,
      prazo,
      recompensaMoedas,
      recompensaPontos,
    },
  });

  return goalsRepository.buscarPorId(idNovaMeta);
}

export async function atualizarProgresso(idMeta, idUsuario, valorAtual) {
  await exigirPosse(idMeta, idUsuario);
  await emTransacao((conexao) => goalsRepository.atualizarProgresso(conexao, idMeta, Number(valorAtual)));
  return goalsRepository.buscarPorId(idMeta);
}

export async function concluir(idMeta, idUsuario) {
  await sincronizarProgresso(idUsuario);
  const meta = await exigirPosse(idMeta, idUsuario);

  if (meta.status !== 'ativa') {
    throw erroValidacao(`Esta meta está ${meta.status} e não paga mais recompensa`);
  }

  if (Number(meta.current_value) < Number(meta.target_value)) {
    throw erroValidacao(
      `Esta meta ainda não foi alcançada: ${meta.current_value} de ${meta.target_value}`,
    );
  }

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  const recompensa = await emTransacao(async (conexao) => {
    const afetadas = await goalsRepository.concluir(conexao, idMeta);
    if (afetadas === 0) throw erroValidacao('Esta meta já foi concluída');

    const mel = Number(meta.reward_coins);
    const polen = Number(meta.reward_points);

    if (mel > 0) {
      await coinsService.creditar(conexao, idUsuario, mel, {
        motivo: 'conclusao-meta',
        referenciaTipo: 'goal',
        referenciaId: idMeta,
      });
    }
    if (polen > 0) {
      await pointsService.creditar(conexao, idUsuario, polen, {
        motivo: 'conclusao-meta',
        referenciaTipo: 'goal',
        referenciaId: idMeta,
      });
    }

    return { mel, polen };
  });

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'meta.concluida', {
    entidade: 'goal',
    id: idMeta,
    antes: { ...saldoAntes, status: meta.status, progresso: Number(meta.current_value) },
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { status: 'concluida', melGanho: recompensa.mel, polenGanho: recompensa.polen },
  });

  await goalPlannerService.garantirMetasAtivas(idUsuario);

  return recompensa;
}
