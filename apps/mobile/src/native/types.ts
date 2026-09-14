import type { LiveTripFrame } from '../trip/liveFrames';

/**
 * 네이티브 경계로 넘기는 프레임 하나. trip/liveFrames.ts의 LiveTripFrame과
 * 구조가 같아야 한다 — buildFrames()가 만든 프레임을 그대로 넘기기 때문이다.
 * 이 파일은 네이티브 모듈 시그니처 전용이라 도메인 로직(trip/*)과 별개로 둔다.
 */
export interface LiveTripFramePayload {
  at: number;
  kind: 'SHOW' | 'HIDE' | 'END';
  title?: string;
  body?: string;
  shortText?: string;
  segments?: { minutes: number; filled: boolean }[];
  progressMax?: number;
  progressAt?: number;
  progressPerMinute?: number;
}

export interface LiveTripPlan {
  tripId: string;
  title: string;
  frames: LiveTripFramePayload[];
}

export interface LiveTripCapability {
  supported: boolean;
  allowed: boolean;
  statusBar: boolean;
  reason?: 'OS_TOO_OLD' | 'PERMISSION_DENIED' | 'PROMOTION_DISABLED' | 'UNAVAILABLE';
}

/**
 * LiveTripFramePayload(네이티브 경계용)와 LiveTripFrame(trip/liveFrames.ts)은
 * 구조적으로 같아야 한다. buildFrames()가 만든 프레임을 그대로 네이티브로
 * 넘기기 때문이다. 여기서 타입 에러가 나면 두 선언이 갈린 것 — 절대 호출되지
 * 않는 함수지만, export해서 dead code 경고 없이 컴파일 시점 검증 역할만 한다.
 */
export function _assertLiveTripFramePayloadShape(
  frame: LiveTripFrame,
): LiveTripFramePayload {
  return frame;
}
export function _assertLiveTripFrameShape(
  payload: LiveTripFramePayload,
): LiveTripFrame {
  return payload;
}
