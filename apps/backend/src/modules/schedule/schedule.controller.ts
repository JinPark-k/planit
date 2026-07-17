import { Body, Controller, Post } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  generate(@Body() dto: GenerateScheduleDto) {
    return this.scheduleService.generate(dto);
  }
}
