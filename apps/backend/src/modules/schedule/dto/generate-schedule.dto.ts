import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TRAVEL_MODES } from '../../../core';
import type { TravelMode } from '../../../core';
import { REGION_CODE_LIST } from '../../../infra/tour-api/regions';
import type { RegionCode } from '../../../infra/tour-api/regions';

const MAX_KEYWORDS = 20;
/** 하루 단위 일정이라 현실적인 상한을 둔다. 무제한이면 빈 day만 잔뜩 생긴다. */
const MAX_DAY_COUNT = 15;
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class GeoPointInputDto {
  @ApiProperty({ example: 33.4996 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 126.5312 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

/**
 * 일차별 시작 지점/시각(숙소·기차역 등).
 *
 * core는 `Record<number, DayStartOverride>`를 받지만 API 표면은 배열로 둔다.
 * 숫자 키 맵은 class-validator로 중첩 검증이 안 되고 Swagger 스키마로도 표현이 안 된다.
 */
export class DayStartDto {
  @ApiProperty({ description: '일차(1부터)', example: 1 })
  @IsInt()
  @Min(1)
  day!: number;

  @ApiPropertyOptional({
    type: GeoPointInputDto,
    description:
      '이 지점부터 첫 장소까지의 이동시간을 계산에 반영한다. 일정 아이템으로는 표시되지 않는다.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointInputDto)
  location?: GeoPointInputDto;

  @ApiPropertyOptional({
    example: '10:30',
    description: '이 시각부터 일정 시작(예: 기차 도착시간). 미지정 시 09:00.',
  })
  @IsOptional()
  @Matches(HHMM_PATTERN, { message: 'time must be HH:MM (00:00-23:59)' })
  time?: string;
}

export class GenerateScheduleDto {
  @ApiPropertyOptional({ type: [String], example: ['바다', '맛집'] })
  @IsArray()
  @ArrayMaxSize(MAX_KEYWORDS)
  @IsString({ each: true })
  keywords!: string[];

  @ApiProperty({ enum: REGION_CODE_LIST, example: 'JEJU' })
  @IsIn(REGION_CODE_LIST, {
    message: `region must be one of: ${REGION_CODE_LIST.join(', ')}`,
  })
  region!: RegionCode;

  @ApiProperty({ example: 2, minimum: 1, maximum: MAX_DAY_COUNT })
  @IsInt()
  @Min(1)
  @Max(MAX_DAY_COUNT)
  dayCount!: number;

  @ApiProperty({ enum: TRAVEL_MODES, example: 'CAR' })
  @IsIn(TRAVEL_MODES, {
    message: `travelMode must be one of: ${TRAVEL_MODES.join(', ')}`,
  })
  travelMode!: TravelMode;

  @ApiPropertyOptional({ type: [DayStartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayStartDto)
  dayStarts?: DayStartDto[];
}
