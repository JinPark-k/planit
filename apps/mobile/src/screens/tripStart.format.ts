import { ScheduleDay } from '../api/types';
import { addDays, fromDateKey, toDateKey } from '../trip/tripDate';

/** "2026년 3월" */
export function monthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/**
 * 월을 delta만큼 옮긴다(음수 가능). 연 경계를 넘나든다.
 *
 * `new Date(y, m-1+delta, 1)`에 통째로 맡기지 않고 직접 나눗셈으로 계산하는
 * 이유: 이 함수는 "몇 년 몇 월"이라는 값 자체가 필요하지(달력에 쓸 특정 날짜가
 * 필요한 게 아니지) 굳이 Date를 거칠 이유가 없고, 음수 month % 12 처리를
 * 명시적으로 다뤄야 (2026,1,-1) 같은 경계를 확실히 검증할 수 있다.
 */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const yearOffset = Math.floor(zeroBased / 12);
  const newMonthZeroBased = ((zeroBased % 12) + 12) % 12;
  return { year: year + yearOffset, month: newMonthZeroBased + 1 };
}

export interface MonthGridCell {
  /** 'YYYY-MM-DD' */
  dateKey: string;
  /** todayKey보다 이전이거나 maxKey보다 이후면 true. */
  disabled: boolean;
}

/**
 * 그 달의 달력 그리드. 1일 앞에 그 요일만큼(일요일=0 시작) null을 채운다.
 *
 * 로컬 Date 생성자만 쓴다(tripDate.ts 상단 주석의 타임존 규칙과 같은 이유 —
 * 문자열 파싱/UTC 계열은 실행 환경 타임존에 따라 다른 날짜를 가리킬 수 있다).
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayKey: string,
  maxKey: string,
): (MonthGridCell | null)[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (MonthGridCell | null)[] = new Array(leadingBlanks).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(new Date(year, month - 1, day));
    cells.push({
      dateKey,
      disabled: dateKey < todayKey || dateKey > maxKey,
    });
  }

  return cells;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 각 일차의 실제 날짜 라벨. `day.day` 필드(배열 인덱스가 아니라)로 계산한다 —
 * days가 [{day:1}, {day:3}]처럼 불연속이면 2일차 없이 3일차가 바로 오고,
 * 3일차 날짜는 인덱스(1)가 아니라 day 값(3)으로 startDateKey + 2일이어야 한다.
 */
export function dayDateLabels(
  days: ScheduleDay[],
  startDateKey: string,
): { day: number; label: string }[] {
  const startDate = fromDateKey(startDateKey);
  return days.map(day => {
    const date = addDays(startDate, day.day - 1);
    const weekday = WEEKDAY_LABELS[date.getDay()];
    return {
      day: day.day,
      label: `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`,
    };
  });
}
