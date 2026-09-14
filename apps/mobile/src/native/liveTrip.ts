import { Platform } from 'react-native';
import * as LiveActivity from './LiveActivity';
import * as LiveUpdate from './LiveUpdate';
import { LiveTripCapability, LiveTripPlan } from './types';

const UNAVAILABLE_CAPABILITY: LiveTripCapability = {
  supported: false,
  allowed: false,
  statusBar: false,
  reason: 'UNAVAILABLE',
};

/** Platform.OS에 맞는 네이티브 파사드. 둘 다 아니면(웹 등) undefined. */
function nativeModule(): typeof LiveUpdate | typeof LiveActivity | undefined {
  if (Platform.OS === 'android') return LiveUpdate;
  if (Platform.OS === 'ios') return LiveActivity;
  return undefined;
}

/**
 * 화면/훅은 반드시 이 파일만 import한다(LiveUpdate/LiveActivity를 직접 쓰지 않는다).
 *
 * 여기서 만든 네 함수는 전부 절대 throw하지 않는다. 지금 네이티브는 안드로이드는
 * NOT_IMPLEMENTED로 reject하고 iOS는 모듈 자체가 없어서 실패하는데, 그래도
 * useLiveTrip이 만드는 인앱 배너는 네이티브와 무관하게 계속 동작해야 한다 —
 * kakaoMapDeepLink.ts의 "열어 보고 실패하면 폴백" 철학과 같다: 네이티브 표시는
 * 있으면 좋은 부가 기능이지, 실패했다고 앱 기능 전체가 죽으면 안 된다.
 */
export async function startLiveTrip(plan: LiveTripPlan): Promise<void> {
  try {
    await nativeModule()?.start(plan);
  } catch {
    // 네이티브 미구현/실패를 조용히 삼킨다 — 인앱 배너는 이 결과와 무관하게 뜬다.
  }
}

export async function refreshLiveTrip(): Promise<void> {
  try {
    await nativeModule()?.refresh();
  } catch {
    // 위와 같은 이유로 삼킨다.
  }
}

export async function endLiveTrip(): Promise<void> {
  try {
    await nativeModule()?.end();
  } catch {
    // 위와 같은 이유로 삼킨다.
  }
}

export async function getLiveTripCapability(): Promise<LiveTripCapability> {
  try {
    return (await nativeModule()?.getCapability()) ?? UNAVAILABLE_CAPABILITY;
  } catch {
    return UNAVAILABLE_CAPABILITY;
  }
}
