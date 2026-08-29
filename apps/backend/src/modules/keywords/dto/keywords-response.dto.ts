import { ApiProperty } from '@nestjs/swagger';

export class KeywordsResponseDto {
  @ApiProperty({
    type: [String],
    description:
      '선택 가능한 키워드 목록. /recommend, /schedule의 keywords에 그대로 넣는다.',
    example: ['바다', '산', '맛집', '카페'],
  })
  keywords!: string[];
}
