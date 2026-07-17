import { TravelMode } from '../../../core';

export class GenerateScheduleDto {
  keywords!: string[];
  dayCount!: number;
  travelMode!: TravelMode;
}
