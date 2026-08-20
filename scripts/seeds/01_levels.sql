
INSERT INTO levels (level, required_xp, reward_coins) VALUES
  (1,     0,   0),
  (2,   280,  50),
  (3,   520,  75),
  (4,   800, 100),
  (5,  1120, 125),
  (6,  1470, 150),
  (7,  1850, 175),
  (8,  2260, 200),
  (9,  2700, 225),
  (10, 3160, 250),
  (11, 3650, 275),
  (12, 4160, 300),
  (13, 4690, 325),
  (14, 5240, 350),
  (15, 5810, 375),
  (16, 6400, 400),
  (17, 7010, 425),
  (18, 7640, 450),
  (19, 8280, 475),
  (20, 8940, 500)
AS novo
ON DUPLICATE KEY UPDATE
  required_xp  = novo.required_xp,
  reward_coins = novo.reward_coins;
