
INSERT INTO reward_configs (game_type_id, age_band_id, stars, xp_amount, points_amount, coins_amount)
SELECT calculado.game_type_id, calculado.age_band_id, calculado.stars,
       calculado.xp, calculado.polen, calculado.mel
  FROM (
    SELECT jogo.id AS game_type_id,
           faixa.id AS age_band_id,
           base.estrelas AS stars,
           ROUND(base.xp    * fator.valor) AS xp,
           ROUND(base.polen * fator.valor) AS polen,
           ROUND(base.mel   * fator.valor) AS mel
      FROM game_types jogo
      CROSS JOIN age_bands faixa
      CROSS JOIN (
        SELECT 1 AS estrelas, 10 AS xp,  5 AS polen,  5 AS mel
        UNION ALL SELECT 2, 20, 10, 12
        UNION ALL SELECT 3, 35, 20, 25
      ) AS base
      CROSS JOIN LATERAL (
        SELECT CASE faixa.code WHEN 'A' THEN 1.0 WHEN 'B' THEN 1.2 ELSE 1.5 END AS valor
      ) AS fator
  ) AS calculado
ON DUPLICATE KEY UPDATE
  xp_amount     = calculado.xp,
  points_amount = calculado.polen,
  coins_amount  = calculado.mel;
