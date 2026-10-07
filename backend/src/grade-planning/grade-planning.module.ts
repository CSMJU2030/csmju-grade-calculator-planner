import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { GradePlanningController } from './grade-planning.controller';
import { GradePlanningService } from './grade-planning.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    GradePlanningController,
  ],
  providers: [
    GradePlanningService,
  ],
})
export class GradePlanningModule {}