import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsString } from 'class-validator';
import { REGION_CODE_LIST } from '../../../infra/tour-api/regions';
import type { RegionCode } from '../../../infra/tour-api/regions';

/** 키워드 상한. 값 자체보다 "무제한이 아니다"가 중요하다(태그 해석 비용 방어). */
const MAX_KEYWORDS = 20;

export class RecommendQueryDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['바다', '맛집'],
    description:
      '빈 배열도 허용한다(이 경우 태그 일치도가 모두 0이라 인기도/평점 순이 된다).',
  })
  @IsArray()
  @ArrayMaxSize(MAX_KEYWORDS)
  @IsString({ each: true })
  keywords!: string[];

  @ApiProperty({ enum: REGION_CODE_LIST, example: 'JEJU' })
  @IsIn(REGION_CODE_LIST, {
    message: `region must be one of: ${REGION_CODE_LIST.join(', ')}`,
  })
  region!: RegionCode;
}
