import { randomUUID } from 'node:crypto';

import { emTransacao } from '../config/database.js';
import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as contentService from './contentService.js';
import * as idempotencyService from './idempotencyService.js';
import * as levelsService from './levelsService.js';
import * as pointsService from './pointsService.js';
import * as progressService from './progressService.js';
import * as streakService from './streakService.js';
import * as validadoresDeJogo from './validadoresDeJogo.js';


export async function abrir(idUsuario, idCelula) {
  const { celula, conteudo } = await contentService.abrirCelula(idUsuario, idCelula);

  const paraJogar = validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, conteudo.body);

  const emAndamento = await gameSessionsRepository.buscarAbertaDaCelula(idUsuario, idCelula);
  if (emAndamento) {
    return {
      token: emAndamento.token,
      celula,
      conteudo: paraJogar,
      ehRepeticao: Boolean(emAndamento.is_replay),
      estado: emAndamento.saved_state ?? null,
      retomada: true,
    };
  }

  const jaConcluiu = await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula);
  const token = randomUUID();

  await emTransacao((conexao) =>
    gameSessionsRepository.iniciar(conexao, {
      idUsuario,
      idCelula,
      token,
      ehRepeticao: jaConcluiu > 0,
    }),
  );

  return { token, celula, conteudo: paraJogar, ehRepeticao: jaConcluiu > 0, estado: null, retomada: false };
}

export async function salvarEstado(idUsuario, token, respostasParciais) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');
  if (partida.finished_at) throw erroValidacao('Esta partida já foi encerrada e não guarda mais progresso');

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  const estado = validadoresDeJogo.estadoParaSalvar(celula.game_type_slug, respostasParciais);

  await gameSessionsRepository.salvarEstado(token, estado);
  return { salvo: true };
}

function resultadoGravado(partida) {
  return {
    jaEstavaFechada: true,
    estrelas: Number(partida.stars),
    erros: Number(partida.errors),
    ehRepeticao: Boolean(partida.is_replay),
    xp: Number(partida.xp_awarded),
    polen: Number(partida.points_awarded),
    mel: Number(partida.coins_awarded),
    duracaoSegundos: partida.duration_seconds === null ? null : Number(partida.duration_seconds),
  };
}

async function creditarPartida(conexao, { idUsuario, token, partida, celula, erros, pontuacao }) {
  const aberta = await gameSessionsRepository.bloquearAbertaPorToken(conexao, token);
  if (!aberta) return resultadoGravado(await gameSessionsRepository.buscarPorToken(token));

  const tentativa = await progressService.registrarTentativa(
    idUsuario,
    partida.cell_id,
    { erros, pontuacao, concluiu: true },
    conexao,
  );

  const dadosDaRecompensa = {
    celula,
    estrelas: tentativa.estrelas,
    ehRepeticao: tentativa.ehRepeticao,
  };

  const xp = await levelsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);
  const polen = await pointsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);
  const mel = await coinsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);

  const bonus = await coinsService.creditarBonusDeNivel(conexao, idUsuario, xp.bonusDeMelPorNivel ?? 0, {
    nivel: xp.nivel,
  });

  await gameSessionsRepository.finalizar(conexao, {
    token,
    estrelas: tentativa.estrelas,
    erros,
    xp: xp.xpCreditado,
    pontos: polen.polenCreditado,
    moedas: mel.melCreditado + bonus.melCreditado,
    ehRepeticao: tentativa.ehRepeticao,
  });

  return {
    jaEstavaFechada: false,
    estrelas: tentativa.estrelas,
    erros,
    ehRepeticao: tentativa.ehRepeticao,
    xp: xp.xpCreditado,
    polen: polen.polenCreditado,
    mel: mel.melCreditado,
    bonusDeMelPorNivel: bonus.melCreditado,
    nivel: xp.nivel ?? null,
    subiuDeNivel: Boolean(xp.subiuDeNivel),
    favo: tentativa.favo,
    favoConcluido: tentativa.favoConcluido,
  };
}

export async function fechar(idUsuario, token, { respostas = [] } = {}) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');
  if (partida.finished_at && partida.status !== 'concluida') {
    throw erroValidacao(`Esta partida foi ${partida.status} e não pode ser concluída`);
  }
  if (partida.finished_at) return comProximaCelula(idUsuario, partida.cell_id, resultadoGravado(partida));

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  const conteudo = await contentsRepository.buscarAtualDaCelula(partida.cell_id);
  if (!conteudo) throw erroNaoEncontrado('Esta célula ainda não tem conteúdo');

  const { erros, total } = validadoresDeJogo.validarRespostas(celula.game_type_slug, conteudo.body, respostas);
  const pontuacao = total === 0 ? 0 : Math.round(((total - erros) / total) * 100);

  const antes = await auditService.retratoDoSaldo(idUsuario);

  const resultado = await idempotencyService.executarUmaVezSo(
    { chave: `partida:${token}`, idUsuario, operacao: 'partida.fechar' },
    {
      executar: (conexao) => creditarPartida(conexao, { idUsuario, token, partida, celula, erros, pontuacao }),
      aoRepetir: async () => resultadoGravado(await gameSessionsRepository.buscarPorToken(token)),
    },
  );

  if (!resultado.jaEstavaFechada) {
    await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'partida.concluida', {
      entidade: 'game_session',
      id: Number(partida.id),
      antes,
      depois: await auditService.retratoDoSaldo(idUsuario),
      detalhes: {
        celula: Number(partida.cell_id),
        estrelas: resultado.estrelas,
        erros: resultado.erros,
        ehRepeticao: resultado.ehRepeticao,
        xpGanho: resultado.xp,
        polenGanho: resultado.polen,
        melGanho: resultado.mel + resultado.bonusDeMelPorNivel,
      },
    });
  }

  if (!resultado.jaEstavaFechada) {
    await streakService.registrarDiaCumprido(idUsuario);
  }

  return comProximaCelula(idUsuario, partida.cell_id, resultado);
}

async function comProximaCelula(idUsuario, idCelula, resultado) {
  return { ...resultado, proximaCelula: await contentService.proximaCelulaJogavel(idUsuario, idCelula) };
}

export async function abandonar(idUsuario, token) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');

  const afetadas = await emTransacao((conexao) => gameSessionsRepository.abandonar(conexao, token));
  return { abandonada: afetadas === 1 };
}
