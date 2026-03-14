import { Module } from '@nestjs/common';
import { WrongQuestionsController } from './wrong-questions.controller';
import { WrongQuestionsService } from './wrong-questions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WrongQuestionsController],
  providers: [WrongQuestionsService],
  exports: [WrongQuestionsService],
})
export class WrongQuestionsModule {}
