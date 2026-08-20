
CREATE TABLE IF NOT EXISTS reward_modifiers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug          VARCHAR(60) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  xp_factor     DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  points_factor DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  coins_factor  DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_modifiers_slug (slug),
  CONSTRAINT ck_reward_modifiers_factors CHECK (xp_factor >= 0 AND points_factor >= 0 AND coins_factor >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
