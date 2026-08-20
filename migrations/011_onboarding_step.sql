
ALTER TABLE profiles
  ADD COLUMN onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER initial_goal_id;
