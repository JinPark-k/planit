import { Injectable } from '@nestjs/common';
import { DayStartOverride, generateSchedule } from '../../core';
import { toPlace } from '../../infra/supabase/place.mapper';
import { PlacesService } from '../places/places.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import {
  ScheduleDayResponseDto,
  toScheduleResponse,
} from './dto/schedule-response.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly placesService: PlacesService) {}

  async generate(dto: GenerateScheduleDto): Promise<ScheduleDayResponseDto[]> {
    const rows = await this.placesService.findRowsByRegion(dto.region);
    const rowById = new Map(rows.map((row) => [row.content_id, row]));

    const days = generateSchedule({
      keywords: dto.keywords,
      dayCount: dto.dayCount,
      travelMode: dto.travelMode,
      dayStartOverrides: toDayStartOverrides(dto),
      candidatePlaces: rows.map(toPlace),
    });

    return toScheduleResponse(days, rowById);
  }
}

/** API 표면의 배열 형태를 core가 쓰는 일차 번호 맵으로 변환한다. */
export function toDayStartOverrides(
  dto: GenerateScheduleDto,
): Record<number, DayStartOverride> | undefined {
  if (!dto.dayStarts?.length) return undefined;
  const overrides: Record<number, DayStartOverride> = {};
  for (const dayStart of dto.dayStarts) {
    overrides[dayStart.day] = {
      location: dayStart.location,
      time: dayStart.time,
    };
  }
  return overrides;
}
