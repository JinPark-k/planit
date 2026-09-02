import { apiFetch } from './client';
import {
  RegionCode,
  ScheduleFromPlacesResponse,
  TravelMode,
} from './types';

/** schedule.ts와 같은 이유로 CAR 고정이다. 이동수단 선택 UI가 아직 없다. */
const DEFAULT_TRAVEL_MODE: TravelMode = 'CAR';

export interface GenerateFromPlacesRequest {
  region: RegionCode;
  /** 반드시 일정에 넣을 장소. 서버가 남는 시간을 같은 지역에서 채운다. */
  placeIds: string[];
  dayCount: number;
  /** 빈 시간을 채울 장소를 고를 때의 스코어링에만 쓴다. */
  keywords?: string[];
}

export function generateScheduleFromPlaces(
  request: GenerateFromPlacesRequest,
): Promise<ScheduleFromPlacesResponse> {
  return apiFetch<ScheduleFromPlacesResponse>('/schedule/from-places', {
    method: 'POST',
    body: JSON.stringify({ ...request, travelMode: DEFAULT_TRAVEL_MODE }),
  });
}
