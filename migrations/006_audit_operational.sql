
CREATE TABLE IF NOT EXISTS audit_actor_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_actor_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_type_id BIGINT UNSIGNED NOT NULL,
  actor_id      BIGINT UNSIGNED DEFAULT NULL,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(60) NOT NULL,
  entity_id     BIGINT UNSIGNED DEFAULT NULL,
  before_state  JSON DEFAULT NULL,
  after_state   JSON DEFAULT NULL,
  ip_hash       CHAR(64) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_actor_created (actor_id, created_at),
  CONSTRAINT fk_audit_logs_actor_type FOREIGN KEY (actor_type_id) REFERENCES audit_actor_types (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
