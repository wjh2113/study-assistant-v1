import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { WrongQuestionsModule } from './modules/wrong-questions/wrong-questions.module';
import { QueueModule } from './queue.module';

// Sprint 1 新增模块
import { FamilyModule } from './modules/family/family.module';
import { TextbooksModule } from './modules/textbooks/textbooks.module';
import { PracticeModule } from './modules/practice/practice.module';
import { LearningModule } from './modules/learning/learning.module';
import { PointsModule } from './modules/points/points.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // 核心模块
    PrismaModule,
    QueueModule,
    
    // 功能模块
    UsersModule,
    AuthModule,
    ExercisesModule,
    WrongQuestionsModule,
    
    // Sprint 1 新增模块
    FamilyModule,
    TextbooksModule,
    PracticeModule,
    LearningModule,
    PointsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
