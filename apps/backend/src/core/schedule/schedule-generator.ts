import { resolveTagsForKeywords } from '../keyword-tag';
import { scoreAndSortPlaces } from '../scoring';
import { clusterPlacesByDay } from '../clustering';
import {
  getTravelTime,
  haversineDistanceMeters,
  GeoPoint,
  TravelMode,
} from '../travel-time';
import {
  DayStartOverride,
  GenerateScheduleInput,
  Place,
  PlaceCategory,
  ScheduleDay,
  ScheduleItem,
} from './schedule.types';

// TODO: 실제 데이터로 튜닝 (DEFAULT_SCORING_WEIGHTS와 동일한 성격의 MVP 가정치)
const DEFAULT_VISIT_DURATION_MINUTES: Record<PlaceCategory, number> = {
  SIGHTSEEING: 90,
  FOOD: 60,
  ACTIVITY: 120,
};

const DAY_START_TIME = '09:00';
const LUNCH_WINDOW_EARLIEST = '12:00';
const DINNER_WINDOW_EARLIEST = '18:00';

/**
 * 일정 생성 파이프라인. LLM 미사용, 규칙 기반.
 * 1) 키워드 -> 태그 매핑으로 필터링
 * 2) 스코어링 (태그 일치도 + 인기도 + 평점)
 * 3) 그리디 지역 클러스터링으로 일차별 그룹 분리
 * 4) 카테고리 + 시간대 기준 일차 내 순서 배치
 * 출력은 스케줄표 데이터(장소명/시간/이동시간)만. 문장/설명 생성 없음.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleDay[] {
  const keywordTags = resolveTagsForKeywords(input.keywords);
  const scored = scoreAndSortPlaces(input.candidatePlaces, keywordTags);

  const dayClusters = clusterPlacesByDay(
    scored.map(({ place }) => place),
    input.dayCount,
  );

  return dayClusters.map((cluster) => ({
    day: cluster.day,
    items: orderWithinDay(
      cluster.places,
      input.travelMode,
      input.dayStartOverrides?.[cluster.day],
    ),
  }));
}

function parseClock(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function nearestPlace<T extends Place>(pool: T[], from: GeoPoint | null): T {
  if (!from) {
    return pool[0];
  }
  return pool.reduce((closest, candidate) =>
    haversineDistanceMeters(from, candidate.location) <
    haversineDistanceMeters(from, closest.location)
      ? candidate
      : closest,
  );
}

/**
 * 카테고리(관광/맛집/액티비티) + 시간대 기준으로 일차 내 순서를 배치한다.
 * 점심/저녁 시간대에 FOOD 장소를 앵커로 배치하고, 그 사이 구간은 최근접 이동으로 채운다.
 * startOverride가 있으면(숙소/기차역 등) 그 지점부터 첫 장소까지의 이동시간을 계산에 반영하고,
 * 없으면 스코어 1위 장소부터 시작한다 (오버라이드 지점 자체는 일정 아이템으로 표시되지 않음).
 */
function orderWithinDay(
  places: Place[],
  travelMode: TravelMode,
  startOverride?: DayStartOverride,
): ScheduleItem[] {
  if (places.length === 0) {
    return [];
  }

  const food = places.filter((p) => p.category === 'FOOD');
  const lunchPlace = food[0];
  const dinnerPlace = food[1];
  let remaining = places.filter((p) => p !== lunchPlace && p !== dinnerPlace);

  let clock = parseClock(startOverride?.time ?? DAY_START_TIME);
  let currentLocation: GeoPoint | null = startOverride?.location ?? null;
  const items: ScheduleItem[] = [];

  const placeNext = (place: Place): void => {
    const travelFromPreviousMinutes = currentLocation
      ? getTravelTime(currentLocation, place.location, travelMode).minutes
      : undefined;
    if (travelFromPreviousMinutes !== undefined) {
      clock += travelFromPreviousMinutes;
    }
    items.push({
      place,
      startTime: formatClock(clock),
      travelFromPreviousMinutes,
    });
    clock += DEFAULT_VISIT_DURATION_MINUTES[place.category];
    currentLocation = place.location;
  };

  const drainUntil = (clockLimit: number | null): void => {
    while (
      remaining.length > 0 &&
      (clockLimit === null || clock < clockLimit)
    ) {
      const next = nearestPlace(remaining, currentLocation);
      placeNext(next);
      remaining = remaining.filter((p) => p !== next);
    }
  };

  // 오전
  drainUntil(parseClock(LUNCH_WINDOW_EARLIEST));

  // 점심 앵커
  if (lunchPlace) {
    if (clock < parseClock(LUNCH_WINDOW_EARLIEST)) {
      clock = parseClock(LUNCH_WINDOW_EARLIEST);
    }
    placeNext(lunchPlace);
  }

  // 오후
  drainUntil(parseClock(DINNER_WINDOW_EARLIEST));

  // 저녁 앵커
  if (dinnerPlace) {
    if (clock < parseClock(DINNER_WINDOW_EARLIEST)) {
      clock = parseClock(DINNER_WINDOW_EARLIEST);
    }
    placeNext(dinnerPlace);
  }

  // 저녁 이후 (상한 없이 소진) — TODO: 하루 최대 일정 수/마감 시각 제한 도입 검토
  drainUntil(null);

  return items;
}
