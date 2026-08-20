import { emTransacao } from '../config/database.js';
import * as tasksRepository from '../repositories/tasksRepository.js';
import {
  dataDoDia,
  diaDaSemana,
  diaDoAno,
  fimDaSemana,
  fimDoDia,
  inicioDaSemana,
  inicioDoDia,
} from '../utils/diaDoJogador.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as pointsService from './pointsService.js';
import * as profilesService from './profilesService.js';
import * as schedulesService from './schedulesService.js';
import * as taskProgressSources from './taskProgressSources.js';


export async function listarDoUsuario(idUsuario) {
  return tasksRepository.listarPorUsuario(idUsuario);
}

export async function listarAtivas(idUsuario) {
  return tasksRepository.listarAtivasPorUsuario(idUsuario);
}

export async function listarTiposDisponiveis() {
  return tasksRepository.listarTipos();
}

async function exigirPosse(idTarefa, idUsuario) {
  const tarefa = await tasksRepository.buscarPorId(idTarefa);
  if (!tarefa) throw erroNaoEncontrado('Tarefa não encontrada');
  if (Number(tarefa.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return tarefa;
}

const TAREFAS_DIARIAS = 2;
const TAREFAS_SEMANAIS = 1;

const MAXIMO_DE_ATIVAS = 3;

function paraMySQL(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ');
}

function escolherTipos(tipos, quantidade, hoje) {
  if (tipos.length === 0) return [];
  const dia = diaDoAno(hoje);
  return Array.from({ length: Math.min(quantidade, tipos.length) }, (_, indice) => {
    return tipos[(dia + indice) % tipos.length];
  });
}

export async function garantirTarefasDoDia(idUsuario, agora = new Date()) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);

  await emTransacao((conexao) => tasksRepository.expirarVencidasDoUsuario(idUsuario, conexao));

  const disponiveis = await schedulesService.diasDisponiveis(idUsuario);
  const hojeVale = disponiveis.length === 0 || disponiveis.includes(diaDaSemana(hoje));
  if (!hojeVale) return { criadas: 0, motivo: 'dia fora da agenda do jogador' };

  const vagas = MAXIMO_DE_ATIVAS - (await tasksRepository.contarAtivas(idUsuario));
  if (vagas <= 0) return { criadas: 0, motivo: 'o jogador já tem o máximo de tarefas ativas' };

  const mensuraveis = taskProgressSources.fontesMensuraveis();
  const tipos = (await tasksRepository.listarTipos()).filter((tipo) =>
    mensuraveis.includes(tipo.progress_source),
  );
  const diarios = tipos.filter((tipo) => tipo.scope === 'diaria');
  const semanais = tipos.filter((tipo) => tipo.scope === 'semanal');

  const [jaDiarias, jaSemanais] = await Promise.all([
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'diaria', paraMySQL(inicioDoDia(hoje, fuso))),
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'semanal', paraMySQL(inicioDaSemana(hoje, fuso))),
  ]);

  const aCriar = [
    ...escolherTipos(diarios, TAREFAS_DIARIAS - jaDiarias.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDoDia(hoje, fuso)),
    })),
    ...escolherTipos(semanais, TAREFAS_SEMANAIS - jaSemanais.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDaSemana(hoje, fuso)),
    })),
  ].slice(0, vagas);

  for (const { tipo, prazo } of aCriar) {
    const idTarefa = await emTransacao((conexao) =>
      tasksRepository.criar(conexao, { idUsuario, idTipo: tipo.id, prazo }),
    );

    await auditService.registrar(auditService.sistema(), 'tarefa.gerada', {
      entidade: 'task',
      id: idTarefa,
      depois: { tipo: tipo.slug, escopo: tipo.scope, prazo, alvo: Number(tipo.default_target) },
    });
  }

  return { criadas: aCriar.length };
}

function janelaDaTarefa(tarefa, fuso) {
  const inicio = new Date(tarefa.created_at);
  const fim = new Date(tarefa.due_at);
  const ultimoInstante = new Date(fim.getTime() - 1000);

  return {
    inicio: paraMySQL(inicio),
    fim: paraMySQL(fim),
    dataInicial: dataDoDia(inicio, fuso),
    dataFinal: dataDoDia(ultimoInstante, fuso),
  };
}

export async function sincronizarProgresso(idUsuario) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const ativas = await tasksRepository.listarAtivasPorUsuario(idUsuario);
  let atualizadas = 0;

  for (const tarefa of ativas) {
    const medido = await taskProgressSources.medir(tarefa.progress_source, idUsuario, janelaDaTarefa(tarefa, fuso));
    if (medido === null) continue;

    await emTransacao((conexao) => tasksRepository.definirProgresso(conexao, tarefa.id, medido));
    atualizadas += 1;
  }

  return { atualizadas };
}

export async function concluir(idTarefa, idUsuario) {
  const tarefa = await exigirPosse(idTarefa, idUsuario);

  if (Number(tarefa.current_value) < Number(tarefa.target_value)) {
    throw erroValidacao(
      `Esta tarefa ainda não foi cumprida: ${tarefa.current_value} de ${tarefa.target_value}`,
    );
  }

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  const recompensa = await emTransacao(async (conexao) => {
    const afetadas = await tasksRepository.concluir(conexao, idTarefa);
    if (afetadas === 0) throw erroValidacao('Esta tarefa já foi concluída');

    const polen = Number(tarefa.reward_points);
    const mel = Number(tarefa.reward_coins);

    if (polen > 0) {
      await pointsService.creditar(conexao, idUsuario, polen, {
        motivo: 'conclusao-tarefa',
        referenciaTipo: 'task',
        referenciaId: idTarefa,
      });
    }
    if (mel > 0) {
      await coinsService.creditar(conexao, idUsuario, mel, {
        motivo: 'conclusao-tarefa',
        referenciaTipo: 'task',
        referenciaId: idTarefa,
      });
    }

    return { polen, mel };
  });

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'tarefa.concluida', {
    entidade: 'task',
    id: idTarefa,
    antes: { ...saldoAntes, status: tarefa.status, progresso: Number(tarefa.current_value) },
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { status: 'concluida', polenGanho: recompensa.polen, melGanho: recompensa.mel },
  });

  return recompensa;
}
