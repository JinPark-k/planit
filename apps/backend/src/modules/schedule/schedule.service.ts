import { Injectable } from '@nestjs/common';
import { generateSchedule } from '../../core';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

@Injectable()
export class ScheduleService {
  // TODO: places/places.service.ts를 통해 실제 candidatePlaces를 조회해 연결한다.
  generate(dto: GenerateScheduleDto) {
    return generateSchedule({
      keywords: dto.keywords,
      dayCount: dto.dayCount,
      travelMode: dto.travelMode,
      candidatePlaces: [],
    });
  }
}
