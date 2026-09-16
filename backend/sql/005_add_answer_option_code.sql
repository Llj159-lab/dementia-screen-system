BEGIN;

ALTER TABLE assessment_answers
  ADD COLUMN IF NOT EXISTS option_code TEXT;

COMMIT;
