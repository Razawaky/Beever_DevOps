

CREATE TABLE IF NOT EXISTS age_bands (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            CHAR(1) NOT NULL,
  name            VARCHAR(60) NOT NULL,
  min_age         TINYINT UNSIGNED NOT NULL,
  max_age         TINYINT UNSIGNED NOT NULL,
  is_economy_enabled TINYINT(1) NOT NULL DEFAULT 1,
  is_upkeep_enabled  TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_age_bands_code (code),
  CONSTRAINT ck_age_bands_range CHECK (min_age >= 0 AND max_age >= min_age)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS avatars (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(60) NOT NULL,
  name       VARCHAR(60) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_avatars_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS initial_goals (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(60) NOT NULL,
  label      VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_initial_goals_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS users (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email                   VARCHAR(190) NOT NULL,
  nickname                VARCHAR(60) NOT NULL,
  password_hash           VARCHAR(255) NOT NULL,
  birth_date              DATE NOT NULL,
  is_active               TINYINT(1) NOT NULL DEFAULT 1,
  onboarding_completed_at DATETIME DEFAULT NULL,
  last_login_at           DATETIME DEFAULT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_active_last_login (is_active, last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS admins (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_user (user_id),
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  age_band_id       BIGINT UNSIGNED DEFAULT NULL,
  avatar_id         BIGINT UNSIGNED DEFAULT NULL,
  initial_goal_id   BIGINT UNSIGNED DEFAULT NULL,
  timezone          VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  session_minutes   TINYINT UNSIGNED NOT NULL DEFAULT 10,
  is_sound_enabled  TINYINT(1) NOT NULL DEFAULT 1,
  has_reduced_motion TINYINT(1) NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user (user_id),
  KEY idx_profiles_age_band (age_band_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT,
  CONSTRAINT fk_profiles_avatar FOREIGN KEY (avatar_id) REFERENCES avatars (id) ON DELETE RESTRICT,
  CONSTRAINT fk_profiles_initial_goal FOREIGN KEY (initial_goal_id) REFERENCES initial_goals (id) ON DELETE RESTRICT,
  CONSTRAINT ck_profiles_session_minutes CHECK (session_minutes IN (5, 10, 20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS schedules (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  weekday      TINYINT UNSIGNED NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedules_user_weekday (user_id, weekday),
  CONSTRAINT fk_schedules_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_schedules_weekday CHECK (weekday BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS guardian_consents (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  guardian_email VARCHAR(190) NOT NULL,
  consented_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash        CHAR(64) DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_guardian_consents_user (user_id),
  CONSTRAINT fk_guardian_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
