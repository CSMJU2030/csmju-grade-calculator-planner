import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GradeItemsController } from './grade-items.controller';
import { GradeItemsService } from './grade-items.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    GradeItemsController,
  ],
  providers: [
    GradeItemsService,
  ],
})
export class GradeItemsModule {}