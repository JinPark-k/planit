/**
 * TourAPI detailIntro2의 playtime 문자열에서 운영 시각을 뽑는다.
 *
 * 형식이 정해져 있지 않다. 실측(2026-09-13, 축제 40건 전부 playtime 있음):
 *
 *   11:00~22:00                            단순 구간 (대부분)
 *   09:00 ~ 17:00 (프로그램별 상이)          공백과 꼬리말
 *   10:00~17:00(무료시식 및 즐길거리)         붙은 꼬리말
 *   1부 - 18:20~20:10 / 2부 - 19:30~21:20   회차 분리
 *   - 하절기(3월~9월) 20:00, 22:00- 동절기…  계절별. 구간이 아니라 시각 나열
 *   변동                                    시각 없음
 *
 * 그래서 구조를 해석하려 들지 않는다. 등장하는 모든 HH:MM을 모아 가장 이른 것을
 * 개장, 가장 늦은 것을 폐장으로 본다. 회차가 나뉘어도 "그 시간대 안에 열려 있다"는
 * 근사로는 맞고, 일정 배치에는 그 정도면 충분하다.
 *
 * 시각을 하나도 못 찾으면 null을 돌려준다. 모르는 것을 아는 척해 잘못된 제약을
 * 거는 것보다, 제약 없이 두는 편이 낫다.
 */
export interface Playtime {
  /** 자정 기준 분. 09:00 -> 540 */
  openMinutes: number;
  /** 개장보다 늦을 때만 채운다. 아니면 undefined. */
  closeMinutes?: number;
}

/** 24:00을 쓰는 표기가 있어 24시까지 허용한다. 그 이상은 시각이 아니다. */
const TIME_PATTERN = /\b([01]?\d|2[0-4]):([0-5]\d)\b/g;

export function parsePlaytime(raw: string | null | undefined): Playtime | null {
  if (!raw) return null;

  // HTML 태그와 엔티티가 섞여 오는 경우가 있다(<br>, &nbsp; 등).
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/&#\d+;/g, ' ');

  const minutes: number[] = [];
  for (const match of text.matchAll(TIME_PATTERN)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    minutes.push(hour * 60 + minute);
  }
  if (minutes.length === 0) return null;

  const openMinutes = Math.min(...minutes);
  const latest = Math.max(...minutes);

  return latest > openMinutes
    ? { openMinutes, closeMinutes: latest }
    : { openMinutes };
}

/** 'HH:MM' 형식. DB의 time 컬럼에 넣는다. */
export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
