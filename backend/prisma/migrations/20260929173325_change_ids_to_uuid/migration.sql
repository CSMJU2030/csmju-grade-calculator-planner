/*
  Warnings:

  - The primary key for the `courses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `grade_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `courses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `grade_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `course_id` on the `grade_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "grade_items" DROP CONSTRAINT "grade_items_course_id_fkey";

-- AlterTable
ALTER TABLE "courses" DROP CONSTRAINT "courses_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "grade_items" DROP CONSTRAINT "grade_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "course_id",
ADD COLUMN     "course_id" UUID NOT NULL,
ADD CONSTRAINT "grade_items_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "grade_items_course_id_idx" ON "grade_items"("course_id");

-- AddForeignKey
ALTER TABLE "grade_items" ADD CONSTRAINT "grade_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
