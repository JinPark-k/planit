import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { REGION_CODE_LIST } from '../../../infra/tour-api/regions';
import type { RegionCode } from '../../../infra/tour-api/regions';

export class PlacesQueryDto {
  @ApiProperty({ enum: REGION_CODE_LIST, example: 'JEJU' })
  @IsIn(REGION_CODE_LIST, {
    message: `regionCode must be one of: ${REGION_CODE_LIST.join(', ')}`,
  })
  regionCode!: RegionCode;
}
