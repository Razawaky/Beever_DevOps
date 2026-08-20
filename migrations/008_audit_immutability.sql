
CREATE TRIGGER IF NOT EXISTS trg_audit_logs_sem_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: alterar registro de auditoria nao e permitido (RNF-17)';

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_sem_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: apagar registro de auditoria nao e permitido (RNF-17)';
