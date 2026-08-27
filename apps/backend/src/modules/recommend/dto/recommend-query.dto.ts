import { RegionCode } from '../../../infra/tour-api/regions';

export class RecommendQueryDto {
  keywords!: string[];
  /** 'SEOUL' | 'BUSAN' | 'JEJU' */
  region!: RegionCode;
}
