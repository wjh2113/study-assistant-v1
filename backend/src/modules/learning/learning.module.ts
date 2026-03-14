import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [LearningController],
  providers: [LearningService],
  imports: [PrismaModule],
  exports: [LearningService],
})
export class LearningModule {}
