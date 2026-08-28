import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { ScheduleDayResponseDto } from './dto/schedule-response.dto';

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
}
