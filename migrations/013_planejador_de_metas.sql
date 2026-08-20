
CREATE TABLE IF NOT EXISTS goal_plan_rules (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  min_weekdays  TINYINT UNSIGNED NOT NULL,
  max_weekdays  TINYINT UNSIGNED NOT NULL,
  active_goals  TINYINT UNSIGNED NOT NULL,
  difficulty_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_plan_rules_faixa (min_weekdays, max_weekdays),
  KEY idx_goal_plan_rules_difficulty (difficulty_id),
  CONSTRAINT fk_goal_plan_rules_difficulty FOREIGN KEY (difficulty_id) REFERENCES goal_difficulties (id) ON DELETE RESTRICT,
  CONSTRAINT ck_goal_plan_rules_faixa CHECK (min_weekdays >= 1 AND max_weekdays >= min_weekdays AND max_weekdays <= 7),
  CONSTRAINT ck_goal_plan_rules_metas CHECK (active_goals >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goal_target_rules (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_type_id     BIGINT UNSIGNED NOT NULL,
  base_per_session DECIMAL(10,3) NOT NULL,
  min_increment    BIGINT NOT NULL,
  max_increment    BIGINT NOT NULL,
  rounding_step    BIGINT NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_target_rules_type (goal_type_id),
  CONSTRAINT fk_goal_target_rules_type FOREIGN KEY (goal_type_id) REFERENCES goal_types (id) ON DELETE CASCADE,
  CONSTRAINT ck_goal_target_rules_valores CHECK (
    base_per_session > 0 AND min_increment >= 1 AND max_increment >= min_increment AND rounding_step >= 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
