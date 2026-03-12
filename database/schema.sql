CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE gender_type AS ENUM ('Male', 'Female');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_category_type') THEN
    CREATE TYPE age_category_type AS ENUM ('Under 12', 'Under 14', 'Under 16', 'Under 18', 'Under 20');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_scoring_mode_type') THEN
    CREATE TYPE event_scoring_mode_type AS ENUM ('score', 'position', 'outcome');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status_type') THEN
    CREATE TYPE event_status_type AS ENUM ('scheduled', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'result_outcome_type') THEN
    CREATE TYPE result_outcome_type AS ENUM ('win', 'loss', 'draw');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS houses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(128) UNIQUE NOT NULL,
  color VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(6) UNIQUE NOT NULL CHECK (student_id ~ '^S[0-9]{4}[BG]$'),
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender gender_type NOT NULL,
  student_number VARCHAR(64) UNIQUE NOT NULL,
  birth_certificate_number VARCHAR(64) UNIQUE NOT NULL,
  nic_number VARCHAR(32) UNIQUE,
  grade VARCHAR(32) NOT NULL,
  division VARCHAR(32) NOT NULL,
  house_id INTEGER NOT NULL REFERENCES houses(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_lookup ON students(student_id, name);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON students USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  age_category age_category_type NOT NULL,
  gender_category VARCHAR(16) NOT NULL CHECK (gender_category IN ('Male', 'Female', 'Mixed')),
  scoring_mode event_scoring_mode_type NOT NULL,
  event_date DATE NOT NULL,
  status event_status_type NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date_added TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_results (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  house_id INTEGER NOT NULL REFERENCES houses(id),
  score_value NUMERIC(10,2),
  position INTEGER CHECK (position >= 1),
  outcome result_outcome_type,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_event_results_house ON event_results(house_id);
CREATE INDEX IF NOT EXISTS idx_event_results_event ON event_results(event_id);

