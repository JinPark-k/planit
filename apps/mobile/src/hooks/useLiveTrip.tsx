import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus, PermissionsAndroid, Platform } from 'react-native';
import {
  endLiveTrip,
  getLiveTripCapability,
  refreshLiveTrip,
  startLiveTrip,
} from '../native/liveTrip';
import { LiveTripCapability } from '../native/types';
import { scheduleTitle } from '../screens/schedule.format';
import {
  ActiveTrip,
  clearActiveTrip,
  getActiveTrip,
  setActiveTrip as saveActiveTrip,
} from '../storage/activeTrip';
import type { SavedTrip } from '../storage/savedTrips';
import { buildFrames, frameAt, LiveTripFrame, nextFrameAt } from '../trip/liveFrames';
import { buildTimeline } from '../trip/liveTimeline';

const UNAVAILABLE_CAPABILITY: LiveTripCapability = {
  supported: false,
  allowed: false,
  statusBar: false,
  reason: 'UNAVAILABLE',
};

const NO_PLACE_ERROR = '담긴 장소가 없어 여행을 시작할 수 없어요.';
const INVALID_SCHEDULE_ERROR =
  '이 여행은 시작할 수 없어요. 일정 시각 정보가 올바르지 않습니다.';

/** 안드로이드 13(API 33)부터 알림 권한을 명시적으로 요청해야 한다. */
const NOTIFICATION_PERMISSION_API_LEVEL = 33;

/** setTimeout이 지연값으로 받을 수 있는 최댓값(2^31 - 1 ms, 약 24.8일). */
const MAX_TIMEOUT_MS = 2147483647;

interface LiveTripValue {
  activeTrip: ActiveTrip | null;
  /** 지금 이 순간 잠금화면(과 인앱 배너)에 보여줄 프레임. 진행 중이 아니면 undefined. */
  frame: LiveTripFrame | undefined;
  capability: LiveTripCapability;
  starting: boolean;
  error?: string;
  startTrip(trip: SavedTrip, startDateKey: string): Promise<boolean>;
  endTrip(): Promise<void>;
}

const LiveTripContext = createContext<LiveTripValue | null>(null);

/**
 * 여행 진행 상태(activeTrip)와 지금 보여줄 프레임을 앱 전역에서 하나로 관리한다.
 *
 * App.tsx 최상위(탭 바깥)에서 감싸야 한다 — 어느 탭에 있든 AppState 갱신과
 * 프레임 전환 타이머가 계속 돌아야 하기 때문이다. 탭 하나짜리 스택 안에 두면
 * 다른 탭을 보는 동안 타이머가 멈춘다.
 */
