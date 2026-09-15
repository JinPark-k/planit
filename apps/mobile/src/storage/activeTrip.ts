import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScheduleDay } from '../api/types';

const STORAGE_KEY = '@planit/active-trip:v1';

/** 지금 진행 중인 여행 하나. 잠금화면 표시(trip/liveFrames.ts)의 원본 데이터. */
export interface ActiveTrip {
  /** SavedTrip.id */
  tripId: string;
  /** 'YYYY-MM-DD' */
  startDateKey: string;
  regionLabel: string;
  days: ScheduleDay[];
  /** ISO */
  startedAt: string;
}

export async function getActiveTrip(): Promise<ActiveTrip | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isActiveTrip(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 여행 하나만 저장한다 — 새로 시작하면 이전 값을 덮어쓴다(동시에 진행 중인 여행은
 * 하나뿐이라는 전제).
 *
 * days는 저장 시점 스냅샷으로 깊은 복사해 둔다. 원본 SavedTrip을 참조로 들고 있으면
 * 사용자가 나중에 그 저장된 일정을 수정/삭제할 때 이미 시작한 여행의 잠금화면
 * 표시까지 덩달아 바뀌거나 깨진다 — 여행을 시작한 순간의 일정으로 고정해야 한다.
 */
export async function setActiveTrip(trip: ActiveTrip): Promise<void> {
  const snapshot: ActiveTrip = {
    ...trip,
    days: JSON.parse(JSON.stringify(trip.days)) as ScheduleDay[],
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function clearActiveTrip(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

function isActiveTrip(value: unknown): value is ActiveTrip {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ActiveTrip>;
  return (
    typeof candidate.tripId === 'string' &&
    typeof candidate.startDateKey === 'string' &&
    typeof candidate.regionLabel === 'string' &&
    Array.isArray(candidate.days) &&
    typeof candidate.startedAt === 'string'
  );
}
