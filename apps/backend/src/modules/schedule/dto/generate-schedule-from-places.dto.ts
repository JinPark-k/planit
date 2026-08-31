import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TRAVEL_MODES } from '../../../core';
import type { TravelMode } from '../../../core';
import { REGION_CODE_LIST } from '../../../infra/tour-api/regions';
import type { RegionCode } from '../../../infra/tour-api/regions';
import { DayStartDto } from './generate-schedule.dto';

const MAX_KEYWORDS = 20;
const MAX_DAY_COUNT = 15;
/** 담을 수 있는 장소 수 상한. 무제한이면 요청 본문과 검증 비용이 열려 버린다. */
const MAX_PLACE_IDS = 100;

/**
 * "담기" 흐름의 일정 생성 요청.
 *
 * GenerateScheduleDto(오마카세)와 나누는 이유: 입력이 다르고(키워드 vs 장소 목록)
 * 응답도 다르다(제외 목록 유무). 하나로 합치면 "둘 중 하나는 필수" 같은 조건부 검증이
 * 생기고, Swagger에서 두 흐름이 구분되지 않는다.
 */
export class GenerateScheduleFromPlacesDto {
  @ApiProperty({
    type: [String],
    description:
      '일정에 반드시 넣을 장소의 id(TourAPI contentId). region 안에 있어야 하며, 없는 id는 excludedPlaces에 NOT_FOUND로 돌아온다.',
    example: ['2871024', '126508'],
  })
  @IsArray()
  @ArrayMaxSize(MAX_PLACE_IDS)
  @IsString({ each: true })
  placeIds!: string[];

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

  @ApiPropertyOptional({
    type: [String],
    example: ['바다', '맛집'],
    description:
      '빈 시간을 채울 장소를 고를 때의 스코어링에만 쓴다. 담은 장소의 포함 여부에는 영향이 없다. 리스트를 보던 키워드를 그대로 넘기면 결이 맞는 장소로 채워진다.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_KEYWORDS)
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ type: [DayStartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayStartDto)
  dayStarts?: DayStartDto[];
}
