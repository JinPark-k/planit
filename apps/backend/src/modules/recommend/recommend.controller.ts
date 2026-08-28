import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecommendService } from './recommend.service';
import { RecommendQueryDto } from './dto/recommend-query.dto';
import { PlaceResponseDto } from '../places/dto/place-response.dto';

@ApiTags('recommend')
@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  @ApiOperation({
    summary: '키워드 조합 기반 추천 장소',
    description:
      '키워드를 태그로 변환해 스코어링한 뒤 추천 순으로 반환한다. 조회지만 keywords가 배열이라 POST를 쓴다.',
  })
  @ApiOkResponse({ type: [PlaceResponseDto] })
  recommend(@Body() query: RecommendQueryDto): Promise<PlaceResponseDto[]> {
    return this.recommendService.recommend(query);
  }
}
