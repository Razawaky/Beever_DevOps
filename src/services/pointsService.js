import { logger } from '../config/logger.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { erroValidacao } from '../utils/erros.js';


export async function creditar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('Quantidade de pólen a creditar precisa ser um inteiro positivo');
  }

  return walletsRepository.creditarPolen(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });
}

export async function calcularPolenDaCelula(
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
      'Sem configuração de recompensa: creditando zero de pólen',
    );
    return 0;
  }

  const polenCheio = Number(configuracao.points_amount);
  if (!ehRepeticao) return polenCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou pólen');
    return 0;
  }

  return Math.round(polenCheio * modificador.points_factor);
}

export async function creditarPorCelula(conexao, idUsuario, { celula, estrelas, ehRepeticao = false }) {
  const quantidade = await calcularPolenDaCelula(
    {
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
      ehRepeticao,
    },
    conexao,
  );

  if (quantidade === 0) return { polenCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'conclusao-celula',
    referenciaTipo: 'cell',
    referenciaId: celula.id,
  });

  return { polenCreditado: quantidade };
}
