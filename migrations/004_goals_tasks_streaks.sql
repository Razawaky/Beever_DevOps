

CREATE TABLE IF NOT EXISTS goal_types (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(60) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  progress_source VARCHAR(60) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goal_statuses (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goal_difficulties (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(40) NOT NULL,
  name              VARCHAR(80) NOT NULL,
  reward_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.000,
  default_days      SMALLINT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_difficulties_slug (slug),
  CONSTRAINT ck_goal_difficulties_multiplier CHECK (reward_multiplier > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goals (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              BIGINT UNSIGNED NOT NULL,
  goal_type_id         BIGINT UNSIGNED NOT NULL,
  status_id            BIGINT UNSIGNED NOT NULL,
  difficulty_id        BIGINT UNSIGNED NOT NULL,
  title                VARCHAR(160) NOT NULL,
  target_value         BIGINT NOT NULL,
  current_value        BIGINT NOT NULL DEFAULT 0,
  reward_coins         BIGINT NOT NULL DEFAULT 0,
  reward_points        INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at               DATETIME NOT NULL,
  completed_at         DATETIME DEFAULT NULL,
  renewed_from_goal_id BIGINT UNSIGNED DEFAULT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user_status_due (user_id, status_id, due_at),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_goals_type FOREIGN KEY (goal_type_id) REFERENCES goal_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_status FOREIGN KEY (status_id) REFERENCES goal_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_difficulty FOREIGN KEY (difficulty_id) REFERENCES goal_difficulties (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_renewed_from FOREIGN KEY (renewed_from_goal_id) REFERENCES goals (id) ON DELETE SET NULL,
  CONSTRAINT ck_goals_values CHECK (target_value > 0 AND current_value >= 0 AND reward_coins >= 0),
  CONSTRAINT ck_goals_dates CHECK (due_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS task_scopes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_scopes_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_types (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(60) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  scope_id        BIGINT UNSIGNED NOT NULL,
  progress_source VARCHAR(60) NOT NULL,
  default_target  BIGINT NOT NULL DEFAULT 1,
  reward_points   INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins    BIGINT NOT NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_types_slug (slug),
  CONSTRAINT fk_task_types_scope FOREIGN KEY (scope_id) REFERENCES task_scopes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_task_types_values CHECK (default_target > 0 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  task_type_id  BIGINT UNSIGNED NOT NULL,
  status_id     BIGINT UNSIGNED NOT NULL,
  target_value  BIGINT NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  reward_points INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins  BIGINT NOT NULL DEFAULT 0,
  due_at        DATETIME NOT NULL,
  completed_at  DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_user_status_due (user_id, status_id, due_at),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_type FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tasks_status FOREIGN KEY (status_id) REFERENCES goal_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT ck_tasks_values CHECK (target_value > 0 AND current_value >= 0 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS streaks (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  current_days      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  best_days         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  shields_available TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_counted_date DATE DEFAULT NULL,
  last_evaluated_at DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_streaks_user (user_id),
  CONSTRAINT fk_streaks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_streaks_shields CHECK (shields_available <= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS streak_event_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_streak_event_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS streak_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  event_date    DATE NOT NULL,
  event_type_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_streak_events_user_date (user_id, event_date),
  CONSTRAINT fk_streak_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_streak_events_type FOREIGN KEY (event_type_id) REFERENCES streak_event_types (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
