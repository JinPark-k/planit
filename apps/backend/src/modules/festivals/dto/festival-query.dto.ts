import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  REGION_CODE_LIST,
  type RegionCode,
} from '../../../infra/tour-api/regions';

export const DEFAULT_FESTIVAL_LIMIT = 20;
/**
 * 진행·예정 축제가 전국 274건(2026-09-04 실측)이라 전부 받아도 부담이 없다.
 * 그래도 상한은 둔다 — 무제한이면 실수로 전체를 반복 조회하게 된다.
 */
export const MAX_FESTIVAL_LIMIT = 100;

export class FestivalQueryDto {
  @ApiPropertyOptional({
    enum: REGION_CODE_LIST,
    description:
      '지정하면 해당 지역 축제만. 생략하면 전국이다 — 홈 화면은 전국을 쓴다.',
  })
  @IsOptional()
  @IsIn(REGION_CODE_LIST, {
    message: `region must be one of: ${REGION_CODE_LIST.join(', ')}`,
  })
  region?: RegionCode;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_FESTIVAL_LIMIT,
    default: DEFAULT_FESTIVAL_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_FESTIVAL_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
