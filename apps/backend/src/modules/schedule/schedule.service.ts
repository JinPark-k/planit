import { Injectable } from '@nestjs/common';
import { generateSchedule } from '../../core';
import { PlacesService } from '../places/places.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly placesService: PlacesService) {}

  async generate(dto: GenerateScheduleDto) {
    const candidatePlaces = await this.placesService.findByRegion(dto.region);
    return generateSchedule({
      keywords: dto.keywords,
      dayCount: dto.dayCount,
      travelMode: dto.travelMode,
      dayStartOverrides: dto.dayStartOverrides,
      candidatePlaces,
    });
  }
}
