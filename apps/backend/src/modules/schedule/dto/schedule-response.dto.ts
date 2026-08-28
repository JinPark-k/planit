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
          travelFromPreviousMinutes: item.travelFromPreviousMinutes,
        },
      ];
    }),
  }));
}
