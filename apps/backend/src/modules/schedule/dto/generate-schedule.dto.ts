import { DayStartOverride, TravelMode } from '../../../core';
import { RegionCode } from '../../../infra/tour-api/regions';

export class GenerateScheduleDto {
  keywords!: string[];
  /** 'SEOUL' | 'BUSAN' | 'JEJU' */
  region!: RegionCode;
  dayCount!: number;
  travelMode!: TravelMode;
  /** 일차별 시작 지점/시각(숙소·기차역 등). 선택. */
  dayStartOverrides?: Record<number, DayStartOverride>;
}
