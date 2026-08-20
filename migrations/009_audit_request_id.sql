
ALTER TABLE audit_logs
  ADD COLUMN request_id CHAR(36) DEFAULT NULL AFTER ip_hash,
  ADD KEY idx_audit_logs_request (request_id);
