import { ScheduleDay } from '../api/types';
import { addDays, atLocalTime, fromDateKey } from './tripDate';

/** 스케줄표 한 항목을 "언제부터 언제까지 그 장소에 있었는지"로 편 것. */
export interface LiveTripStop {
  placeId: string;
  placeName: string;
  day: number;
  /** epoch ms */
  startAt: number;
  /** epoch ms */
  endAt: number;
}

/**
 * 스케줄표(ScheduleDay[])를 잠금화면이 쓸 수 있는 "정류장" 목록으로 편다.
 *
 * day는 "몇 번째로 나오는 일차인가"가 아니라 "시작일로부터 며칠째인가"를 뜻하는
 * 값이다. 예: days가 [{day:1}, {day:3}]이면 2일차 없이 바로 3일차로 건너뛰는
 * 일정이고, 3일차 날짜는 시작일 + 2일이다. 그래서 배열 인덱스가 아니라 각
 * ScheduleDay.day 필드 값으로 날짜를 계산해야 한다.
 */
export function buildTimeline(days: ScheduleDay[], startDateKey: string): LiveTripStop[] {
  const startDate = fromDateKey(startDateKey);
  const stops: LiveTripStop[] = [];

  for (const day of days) {
    if (day.items.length === 0) {
      continue;
    }

    const dayDate = addDays(startDate, day.day - 1);
    for (const item of day.items) {
      const startAt = atLocalTime(dayDate, item.startTime).getTime();
      // 자정을 넘겨 체류가 끝나는 경우(예: 23:30 시작 + 90분)에도 그냥 ms를 더하면
      // 다음 날짜로 자연스럽게 넘어간다 — 날짜 경계를 따로 계산할 필요가 없다.
      const endAt = startAt + item.stayMinutes * 60000;
      stops.push({
        placeId: item.place.id,
        placeName: item.place.name,
        day: day.day,
        startAt,
        endAt,
      });
    }
  }

  return stops.sort((a, b) => a.startAt - b.startAt);
}
