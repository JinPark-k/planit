import { Body, Controller, Post } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendQueryDto } from './dto/recommend-query.dto';

@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  recommend(@Body() query: RecommendQueryDto) {
    return this.recommendService.recommend(query);
  }
}
