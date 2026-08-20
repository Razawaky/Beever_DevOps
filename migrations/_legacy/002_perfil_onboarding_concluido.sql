ALTER TABLE perfil
  ADD COLUMN onboarding_concluido TINYINT(1) NOT NULL DEFAULT 0 AFTER pontos;
