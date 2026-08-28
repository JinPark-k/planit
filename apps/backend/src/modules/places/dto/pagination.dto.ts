import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PLACE_CATEGORIES } from '../../../core';
import type { PlaceCategory } from '../../../core';

export const DEFAULT_LIMIT = 20;
/**
 * 한 번에 내려줄 수 있는 최대 개수.
 * 상한이 없으면 서울(1,700건대) 전체가 그대로 나가고, 화면은 그걸 다 쓰지 않는다.
 */
export const MAX_LIMIT = 100;

/** 목록 조회 공통 파라미터. 쿼리스트링은 문자열로 오므로 @Type으로 숫자 변환한다. */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    enum: PLACE_CATEGORIES,
    description: '지정하면 해당 카테고리만 반환한다(관광/맛집/액티비티 탭).',
  })
  @IsOptional()
  @IsIn(PLACE_CATEGORIES, {
    message: `category must be one of: ${PLACE_CATEGORIES.join(', ')}`,
  })
  category?: PlaceCategory;
}

/** total/limit/offset을 붙여 한 페이지로 자른다. */
export function paginate<T>(
  items: T[],
  limit: number | undefined,
  offset: number | undefined,
): { total: number; limit: number; offset: number; items: T[] } {
  const appliedLimit = limit ?? DEFAULT_LIMIT;
  const appliedOffset = offset ?? 0;
  return {
    total: items.length,
    limit: appliedLimit,
    offset: appliedOffset,
    items: items.slice(appliedOffset, appliedOffset + appliedLimit),
  };
}