export function LiveTripProvider({ children }: { children: React.ReactNode }) {
  const [activeTrip, setActiveTripState] = useState<ActiveTrip | null>(null);
  const [frame, setFrame] = useState<LiveTripFrame | undefined>(undefined);
  const [capability, setCapability] = useState<LiveTripCapability>(
    UNAVAILABLE_CAPABILITY,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /**
   * AppState가 active로 돌아올 때마다 아래 3번 effect(프레임 재계산)를 다시
   * 돌리기 위한 트리거. activeTrip 자체는 안 바뀌어도, 앱이 백그라운드에 있는
   * 동안 시간이 흘러 프레임이 바뀌었을 수 있어 재계산이 필요하다.
   */
  const [tick, setTick] = useState(0);

  // 1. 마운트 시 1회: activeTrip/capability 초기값을 불러온다.
  useEffect(() => {
    let cancelled = false;

    getActiveTrip()
      .then(trip => {
        if (!cancelled) setActiveTripState(trip);
      })
      .catch(() => {
        if (!cancelled) setActiveTripState(null);
      });

    // getLiveTripCapability()는 설계상 절대 throw하지 않지만, 마운트 시점
    // 초기 로드라 실패해도 화면이 멈추면 안 돼서 방어적으로 한 번 더 감싼다.
    getLiveTripCapability()
      .then(cap => {
        if (!cancelled) setCapability(cap);
      })
      .catch(() => {
        if (!cancelled) setCapability(UNAVAILABLE_CAPABILITY);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. AppState 리스너: 앱이 다시 포그라운드로 돌아오면 네이티브 상태를 동기화한다.
  useEffect(() => {
    const onChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') return;

      refreshLiveTrip()
        .then(() => getLiveTripCapability())
        .then(cap => setCapability(cap))
        .catch(() => {
          // refreshLiveTrip/getLiveTripCapability 둘 다 절대 throw하지 않지만
          // then 체인으로 이어붙였으니 방어적으로 잡아 둔다.
        });

      // 프레임도 다시 계산해야 한다 — 3번 effect가 이 값을 deps로 본다.
      setTick(previous => previous + 1);
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  const endTrip = useCallback(async (): Promise<void> => {
    // 절대 throw 안 함(native/liveTrip.ts 철학과 동일).
    await endLiveTrip();

    try {
      await clearActiveTrip();
    } catch {
      // AsyncStorage는 이론상 실패할 수 있다. 실패해도 로컬 state는 정리해서
      // 화면이 "여전히 진행 중"인 채로 멈추지 않게 한다.
    }

    setActiveTripState(null);
    setFrame(undefined);
  }, []);

  // 3. 프레임 재계산 + 다음 전환 타이머. activeTrip이 바뀌거나(여행 시작/종료)
  // 앱이 다시 활성화될 때(tick) 다시 돈다.
  useEffect(() => {
    if (!activeTrip) {
      setFrame(undefined);
      return;
    }

    const stops = buildTimeline(activeTrip.days, activeTrip.startDateKey);
    const frames = buildFrames(stops);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // 매 프레임 전환마다 정확히 그 시각에 다음 전환까지의 타이머를 다시 건다.
    // 1초 폴링이 아니라, 이벤트(프레임 경계)가 일어날 시각에만 깨어난다.
    const step = () => {
      if (cancelled) return;

      const now = Date.now();
      const current = frameAt(frames, now);
      setFrame(current);

      if (current?.kind === 'END') {
        // 여행이 끝났다 — 더 이상 타이머를 걸 필요 없이 바로 종료 처리한다.
        // endTrip은 내부에서 실패를 전부 삼키므로(절대 throw 안 함) 결과를
        // 기다리거나 처리할 필요가 없다.
        endTrip();
        return;
      }

      const next = nextFrameAt(frames, now);
      if (next !== undefined) {
        // setTimeout의 지연값은 32비트 부호 있는 정수라 약 24.8일을 넘기면
        // 오버플로해서 "즉시 실행"으로 접힌다. 시작 날짜는 최대 90일 뒤까지
        // 고를 수 있어서(StartDatePicker) 실제로 도달하는 값이고, 그대로 두면
        // step이 즉시 재귀해 같은 값으로 다시 걸리는 무한 루프가 된다.
        // 상한에서 한 번 깨어나 다시 계산하면 그 뒤는 남은 시간으로 정상 동작한다.
        timer = setTimeout(step, Math.min(next - now, MAX_TIMEOUT_MS));
      }
    };

    step();

    return () => {
      // 비동기 재귀(step -> setTimeout -> step) 도중 언마운트되거나
      // activeTrip이 바뀌면, 이미 걸린 타이머가 옛 frames를 참조한 채로
      // 계속 도는 걸 막아야 한다.
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [activeTrip, tick, endTrip]);

  const startTrip = useCallback(
    async (trip: SavedTrip, startDateKey: string): Promise<boolean> => {
      setError(undefined);
      setStarting(true);

      try {
        if (!trip.days.some(day => day.items.length > 0)) {
          setError(NO_PLACE_ERROR);
          return false;
        }

        let frames;
        try {
          const stops = buildTimeline(trip.days, startDateKey);
          frames = buildFrames(stops);
        } catch {
          // parseHHMM이 잘못된 시각 형식에 예외를 던질 수 있다 — 실제로 발생
          // 가능한 데이터 오류다(사람이 아니라 데이터가 잘못된 경우).
          setError(INVALID_SCHEDULE_ERROR);
          return false;
        }

        if (
          Platform.OS === 'android' &&
          Number(Platform.Version) >= NOTIFICATION_PERMISSION_API_LEVEL
        ) {
          try {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
          } catch {
            // 거부/에러 모두 무시하고 계속 진행한다 — 인앱 표시(useLiveTrip이
            // 만드는 배너)는 알림 권한과 무관하게 동작해야 한다.
          }
        }

        const nextActiveTrip: ActiveTrip = {
          tripId: trip.id,
          startDateKey,
          regionLabel: trip.regionLabel,
          days: trip.days,
          startedAt: new Date().toISOString(),
        };
        await saveActiveTrip(nextActiveTrip);
        setActiveTripState(nextActiveTrip);

        await startLiveTrip({
          tripId: trip.id,
          title: scheduleTitle(trip.regionLabel, trip.days.length),
          frames,
        });

        setCapability(await getLiveTripCapability());

        return true;
      } finally {
        // 위 모든 분기가 이미 각자 starting을 정리하지만, 예상 못한 예외까지
        // 대비해 finally로 한 번 더 확실히 되돌린다.
        setStarting(false);
      }
    },
    [],
  );

  return (
    <LiveTripContext.Provider
      value={{ activeTrip, frame, capability, starting, error, startTrip, endTrip }}>
      {children}
    </LiveTripContext.Provider>
  );
}

/**
 * Provider 밖에서 부르면 명확한 Error를 던진다. 이건 프로그래머 실수(Provider로
 * 감싸는 걸 빠뜨림)를 바로 잡아내기 위한 것이라, native/liveTrip.ts의 "네이티브
 * 실패는 절대 throw하지 않는다"는 철학과는 다르다 — 저긴 런타임 환경 문제라
 * 삼켜야 하고, 여긴 코드 구조 문제라 바로 터뜨려야 디버깅이 쉽다.
 */
export function useLiveTrip(): LiveTripValue {
  const value = useContext(LiveTripContext);
  if (value === null) {
    throw new Error('useLiveTrip은 LiveTripProvider 안에서만 쓸 수 있다');
  }
  return value;
}
