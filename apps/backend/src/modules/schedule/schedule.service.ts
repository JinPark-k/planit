import { Injectable } from '@nestjs/common';
import { DayStartOverride, generateSchedule } from '../../core';
import { toPlace } from '../../infra/supabase/place.mapper';
import { PlacesService } from '../places/places.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { GenerateScheduleFromPlacesDto } from './dto/generate-schedule-from-places.dto';
import {
  ExcludedPlaceDto,
  ScheduleDayResponseDto,
  ScheduleFromPlacesResponseDto,
  toScheduleResponse,
} from './dto/schedule-response.dto';
import { toPlaceResponse } from '../places/dto/place-response.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly placesService: PlacesService) {}

  async generate(dto: GenerateScheduleDto): Promise<ScheduleDayResponseDto[]> {
    // 일정 생성은 키워드로 후보를 좁히지 않는다. 끼니/카페 슬롯과 이동 경로를 채우려면
    // 키워드와 무관한 장소도 후보에 있어야 한다(예: '문화예술' 일정의 점심 식당).
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

  /**
   * "담기" 흐름: 사용자가 고른 장소를 반드시 넣고, 남는 시간은 지역 풀에서 채운다.
   *
   * 후보를 담은 장소로만 좁히지 않는 이유: 그러면 관광지만 담았을 때 끼니가 비고
   * 하루가 텅 빈 채로 남는다. 지역 전체를 후보로 주고 담은 것에 우선권을 주면,
   * 채움은 core가 알아서 한다.
   */
  async generateFromPlaces(
    dto: GenerateScheduleFromPlacesDto,
  ): Promise<ScheduleFromPlacesResponseDto> {
    // 담은 장소와 채움 풀을 한 번의 조회로 얻는다(TTL 캐시가 걸린 경로).
    const rows = await this.placesService.findRowsByRegion(dto.region);
    const rowById = new Map(rows.map((row) => [row.content_id, row]));

    const excludedPlaces: ExcludedPlaceDto[] = [];
    const mustIncludePlaceIds = new Set<string>();
    for (const placeId of dto.placeIds) {
      if (rowById.has(placeId)) {
        mustIncludePlaceIds.add(placeId);
      } else {
        // 400으로 요청 전체를 거절하지 않는다. 리스트를 본 시점과 이 요청 사이에
        // 배치가 장소를 지웠을 수 있고, 그건 클라이언트 잘못이 아니다.
        excludedPlaces.push({ placeId, reason: 'NOT_FOUND' });
      }
    }

    const days = generateSchedule({
      keywords: dto.keywords ?? [],
      dayCount: dto.dayCount,
      travelMode: dto.travelMode,
      dayStartOverrides: toDayStartOverrides(dto),
      candidatePlaces: rows.map(toPlace),
      mustIncludePlaceIds,
    });

    // core는 무엇이 빠졌는지 알리지 않는다. 요청한 것과 결과를 대조해 여기서 찾는다.
    const scheduledIds = new Set(
      days.flatMap((day) => day.items.map((item) => item.place.id)),
    );
    for (const placeId of mustIncludePlaceIds) {
      if (scheduledIds.has(placeId)) continue;
      const row = rowById.get(placeId);
      excludedPlaces.push({
        placeId,
        reason: 'NO_TIME',
        place: row ? toPlaceResponse(row) : undefined,
      });
    }

    return { days: toScheduleResponse(days, rowById), excludedPlaces };
  }
}

/** API 표면의 배열 형태를 core가 쓰는 일차 번호 맵으로 변환한다. */
export function toDayStartOverrides(
  dto: Pick<GenerateScheduleDto, 'dayStarts'>,
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
