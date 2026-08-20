import { logger } from '../config/logger.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import { erroValidacao } from '../utils/erros.js';


const NIVEL_DE_PARTIDA = {
  beginner: 1,
  intermediate: 5,
  advanced: 10,
};

export function niveisDePartidaDisponiveis() {
  return Object.keys(NIVEL_DE_PARTIDA);
}

export async function obterCurva() {
  const curva = await userLevelsRepository.buscarCurva();
  if (curva.length === 0) {
    throw new Error('A tabela `levels` está vazia: rode `npm run db:seed` antes de calcular nível.');
  }
  return curva;
}

export function nivelParaXp(curva, xpTotal) {
  let nivel = curva[0].level;
  for (const degrau of curva) {
    if (xpTotal >= Number(degrau.required_xp)) nivel = degrau.level;
    else break;
  }
  return Number(nivel);
}

export function xpDoProximoNivel(curva, nivel) {
  const proximo = curva.find((degrau) => Number(degrau.level) === Number(nivel) + 1);
  return proximo ? Number(proximo.required_xp) : null;
}

export function xpDoNivel(curva, nivel) {
  const degrau = curva.find((linha) => Number(linha.level) === Number(nivel));
  if (!degrau) throw erroValidacao(`Nível fora da curva: ${nivel}`);
  return Number(degrau.required_xp);
}

export async function obterDoUsuario(idUsuario) {
  const [linha, curva] = await Promise.all([userLevelsRepository.buscarPorUsuario(idUsuario), obterCurva()]);
  if (!linha) return null;

  const xpTotal = Number(linha.xp_total);
  const nivel = Number(linha.level);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel);
  const xpDesteNivel = xpDoNivel(curva, nivel);

  return {
    nivel,
    xpTotal,
    xpProximoNivel,
    xpNoNivel: xpTotal - xpDesteNivel,
    xpParaSubir: xpProximoNivel === null ? 0 : xpProximoNivel - xpTotal,
    progressoPercentual:
      xpProximoNivel === null ? 100 : Math.round(((xpTotal - xpDesteNivel) / (xpProximoNivel - xpDesteNivel)) * 100),
    noTopo: xpProximoNivel === null,
  };
}

export async function definirPontoDePartida(conexao, idUsuario, nivelEscolhido) {
  const nivel = NIVEL_DE_PARTIDA[nivelEscolhido];
  if (!nivel) throw erroValidacao(`Nível inicial desconhecido: ${nivelEscolhido}`);

  const curva = await obterCurva();
  const xpTotal = xpDoNivel(curva, nivel);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel) ?? xpTotal;

  const linha = await userLevelsRepository.buscarPorUsuario(idUsuario);
  const xpAnterior = Number(linha?.xp_total ?? 0);
  const diferenca = xpTotal - xpAnterior;

  if (diferenca > 0) {
    await userLevelsRepository.lancarXp(conexao, {
      idUsuario,
      quantidade: diferenca,
      motivo: 'ajuste-administrativo',
      referenciaTipo: 'onboarding',
      referenciaId: idUsuario,
      saldoDepois: xpTotal,
    });
  }

  await userLevelsRepository.atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel });

  return { nivel, xpTotal, xpProximoNivel };
}

export async function creditarXp(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('XP creditado precisa ser um inteiro positivo');
  }

  const [linha, curva] = await Promise.all([
    userLevelsRepository.buscarPorUsuario(idUsuario, conexao),
    obterCurva(),
  ]);
  if (!linha) throw erroValidacao('Este jogador não tem linha de nível — a conta foi criada pela metade?');

  const nivelAnterior = Number(linha.level);
  const xpTotal = Number(linha.xp_total) + quantidade;
  const nivel = nivelParaXp(curva, xpTotal);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel) ?? xpTotal;

  await userLevelsRepository.lancarXp(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: xpTotal,
  });
  await userLevelsRepository.atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel });

  return {
    nivel,
    xpTotal,
    xpProximoNivel,
    subiuDeNivel: nivel > nivelAnterior,
    bonusDeMelPorNivel: bonusDeMelEntreNiveis(curva, nivelAnterior, nivel),
  };
}

export function bonusDeMelEntreNiveis(curva, nivelAnterior, nivelNovo) {
  return curva
    .filter((degrau) => Number(degrau.level) > nivelAnterior && Number(degrau.level) <= nivelNovo)
    .reduce((total, degrau) => total + Number(degrau.reward_coins ?? 0), 0);
}

export async function calcularXpDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error({ slugDoTipoDeJogo, codigoDaFaixa, estrelas }, 'Sem configuração de recompensa: creditando zero de XP');
    return 0;
  }

  const xpCheio = Number(configuracao.xp_amount);
  if (!ehRepeticao) return xpCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou XP');
    return 0;
  }

  return Math.round(xpCheio * modificador.xp_factor);
}

export async function creditarPorCelula(conexao, idUsuario, { celula, estrelas, ehRepeticao = false }) {
  const quantidade = await calcularXpDaCelula(
    {
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
      ehRepeticao,
    },
    conexao,
  );

  if (quantidade === 0) {
    return { xpCreditado: 0, subiuDeNivel: false, bonusDeMelPorNivel: 0 };
  }

  const resultado = await creditarXp(conexao, idUsuario, quantidade, {
    motivo: 'conclusao-celula',
    referenciaTipo: 'cell',
    referenciaId: celula.id,
  });

  return { xpCreditado: quantidade, ...resultado };
}
