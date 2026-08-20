

CREATE TABLE IF NOT EXISTS game_types (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(60) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hives (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug               VARCHAR(60) NOT NULL,
  title              VARCHAR(120) NOT NULL,
  description        VARCHAR(500) DEFAULT NULL,
  order_index        SMALLINT UNSIGNED NOT NULL,
  age_band_id        BIGINT UNSIGNED NOT NULL,
  unlock_percent     TINYINT UNSIGNED NOT NULL DEFAULT 80,
  required_patrimony BIGINT NOT NULL DEFAULT 0,
  required_item_id   BIGINT UNSIGNED DEFAULT NULL,
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at         DATETIME DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hives_slug (slug),
  KEY idx_hives_order (age_band_id, order_index),
  CONSTRAINT fk_hives_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT,
  CONSTRAINT ck_hives_unlock_percent CHECK (unlock_percent BETWEEN 1 AND 100),
  CONSTRAINT ck_hives_required_patrimony CHECK (required_patrimony >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cells (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hive_id           BIGINT UNSIGNED NOT NULL,
  game_type_id      BIGINT UNSIGNED NOT NULL,
  age_band_id       BIGINT UNSIGNED NOT NULL,
  order_index       SMALLINT UNSIGNED NOT NULL,
  title             VARCHAR(120) NOT NULL,
  estimated_seconds INT UNSIGNED NOT NULL DEFAULT 300,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at        DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cells_hive_order (hive_id, order_index),
  KEY idx_cells_game_type (game_type_id),
  CONSTRAINT fk_cells_hive FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cells_game_type FOREIGN KEY (game_type_id) REFERENCES game_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cells_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS contents (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cell_id    BIGINT UNSIGNED NOT NULL,
  version    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  body       JSON NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contents_cell_version (cell_id, version),
  CONSTRAINT fk_contents_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS cell_progress (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            BIGINT UNSIGNED NOT NULL,
  cell_id            BIGINT UNSIGNED NOT NULL,
  stars              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  attempts           INT UNSIGNED NOT NULL DEFAULT 0,
  errors             INT UNSIGNED NOT NULL DEFAULT 0,
  best_score         INT UNSIGNED NOT NULL DEFAULT 0,
  first_completed_at DATETIME DEFAULT NULL,
  last_completed_at  DATETIME DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cell_progress_user_cell (user_id, cell_id),
  CONSTRAINT fk_cell_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cell_progress_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE CASCADE,
  CONSTRAINT ck_cell_progress_stars CHECK (stars BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hive_progress (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  hive_id         BIGINT UNSIGNED NOT NULL,
  completed_cells SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_cells     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  percent         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed_at    DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hive_progress_user_hive (user_id, hive_id),
  CONSTRAINT fk_hive_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_hive_progress_hive FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE,
  CONSTRAINT ck_hive_progress_percent CHECK (percent BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
