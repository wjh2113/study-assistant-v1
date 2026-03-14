import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { WrongQuestionsService } from './wrong-questions.service';
import { CreateWrongQuestionDto, UpdateWrongQuestionDto } from './dto/wrong-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wrong-questions')
@UseGuards(JwtAuthGuard)
export class WrongQuestionsController {
  constructor(private readonly wrongQuestionsService: WrongQuestionsService) {}

  @Get()
  findAll(@Request() req) {
    return this.wrongQuestionsService.findAll(req.user.userId);
  }

  @Get('review')
  getReviewQuestions(@Request() req) {
    return this.wrongQuestionsService.getReviewQuestions(req.user.userId);
  }

  @Post()
  create(@Request() req, @Body() createWrongQuestionDto: CreateWrongQuestionDto) {
    return this.wrongQuestionsService.create(req.user.userId, createWrongQuestionDto);
  }

  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWrongQuestionDto: UpdateWrongQuestionDto,
  ) {
    return this.wrongQuestionsService.update(id, updateWrongQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.wrongQuestionsService.remove(id);
  }
}
