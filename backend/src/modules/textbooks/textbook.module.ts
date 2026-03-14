import { Module } from '@nestjs/common';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [TextbookController],
  providers: [TextbookService],
  imports: [PrismaModule],
  exports: [TextbookService],
})
export class TextbookModule {}
