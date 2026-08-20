import { logger } from '../config/logger.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { ErroAplicacao, erroValidacao } from '../utils/erros.js';


function exigirQuantidadeValida(quantidade, acao) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao(`Quantidade de mel a ${acao} precisa ser um inteiro positivo`);
  }
}

export async function debitar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  exigirQuantidadeValida(quantidade, 'debitar');

  const afetadas = await walletsRepository.debitarMel(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });

  if (afetadas === 0) {
    throw new ErroAplicacao('Mel insuficiente', { status: 422, codigo: 'MEL_INSUFICIENTE' });
  }
}

export async function creditar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  exigirQuantidadeValida(quantidade, 'creditar');

  return walletsRepository.creditarMel(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });
}

export async function obterCarteira(idUsuario) {
  const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
  if (!carteira) return { mel: 0, polen: 0 };
  return { mel: Number(carteira.coins), polen: Number(carteira.points_total) };
}

export async function calcularMelDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error(
      { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
      'Sem configuração de recompensa: creditando zero de mel',
    );
    return 0;
  }

  const melCheio = Number(configuracao.coins_amount);
  if (!ehRepeticao) return melCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou mel');
    return 0;
  }

  return Math.round(melCheio * modificador.coins_factor);
}

export async function creditarPorCelula(conexao, idUsuario, { celula, estrelas, ehRepeticao = false }) {
  const quantidade = await calcularMelDaCelula(
    {
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
      ehRepeticao,
    },
    conexao,
  );

  if (quantidade === 0) return { melCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'conclusao-celula',
    referenciaTipo: 'cell',
    referenciaId: celula.id,
  });

  return { melCreditado: quantidade };
}

export async function creditarBonusDeNivel(conexao, idUsuario, quantidade, { nivel }) {
  if (quantidade === 0) return { melCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'subida-de-nivel',
    referenciaTipo: 'level',
    referenciaId: nivel,
  });

  return { melCreditado: quantidade };
}
