-- Preserve course IDs, owners and grade items. Do not recreate the tables.
BEGIN;
ALTER TABLE "courses" RENAME COLUMN "core_user_id" TO "owner_core_user_id";
ALTER INDEX "courses_core_user_id_idx" RENAME TO "courses_owner_core_user_id_idx";
COMMIT;
