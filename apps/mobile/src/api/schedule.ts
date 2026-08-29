import { apiFetch } from './client';
import { GenerateScheduleRequest, ScheduleDay } from './types';

/**
 * POST /schedule은 travelMode가 필수지만 화면에는 이동수단 선택이 없다.
 * 선택 UI가 생기기 전까지 CAR로 고정한다.
 */
const DEFAULT_TRAVEL_MODE = 'CAR';

export function generateSchedule(
  request: GenerateScheduleRequest,
): Promise<ScheduleDay[]> {
  return apiFetch<ScheduleDay[]>('/schedule', {
    method: 'POST',
    body: JSON.stringify({ ...request, travelMode: DEFAULT_TRAVEL_MODE }),
  });
}
