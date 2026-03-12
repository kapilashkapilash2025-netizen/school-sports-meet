-- Allow DOB to be NULL for exact PDF imports where date is missing.
ALTER TABLE students
  ALTER COLUMN date_of_birth DROP NOT NULL;
