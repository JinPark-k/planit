import { ApiProperty } from '@nestjs/swagger';
import { REGION_BY_DB_CODE } from '../../../infra/tour-api/regions';
import type { RegionCode } from '../../../infra/tour-api/regions';
import { FestivalListRow } from '../../../infra/supabase/places.types';
import {
  PlaceResponseDto,
  toPlaceResponse,
} from '../../places/dto/place-response.dto';

/**
 * 홈 화면에 띄우는 축제.
 *
 * 장소 표현에 개최 기간과 지역을 더한 것이다. 축제도 places 테이블의 한 행이라
 * (contentTypeId=15) 장소 필드는 그대로 재사용한다.
 */
export class FestivalResponseDto extends PlaceResponseDto {
  @ApiProperty({ description: '개최 시작일 YYYY-MM-DD', example: '2026-09-12' })
  startDate!: string;

  @ApiProperty({ description: '개최 종료일 YYYY-MM-DD', example: '2026-09-13' })
  endDate!: string;

  @ApiProperty({
    description:
      '축제가 열리는 지역. 축제를 눌러 일정을 만들 때 이 값을 그대로 쓴다.',
    example: 'JEJU',
  })
  region!: RegionCode;

  @ApiProperty({
    description: '기준일에 이미 진행 중인지. 아니면 앞으로 열린다.',
    example: false,
  })
  ongoing!: boolean;

  @ApiProperty({
    description:
      '개최 기간(일). 시작일과 종료일을 포함한다. 하루짜리면 1. ' +
      '상설 프로그램에 가까운 장기 행사를 구분하는 데 쓴다.',
    example: 2,
  })
  durationDays!: number;
}

export class PagedFestivalsDto {
  @ApiProperty({ description: '필터 적용 후 전체 개수', example: 274 })
  total!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ type: [FestivalResponseDto] })
  items!: FestivalResponseDto[];
}

/** 시작일과 종료일을 포함한 일수. 같은 날이면 1. */
export function durationDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * @param row 개최 기간이 채워진 축제 row. 호출측이 non-null로 걸러서 넘긴다.
 * @param today 'YYYY-MM-DD'. 진행 중 판정 기준일.
 */
export function toFestivalResponse(
  row: FestivalListRow,
  today: string,
): FestivalResponseDto {
  const startDate = row.event_start_date as string;
  const endDate = row.event_end_date as string;

  return {
    ...toPlaceResponse(row),
    startDate,
    endDate,
    // 지역이 매핑되지 않는 행은 서비스에서 걸러내므로 여기서는 단언한다.
    region: REGION_BY_DB_CODE[row.region_code],
    ongoing: startDate <= today,
    durationDays: durationDays(startDate, endDate),
  };
}
