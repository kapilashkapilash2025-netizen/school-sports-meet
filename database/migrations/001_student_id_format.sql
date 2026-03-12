-- Apply this for existing installations where students table already exists.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE students
  ALTER COLUMN student_id TYPE VARCHAR(6);

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_student_id_format_chk;

ALTER TABLE students
  ADD CONSTRAINT students_student_id_format_chk
  CHECK (student_id ~ '^S[0-9]{4}[BG]$');

CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON students USING gin (name gin_trgm_ops);

ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS date_added TIMESTAMP NOT NULL DEFAULT NOW();
