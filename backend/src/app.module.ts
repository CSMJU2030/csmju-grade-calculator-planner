import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { GradeItemsModule } from './grade-items/grade-items.module';
import { GradePlanningModule } from './grade-planning/grade-planning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    HealthModule,
    AuthModule,
    CoursesModule,
    GradeItemsModule,
    GradePlanningModule,
  ],
})
export class AppModule {}