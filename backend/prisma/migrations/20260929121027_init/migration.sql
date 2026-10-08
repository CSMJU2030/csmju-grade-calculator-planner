-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "core_user_id" TEXT NOT NULL,
    "course_code" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_items" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "score" DECIMAL(10,2),
    "max_score" DECIMAL(10,2) NOT NULL,
    "weight_percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_core_user_id_idx" ON "courses"("core_user_id");

-- CreateIndex
CREATE INDEX "grade_items_course_id_idx" ON "grade_items"("course_id");

-- AddForeignKey
ALTER TABLE "grade_items" ADD CONSTRAINT "grade_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
