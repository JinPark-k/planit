/**
 * 여행 진행 중 잠금화면 표시에 쓰는 날짜/시각 유틸.
 *
 * 이 파일은 반드시 `new Date(y, monthIndex, d, hh, mm)` 형태의 로컬 생성자만 쓴다.
 * `new Date('YYYY-MM-DD')` 같은 문자열 파싱이나 `Date.UTC`/`getUTC*` 기반 계산은
 * 절대 쓰지 않는다. CI는 ubuntu(TZ=UTC)에서 돌고 개발자 머신은 KST라서, 같은
 * "2026-03-02"도 문자열 파싱(UTC 자정)과 로컬 생성자(KST 자정)가 서로 다른 절대
 * 시각(epoch ms)을 가리킨다. 여행 일정은 사용자가 보는 "벽시계 시각" 기준이므로
 * 실행 환경 타임존을 그대로 따르는 로컬 생성자만 써야 어느 환경에서 돌려도 같은
 * 결과가 나온다.
 */

export interface HHMM {
  hours: number;
  minutes: number;
}

/**
 * "9:30" / "09:30" -> { hours: 9, minutes: 30 }.
 *
 * 형식이 잘못되면 기본값으로 조용히 넘기지 않고 예외를 던진다. 이 값은 항상 백엔드가
 * 내려주는 ScheduleItem.startTime에서 온다 — 형식이 깨졌다면 그 자체가 데이터 문제라,
 * 자정 같은 기본값으로 슬쩍 넘어가면 사용자에게 엉뚱한 시각이 표시되는 채로 원인이
 * 묻힌다. 호출부에서 바로 터지는 편이 디버깅에 낫다.
 */
export function parseHHMM(value: string): HHMM {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`잘못된 시각 형식: "${value}"`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`잘못된 시각 형식: "${value}"`);
  }

  return { hours, minutes };
}

/** 로컬 기준 'YYYY-MM-DD'. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 'YYYY-MM-DD'가 가리키는 날짜의 로컬 00:00. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * days만큼 날짜를 더한다(음수 가능). 시/분/초는 그대로 보존한다.
 *
 * day 인자에 범위를 넘는 값(예: 32)을 넣어도 JS Date 생성자가 알아서 다음 달로
 * 넘겨 계산해 준다 — 그래서 월/연 경계나 윤년을 따로 분기할 필요가 없다.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** date와 같은 날짜에서, hhmm("HH:MM")이 가리키는 로컬 시각. */
export function atLocalTime(date: Date, hhmm: string): Date {
  const { hours, minutes } = parseHHMM(hhmm);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}
