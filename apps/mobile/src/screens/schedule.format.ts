import { ScheduleDay, ScheduleItem } from '../api/types';

/** 탭 선택값. 'ALL'이면 전체 보기, 숫자면 그 일차만. */
export type DayTab = 'ALL' | number;

/** 분을 "7시간 30분" 형태로. 1시간 미만이면 "45분", 0이면 "0분". */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

/** 체류 + 이동. 화면이 "총 소요 시간 ... (이동 포함)"으로 쓴다. */
export function totalMinutes(days: ScheduleDay[]): number {
  return days.reduce(
    (sum, day) =>
      sum +
      day.items.reduce(
        (daySum, item) =>
          daySum + item.stayMinutes + (item.travelFromPreviousMinutes ?? 0),
        0,
      ),
    0,
  );
}

export function filterByTab(days: ScheduleDay[], tab: DayTab): ScheduleDay[] {
  if (tab === 'ALL') return days;
  return days.filter(day => day.day === tab);
}

export type ScheduleRow =
  | { kind: 'dayHeader'; key: string; day: number }
  | {
      kind: 'item';
      key: string;
      /**
       * 몇 일차의 항목인지. ScheduleItem 자체에는 일차가 없어서(응답이 day별로
       * 묶여 온다) 평평하게 편 뒤에는 되찾을 수 없다. 상세 화면에 방문 맥락을
       * 넘길 때 필요해 여기서 같이 들고 나간다.
       */
      day: number;
      item: ScheduleItem;
      /** 일차 안에서의 마지막 아이템인지. 타임라인 세로선을 끊는 데 쓴다. */
      isLastOfDay: boolean;
    };

/**
 * 일차 구분 헤더를 끼운 평평한 행 목록.
 *
 * 헤더는 여러 일차를 한 번에 볼 때만 의미가 있어서, 보이는 일차가 하나면 넣지 않는다
 * (탭에 이미 "1일차"라고 쓰여 있다).
 */
export function toScheduleRows(days: ScheduleDay[]): ScheduleRow[] {
  const withHeaders = days.length > 1;
  const rows: ScheduleRow[] = [];
  for (const day of days) {
    if (withHeaders) {
      rows.push({ kind: 'dayHeader', key: `day-${day.day}`, day: day.day });
    }
    day.items.forEach((item, index) => {
      rows.push({
        kind: 'item',
        // 같은 장소가 다른 일차에 다시 나올 수 있어 일차와 순서를 키에 넣는다.
        key: `item-${day.day}-${index}-${item.place.id}`,
        day: day.day,
        item,
        isLastOfDay: index === day.items.length - 1,
      });
    });
  }
  return rows;
}

/** "제주 3일 일정" */
export function scheduleTitle(regionLabel: string, dayCount: number): string {
  return `${regionLabel} ${dayCount}일 일정`;
}
