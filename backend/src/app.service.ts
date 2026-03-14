import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '小学生全科智能复习助手 API - 运行中!';
  }
}
