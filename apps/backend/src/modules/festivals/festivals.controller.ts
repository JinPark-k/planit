import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FestivalQueryDto } from './dto/festival-query.dto';
import { PagedFestivalsDto } from './dto/festival-response.dto';
import { FestivalsService } from './festivals.service';

@ApiTags('festivals')
@Controller('festivals')
export class FestivalsController {
  constructor(private readonly festivalsService: FestivalsService) {}

  @Get()
  @ApiOperation({
    summary: '지금 열리는 / 앞으로 열리는 축제',
    description:
      '아직 끝나지 않은 축제를 임박한 순으로 반환한다. 지역을 지정하지 않으면 전국이다. ' +
      '홈 화면이 이 목록을 쓰고, 축제를 누르면 그 지역·그 축제로 일정을 만든다.',
  })
  @ApiOkResponse({ type: PagedFestivalsDto })
  findUpcoming(@Query() query: FestivalQueryDto): Promise<PagedFestivalsDto> {
    return this.festivalsService.findUpcoming(query);
  }
}
