
ALTER TABLE profiles
  DROP CHECK ck_profiles_session_minutes;

ALTER TABLE profiles
  ADD CONSTRAINT ck_profiles_session_minutes CHECK (session_minutes IN (5, 10, 20, 30, 45));
