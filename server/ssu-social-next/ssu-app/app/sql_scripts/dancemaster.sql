-- =========================================================
-- CLEAN DANCE MASTER SCHEMA + COMMENTS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------
-- 0) Ensure user roles exist
-- ---------------------------------------------------------

ALTER TABLE ssu_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ssu_users_role_check'
  ) THEN
    ALTER TABLE ssu_users
      ADD CONSTRAINT ssu_users_role_check
      CHECK (role IN ('user','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ssu_users_role ON ssu_users(role);

UPDATE ssu_users
SET role = 'admin'
WHERE email = 'ksalaiev@gmail.com';

-- ---------------------------------------------------------
-- 1) ENUMS
-- ---------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dm_difficulty') THEN
    CREATE TYPE dm_difficulty AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dm_notification_type') THEN
    CREATE TYPE dm_notification_type AS ENUM ('REMINDER','ACHIEVEMENT','SYSTEM');
  END IF;
END $$;

-- ---------------------------------------------------------
-- 2) LESSONS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_lessons (
  lesson_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  style         TEXT NOT NULL,
  difficulty    dm_difficulty NOT NULL,
  duration_sec  INT NOT NULL DEFAULT 0,
  video_url     TEXT,
  description   TEXT,

  created_by    UUID REFERENCES ssu_users(user_id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES ssu_users(user_id) ON DELETE SET NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_lessons_style
ON dm_lessons(style);

CREATE INDEX IF NOT EXISTS idx_dm_lessons_difficulty
ON dm_lessons(difficulty);

-- ---------------------------------------------------------
-- 3) PROGRESS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_progress (
  user_id           UUID NOT NULL REFERENCES ssu_users(user_id) ON DELETE CASCADE,
  lesson_id         UUID NOT NULL REFERENCES dm_lessons(lesson_id) ON DELETE CASCADE,
  last_position_sec INT NOT NULL DEFAULT 0,
  is_completed      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_progress_user
ON dm_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_dm_progress_lesson
ON dm_progress(lesson_id);

-- ---------------------------------------------------------
-- 4) NOTES
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_notes (
  note_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES ssu_users(user_id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES dm_lessons(lesson_id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_notes_user
ON dm_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_dm_notes_lesson
ON dm_notes(lesson_id);

-- ---------------------------------------------------------
-- 5) REVIEWS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_reviews (
  review_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES ssu_users(user_id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES dm_lessons(lesson_id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_reviews_lesson
ON dm_reviews(lesson_id);

-- ---------------------------------------------------------
-- 6) COMMENTS (THIS WAS MISSING)
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_comments (
  comment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES dm_lessons(lesson_id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES ssu_users(user_id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  reply_id    UUID REFERENCES dm_comments(comment_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_comments_lesson
ON dm_comments(lesson_id);

CREATE INDEX IF NOT EXISTS idx_dm_comments_user
ON dm_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_dm_comments_reply
ON dm_comments(reply_id);

-- ---------------------------------------------------------
-- 7) NOTIFICATIONS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES ssu_users(user_id) ON DELETE CASCADE,
  type            dm_notification_type NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_notifications_user
ON dm_notifications(user_id);

-- ---------------------------------------------------------
-- 8) updated_at trigger
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION dm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_lessons_updated_at') THEN
    CREATE TRIGGER trg_dm_lessons_updated_at
    BEFORE UPDATE ON dm_lessons
    FOR EACH ROW EXECUTE FUNCTION dm_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_notes_updated_at') THEN
    CREATE TRIGGER trg_dm_notes_updated_at
    BEFORE UPDATE ON dm_notes
    FOR EACH ROW EXECUTE FUNCTION dm_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_reviews_updated_at') THEN
    CREATE TRIGGER trg_dm_reviews_updated_at
    BEFORE UPDATE ON dm_reviews
    FOR EACH ROW EXECUTE FUNCTION dm_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_progress_updated_at') THEN
    CREATE TRIGGER trg_dm_progress_updated_at
    BEFORE UPDATE ON dm_progress
    FOR EACH ROW EXECUTE FUNCTION dm_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_comments_updated_at') THEN
    CREATE TRIGGER trg_dm_comments_updated_at
    BEFORE UPDATE ON dm_comments
    FOR EACH ROW EXECUTE FUNCTION dm_set_updated_at();
  END IF;

END $$;