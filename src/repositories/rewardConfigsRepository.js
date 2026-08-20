import { consultarEm } from '../config/database.js';


export const REPETICAO_DE_CELULA = 'repeticao-de-celula';

export const META_RENOVADA = 'meta-renovada';

export async function buscarConfiguracao(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
  conexao = null,
) {
  const linhas = await consultarEm(
    conexao,
    `SELECT rc.id, rc.stars, rc.xp_amount, rc.points_amount, rc.coins_amount,
            jogo.slug AS game_type_slug, faixa.code AS age_band_code
       FROM reward_configs rc
       JOIN game_types jogo ON jogo.id = rc.game_type_id
       JOIN age_bands faixa ON faixa.id = rc.age_band_id
      WHERE jogo.slug = ? AND faixa.code = ? AND rc.stars = ?`,
    [slugDoTipoDeJogo, codigoDaFaixa, estrelas],
  );
  return linhas[0] ?? null;
}

export async function buscarModificador(slug, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT slug, name, xp_factor, points_factor, coins_factor
       FROM reward_modifiers
      WHERE slug = ?`,
    [slug],
  );

  const linha = linhas[0];
  if (!linha) return null;

  return {
    slug: linha.slug,
    name: linha.name,
    xp_factor: Number(linha.xp_factor),
    points_factor: Number(linha.points_factor),
    coins_factor: Number(linha.coins_factor),
  };
}
