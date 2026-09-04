import { Festival } from '../api/types';

/**
 * 개최 기간 표시.
 *
 * 이 문구가 이 화면에서 가장 중요하다. 일정은 "1일차/2일차"라는 상대 표기만
 * 쓰고 절대 날짜를 잡지 않기 때문에, 사용자가 이 날짜를 보고 자기 달력을
 * 맞춘다. 날짜가 안 보이면 축제를 앵커로 삼는다는 설계 자체가 성립하지 않는다.
 */
export function festivalPeriod(festival: Festival): string {
  const { startDate, endDate } = festival;
  if (startDate === endDate) return `${monthDay(startDate)} 하루`;

  const start = monthDay(startDate);
  const end = sameYear(startDate, endDate) ? monthDay(endDate) : endDate;
  return `${start} ~ ${end}`;
}

/**
 * 남은 시간 안내. 카드에서 기간과 함께 보여준다.
 *
 * 진행 중인 축제는 "언제 끝나는가"가, 예정된 축제는 "언제 시작하는가"가
 * 사용자가 실제로 궁금해하는 값이다.
 */
export function festivalTiming(festival: Festival, today: string): string {
  if (festival.ongoing) {
    const left = daysBetween(today, festival.endDate);
    if (left <= 0) return '오늘까지';
    if (left === 1) return '내일까지';
    return `${left}일 남음`;
  }

  const until = daysBetween(today, festival.startDate);
  if (until <= 0) return '오늘 시작';
  if (until === 1) return '내일 시작';
  if (until < 7) return `${until}일 뒤`;
  if (until < 30) return `${Math.floor(until / 7)}주 뒤`;
  return `${Math.floor(until / 30)}개월 뒤`;
}

/**
 * 상설 프로그램인지. 카드에서 "축제"가 아니라 상시 운영으로 읽히도록 구분한다.
 *
 * 31일을 경계로 삼은 이유: 전국 274건 중 55건이 31일 이상인데(2026-09-04 실측),
 * 이들은 연중 전시나 주말 상설 공연이라 "그때만 열린다"는 성격이 없다.
 */
export const LONG_RUNNING_DAYS = 31;

export function isLongRunning(festival: Festival): boolean {
  return festival.durationDays >= LONG_RUNNING_DAYS;
}

/** 'YYYY-MM-DD' -> 'M월 D일' */
function monthDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function sameYear(a: string, b: string): boolean {
  return a.slice(0, 4) === b.slice(0, 4);
}

/** 두 'YYYY-MM-DD' 사이의 일수. b가 나중이면 양수. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** 한국 기준 오늘. 서버와 같은 기준을 쓰지 않으면 "오늘까지"가 어긋난다. */
export function todayInKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
