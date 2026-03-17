import { Module } from '@nestjs/common';
import { AiGradingController } from './ai-grading.controller';
import { AiGradingService } from './ai-grading.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiGradingController],
  providers: [AiGradingService],
  exports: [AiGradingService],
})
export class AiGradingModule {}
