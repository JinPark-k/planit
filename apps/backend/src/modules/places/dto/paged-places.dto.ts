import { ApiProperty } from '@nestjs/swagger';
import { PlaceResponseDto } from './place-response.dto';

export class PagedPlacesDto {
  @ApiProperty({
    description:
      '필터 적용 후 전체 개수(페이지네이션 이전). limit/offset 계산용.',
    example: 62,
  })
  total!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ type: [PlaceResponseDto] })
  items!: PlaceResponseDto[];
}
