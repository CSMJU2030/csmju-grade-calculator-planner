-- Preserve existing courses and scores. Unspecified details are NULL.
ALTER TABLE "courses" ALTER COLUMN "course_code" DROP NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "credits" DROP NOT NULL;
