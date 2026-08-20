

CREATE TABLE IF NOT EXISTS levels (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  level        SMALLINT UNSIGNED NOT NULL,
  required_xp  INT UNSIGNED NOT NULL,
  reward_coins BIGINT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_levels_level (level),
  CONSTRAINT ck_levels_values CHECK (level >= 1 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_levels (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  level         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  xp_total      INT UNSIGNED NOT NULL DEFAULT 0,
  xp_next_level INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_levels_user (user_id),
  CONSTRAINT fk_user_levels_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_user_levels_level CHECK (level >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS wallets (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  coins        BIGINT NOT NULL DEFAULT 0,
  points_total INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_wallets_coins CHECK (coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS reward_reasons (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(60) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_reasons_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reward_configs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_type_id   BIGINT UNSIGNED NOT NULL,
  age_band_id    BIGINT UNSIGNED NOT NULL,
  stars          TINYINT UNSIGNED NOT NULL,
  xp_amount      INT UNSIGNED NOT NULL DEFAULT 0,
  points_amount  INT UNSIGNED NOT NULL DEFAULT 0,
  coins_amount   BIGINT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_configs_combo (game_type_id, age_band_id, stars),
  CONSTRAINT fk_reward_configs_game_type FOREIGN KEY (game_type_id) REFERENCES game_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reward_configs_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT,
  CONSTRAINT ck_reward_configs_stars CHECK (stars BETWEEN 1 AND 3),
  CONSTRAINT ck_reward_configs_coins CHECK (coins_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS game_session_statuses (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_session_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS game_sessions (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  cell_id          BIGINT UNSIGNED NOT NULL,
  status_id        BIGINT UNSIGNED NOT NULL,
  token            CHAR(36) NOT NULL,
  started_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at      DATETIME DEFAULT NULL,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  errors           INT UNSIGNED NOT NULL DEFAULT 0,
  stars            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  xp_awarded       INT UNSIGNED NOT NULL DEFAULT 0,
  points_awarded   INT UNSIGNED NOT NULL DEFAULT 0,
  coins_awarded    BIGINT NOT NULL DEFAULT 0,
  is_replay        TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_sessions_token (token),
  KEY idx_game_sessions_user_started (user_id, started_at),
  CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE RESTRICT,
  CONSTRAINT fk_game_sessions_status FOREIGN KEY (status_id) REFERENCES game_session_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT ck_game_sessions_stars CHECK (stars BETWEEN 0 AND 3),
  CONSTRAINT ck_game_sessions_coins CHECK (coins_awarded >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idempotency_key VARCHAR(190) NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  operation       VARCHAR(80) NOT NULL,
  response_hash   CHAR(64) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_keys_key (idempotency_key),
  KEY idx_idempotency_keys_user (user_id, created_at),
  CONSTRAINT fk_idempotency_keys_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS xp_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         INT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_xp_ledger_user_created (user_id, created_at),
  KEY idx_xp_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_xp_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_xp_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_xp_ledger_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS point_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         INT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_point_ledger_user_created (user_id, created_at),
  KEY idx_point_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_point_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_point_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_point_ledger_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS coin_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         BIGINT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_coin_ledger_user_created (user_id, created_at),
  KEY idx_coin_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_coin_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_coin_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_coin_ledger_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
