
INSERT INTO reward_modifiers (slug, name, xp_factor, points_factor, coins_factor)
VALUES ('repeticao-de-celula', 'Repetição de célula já concluída', 0.250, 0.000, 0.000),
       ('meta-renovada',       'Meta renovada depois de vencer',   0.500, 0.500, 0.500)
ON DUPLICATE KEY UPDATE
  name          = VALUES(name),
  xp_factor     = VALUES(xp_factor),
  points_factor = VALUES(points_factor),
  coins_factor  = VALUES(coins_factor);
