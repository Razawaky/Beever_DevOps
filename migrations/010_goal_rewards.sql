
ALTER TABLE goal_difficulties
  ADD COLUMN reward_coins BIGINT NOT NULL DEFAULT 0 AFTER reward_multiplier,
  ADD COLUMN reward_points INT UNSIGNED NOT NULL DEFAULT 0 AFTER reward_coins,
  ADD CONSTRAINT ck_goal_difficulties_reward CHECK (reward_coins >= 0);
