import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { GenerateScheduleFromPlacesDto } from './dto/generate-schedule-from-places.dto';
import {
  ScheduleDayResponseDto,
  ScheduleFromPlacesResponseDto,
} from './dto/schedule-response.dto';

@ApiTags('schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({
    summary: '키워드 기반 여행 일정 자동 생성 (오마카세)',
    description:
      '키워드·지역·일수만 주면 장소 선정부터 순서·시각까지 서버가 생성한다. LLM 미사용, 규칙 기반.',
  })
  @ApiOkResponse({ type: [ScheduleDayResponseDto] })
  generate(
    @Body() dto: GenerateScheduleDto,
  ): Promise<ScheduleDayResponseDto[]> {
    return this.scheduleService.generate(dto);
  }

  @Post('from-places')
  @ApiOperation({
    summary: '담은 장소로 여행 일정 생성',
    description:
      '고른 장소를 반드시 넣고, 남는 시간(끼니 포함)은 같은 지역에서 자동으로 채운다. ' +
      '하루 마감까지 자리가 없어 넣지 못한 장소는 excludedPlaces로 알린다.',
  })
  @ApiOkResponse({ type: ScheduleFromPlacesResponseDto })
  generateFromPlaces(
    @Body() dto: GenerateScheduleFromPlacesDto,
  ): Promise<ScheduleFromPlacesResponseDto> {
    return this.scheduleService.generateFromPlaces(dto);
  }
}
