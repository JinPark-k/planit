import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleDay } from '../../../core';
import { PlaceListRow } from '../../../infra/supabase/places.types';
import {
  PlaceResponseDto,
  toPlaceResponse,
} from '../../places/dto/place-response.dto';

export class ScheduleItemResponseDto {
  @ApiProperty({ type: PlaceResponseDto })
  place!: PlaceResponseDto;

  @ApiProperty({ description: 'HH:MM', example: '09:00' })
  startTime!: string;

  @ApiProperty({
    description:
      '이 장소에 머무는 시간(분). 카테고리별 기본값(관광 90 / 맛집 60 / 액티비티 120)이라 추정치다.',
    example: 90,
  })
  stayMinutes!: number;

  @ApiPropertyOptional({
    description:
      '직전 장소로부터의 추정 이동시간(분). 첫 장소는 없음. 하버사인 근사치.',
    example: 9,
  })
  travelFromPreviousMinutes?: number;
}

export class ScheduleDayResponseDto {
  @ApiProperty({ example: 1 })
  day!: number;

  @ApiProperty({ type: [ScheduleItemResponseDto] })
  items!: ScheduleItemResponseDto[];
}

/**
 * core의 ScheduleDay를 화면용 응답으로 변환한다.
 * core의 Place에는 주소/이미지가 없으므로 rowById에서 표시 필드를 다시 붙인다.
 */
export function toScheduleResponse(
  days: ScheduleDay[],
  rowById: ReadonlyMap<string, PlaceListRow>,
): ScheduleDayResponseDto[] {
  return days.map((day) => ({
    day: day.day,
    items: day.items.flatMap((item) => {
      const row = rowById.get(item.place.id);
      if (!row) return [];
      return [
        {
          place: toPlaceResponse(row),
          startTime: item.startTime,
          stayMinutes: item.stayMinutes,
          travelFromPreviousMinutes: item.travelFromPreviousMinutes,
        },
      ];
    }),
  }));
}

/** 담은 장소가 일정에 못 들어간 이유. */
export const EXCLUDED_REASONS = ['NOT_FOUND', 'NO_TIME'] as const;
export type ExcludedReason = (typeof EXCLUDED_REASONS)[number];

export class ExcludedPlaceDto {
  @ApiProperty({ description: '요청에 들어 있던 장소 id', example: '2871024' })
  placeId!: string;

  @ApiProperty({
    enum: EXCLUDED_REASONS,
    description:
      'NOT_FOUND: 그 지역에서 찾을 수 없는 id(배치가 장소를 지웠거나 지역이 다름). ' +
      'NO_TIME: 하루 마감(21:00)까지 넣을 자리가 없었음.',
  })
  reason!: ExcludedReason;

  @ApiPropertyOptional({
    type: PlaceResponseDto,
    description:
      '알 수 있을 때만 채운다. NOT_FOUND는 장소 정보 자체가 없어 비어 있다.',
  })
  place?: PlaceResponseDto;
}

/**
 * "담기" 흐름의 일정 응답.
 *
 * 오마카세(POST /schedule)가 배열을 그대로 반환하는 것과 달리 객체로 감싼다.
 * 담은 장소가 빠졌을 때 사용자에게 알려야 하는데, 배열로는 실을 자리가 없다.
 */
export class ScheduleFromPlacesResponseDto {
  @ApiProperty({ type: [ScheduleDayResponseDto] })
  days!: ScheduleDayResponseDto[];

  @ApiProperty({
    type: [ExcludedPlaceDto],
    description: '담았지만 일정에 넣지 못한 장소. 없으면 빈 배열.',
  })
  excludedPlaces!: ExcludedPlaceDto[];
}
