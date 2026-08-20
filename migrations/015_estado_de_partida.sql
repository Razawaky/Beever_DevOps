
ALTER TABLE game_sessions
  ADD COLUMN saved_state JSON DEFAULT NULL AFTER is_replay;
