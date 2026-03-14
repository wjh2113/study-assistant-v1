import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [PracticeController],
  providers: [PracticeService],
  imports: [PrismaModule],
  exports: [PracticeService],
})
export class PracticeModule {}
