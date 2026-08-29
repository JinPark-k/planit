import { formatMinutes } from './schedule.format';

/**
 * 일정에서 상세로 들어왔을 때의 방문 맥락.
 *
 * 장소 자체의 속성이 아니라 "이 일정에서 언제 가는지"라 Place와 분리한다.
 * 나중에 추천 목록 같은 다른 진입점이 생기면 그쪽에서는 이 값이 없다.
 */
export interface VisitContext {
  day: number;
  /** HH:MM */
  startTime: string;
  stayMinutes: number;
}

/** "2일차 · 14:30 도착 · 1시간 30분 머무름" */
export function formatVisit(visit: VisitContext): string {
  const stay = formatMinutes(visit.stayMinutes);
  return `${visit.day}일차 · ${visit.startTime} 도착 · ${stay} 머무름`;
}

/**
 * 전화 걸기용 tel: URL. 걸 수 있는 숫자가 없으면 undefined.
 *
 * TourAPI에서 번호는 축제 레코드에만 실려 온다(areaBasedList2는 tel을 비워 보내고
 * detailCommon2만 채운다 — 2026-08 실측 900건 중 12건, 전부 축제).
 * 그 12건은 '051-715-6884' / '1522-2295' 형태로 깨끗했지만, 원본이 정제되지 않은
 * 자유 입력 필드라 안내문이나 복수 번호가 섞여도 앱이 죽지 않게 방어한다.
 */
export function telHref(tel: string): string | undefined {
  // 번호가 여러 개면 쉼표/슬래시/줄바꿈으로 이어 붙여 오므로 첫 번호만 건다.
  // 이어 붙인 채로 숫자만 남기면 두 번호가 한 덩어리가 되어 걸리지 않는다.
  const first = tel.split(/[,/\n]/)[0];
  const dialable = first.replace(/[^\d+#*-]/g, '');
  return /\d/.test(dialable) ? `tel:${dialable}` : undefined;
}
