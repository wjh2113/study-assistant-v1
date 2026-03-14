import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [FamilyController],
  providers: [FamilyService],
  imports: [PrismaModule],
  exports: [FamilyService],
})
export class FamilyModule {}
