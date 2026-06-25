import { Module } from '@nestjs/common';
import { TextbooksController } from './textbooks.controller';
import { TextbooksService } from './textbooks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [TextbooksController],
  providers: [TextbooksService],
  imports: [PrismaModule],
  exports: [TextbooksService],
})
export class TextbooksModule {}
