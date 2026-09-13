import { resolveTagsForKeywords } from '../keyword-tag';
import { scoreAndSortPlaces } from '../scoring';
import { clusterPlacesByDay } from '../clustering';
import { getTravelTime, GeoPoint, TravelMode } from '../travel-time';
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
const CAFE_WINDOW_EARLIEST = '14:00';
const DINNER_WINDOW_EARLIEST = '18:00';
/**
 * 하루 일정 마감 시각. 이 시각 이후로는 새 장소를 배치하지 않는다.
 *
 * 상한이 없으면 그날 클러스터의 후보를 전부 밀어넣어 하루 465곳 같은 결과가 나오고,
 * formatClock의 24시간 랩어라운드 때문에 시각이 23:07 -> 00:09로 되돌아가
 * 형식만 멀쩡하고 의미는 없는 일정이 만들어진다(실데이터로 확인).
 * 후보에 다 담지 못한 장소는 그냥 제외한다 — 하루에 소화 가능한 만큼만 추천한다.
 */
const DAY_END_TIME = '21:00';

/**
 * 다음 장소를 고를 때 관련도(키워드 스코어)와 근접성(이동시간)에 주는 가중치.
 *
 * 예전엔 순수 최근접(nearest neighbor)으로만 골랐는데, 그러면 첫 장소만 스코어가 반영되고
 * 그 뒤로는 스코어가 완전히 무시된다. 실데이터(제주)에서 '자연'과 '문화예술'의 일정이
 * 첫 장소만 다르고 나머지는 동일하게 나온 원인이 이것이다 — 후보가 밀집해 있으면
 * 키워드와 무관한 바로 옆 장소가 항상 이긴다.
 *
 * 관련도만 보면 반대로 하루 종일 섬 반대편까지 이동하는 일정이 나오므로 둘을 합산한다.
 * 관련도 0.4 / 근접성 0.6 + 최대 이동 40분 기준이면,
 * "관련도 최상위 후보를 위해 최대 ~26분(=0.4/0.6*40)까지는 더 이동한다"는 정책이 된다.
 */
const RELEVANCE_WEIGHT = 0.4;
const PROXIMITY_WEIGHT = 1 - RELEVANCE_WEIGHT;
/** 이 시간 이상 걸리는 이동은 전부 똑같이 최악(근접성 0)으로 본다. */
const MAX_REASONABLE_TRAVEL_MINUTES = 40;

/**
 * 이동 한 구간(직전 장소 -> 이 장소)이 이 시간을 넘으면 그 장소를 아예 배치하지 않는 상한(분).
 *
 * MAX_REASONABLE_TRAVEL_MINUTES(40분)와는 용도가 다르다. 그건 다음 장소를 고르는
 * 스코어링에서 근접성 점수를 1->0으로 깎는 용도일 뿐 이동 자체를 막지 않는다.
 * 이 상수는 그 이동을 실행할지 말지를 결정하는 하드 상한이다.
 *
 * 값은 실측으로 정했다. 12개 지역에서 3일 일정을 생성해 이동 구간 232개를 실측한 결과:
 *   p50 3분 / p90 19분 / p95 31분, 정상 구간 최대 90분(충북) -> 그다음 값 220분 -> 최대 586분.
 * 90분과 220분 사이에는 구간이 하나도 없다 (232개 중 11개=4.7%가 220분 이상).
 * 220분대 이상은 TourAPI 원본 좌표 오류(주소는 맞는 지역인데 좌표가 다른 지역을 가리킴)로
 * 생긴 값이라 실제 이동시간이 아니다. 좌표 데이터 자체를 고치는 건 이번 범위가 아니므로
 * 여기서 상한으로 걸러낸다. 120분은 정상 구간 최대(90)와 쓰레기 구간 최소(220) 사이에서
 * 양쪽에 넉넉한 여유를 둔 값이다.
 */
const MAX_TRAVEL_LEG_MINUTES = 120;

/**
 * 후보 중 "가장 가까운 다른 후보까지의 이동시간조차 MAX_TRAVEL_LEG_MINUTES를 넘는" 장소를
 * 클러스터링 전에 걸러낸다.
 *
 * 이런 장소는 좌표가 어디에 놓이든 상한에 걸린다 — 어디서 출발해도 거기 도착 못 하고,
 * 거기서 출발해도 아무 데도 못 간다. clusterPlacesByDay가 이런 장소를 하루의 시드로
 * 앉히면, orderWithinDay의 이동 상한(withinTravelCap)이 정상 동작해도 그 뒤로는 두
 * 번째 장소부터 계속 상한에 걸려 하루가 1곳으로 끝난다(실데이터: SEOUL [9,7,9] ->
 * [9,1,9], GYEONGNAM [9,5,9] -> [9,1,9], JEONBUK [9,2,2] -> [9,1,1], 전부 그날의
 * 시작 장소가 좌표 오류였다). 이미 배치 시점에 적용 중인 상한의 논리를 후보 선정
 * 시점에 한 번 더 적용하는 것뿐이다.
 *
 * 실측(운영 DB 30,801건): 가장 가까운 이웃까지도 120분을 넘는 장소는 9건(0.029%) —
 * 789분 라키비움 남해, 535분 국립생물자원관, 524분 건지산, 427분 아크앤북 광안리,
 * 261분 안민고개, 165분 오천서원, 150분 삼각산, 126분 모래미 해변, 126분 송도항.
 * 9건 전부 주소-좌표 불일치로 확인됨(예: 삼각산은 주소가 서울 강북구인데 좌표는 경기
 * 광주 부근). 울릉도/독도/백령도/가거도 같은 실제 도서지역은 하나도 걸리지 않았다 —
 * 섬끼리는 서로 가까워 이웃이 있기 때문. 즉 이 규칙은 진짜 고립 데이터(섬)를 건드리지
 * 않고 좌표 오류만 골라낸다.
 *
 * mustIncludeIds(사용자가 "담기"로 고른 장소)도 예외 없이 이 규칙을 적용한다. 좌표가
 * 틀린 장소는 사용자가 골랐어도 실제로 갈 수 있는 곳이 아니다 — "담았다"는 사실이
 * 나쁜 좌표를 고치지는 않는다. 예외를 두면 그 장소가 클러스터 시드로 앉아 하루를 다시
 * 1곳으로 무너뜨리는 이번 회귀가 그대로 재현된다. core는 제외 이유를 알리지 않지만,
 * schedule.service.ts가 요청과 결과를 대조해 excludedPlaces로 이미 알리고 있다(다른
 * 이유로 빠지는 mustInclude 장소와 동일한 경로).
 *
 * 후보가 2개 이하이면 필터를 건너뛰고 그대로 반환한다. 후보가 1개면 비교 대상이
 * 없어 그 하나가 전부 제외되어 빈 배열이 된다 — 이건 명백히 잘못된 결과다.
 * 후보가 정확히 2개일 때도 같은 문제가 대칭적으로 일어난다: 둘이 서로 상한 밖이면
 * "가장 가까운 이웃"이 서로뿐이라 둘 다 제외되어 역시 빈 배열이 된다. 이 규칙은
 * "주변에 몰려 있는 다수 후보 중 혼자 동떨어진 것"을 찾기 위한 것이라 최소 3개는
 * 있어야 "몰려 있음"과 "동떨어짐"을 구분할 신호가 생긴다 — 2개뿐이면 둘 중 어느 쪽이
 * 이상치인지 판단할 근거가 없다(운영 DB 30,801건 실측에서도 이런 2개짜리 고립 쌍은
 * 나타나지 않았다 — 지역마다 후보가 수백~수천 개이기 때문).
 * O(n^2)이지만 Array.prototype.some이 이웃을 하나라도 찾으면 즉시 중단하므로,
 * 정상 데이터(대부분 근처에 이웃이 있음)에서는 사실상 O(n)에 가깝다.
 */
function excludeIsolatedPlaces(
  places: Place[],
  travelMode: TravelMode,
): Place[] {
  if (places.length <= 2) {
    return places;
  }
  return places.filter((place) =>
    places.some(
      (other) =>
        other !== place &&
        getTravelTime(place.location, other.location, travelMode).minutes <=
          MAX_TRAVEL_LEG_MINUTES,
    ),
  );
}

/**
 * 카페를 끼니(점심/저녁)와 구분하기 위한 태그.
 *
 * TourAPI는 contentTypeId 39를 통째로 FOOD로 주기 때문에 카페/전통찻집도 category가 FOOD다.
 * 카테고리만 보고 끼니 앵커를 고르면 저녁이 베이커리가 된다(제주 FOOD 492곳 중 172곳이 카페).
 * 카테고리를 4개로 늘리는 대신 태그로 구분하는 이유는 DB CHECK 제약과 체류시간 테이블 등
 * PlaceCategory에 묶인 것이 많고, '카페'는 이미 KEYWORD_TAG_MAP에 있는 도메인 어휘이기 때문이다.
 *
 * NOTE: core/는 데이터 소스에 의존하지 않으므로 여기서 infra의 DERIVABLE_TAGS를 import하지 않는다.
 * 이 값이 실제 수집 태그와 일치하는지는 batch/keyword-tag-coverage.spec.ts에서 검증한다.
 */
export const CAFE_TAG = '카페';

/**
 * 일정 생성 파이프라인. LLM 미사용, 규칙 기반.
 * 1) 키워드 -> 태그 매핑으로 필터링
 * 2) 스코어링 (태그 일치도 + 인기도 + 평점)
 * 3) 그리디 지역 클러스터링으로 일차별 그룹 분리
 * 4) 카테고리 + 시간대 + 스코어/거리 가중합으로 일차 내 순서 배치
 * 출력은 스케줄표 데이터(장소명/시간/이동시간)만. 문장/설명 생성 없음.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleDay[] {
  const keywordTags = resolveTagsForKeywords(input.keywords);
  const reachablePlaces = excludeIsolatedPlaces(
    input.candidatePlaces,
    input.travelMode,
  );
  const scored = scoreAndSortPlaces(
    reachablePlaces,
    keywordTags,
    undefined,
    input.weather,
  );

  // 스코어는 클러스터링 이후 순서 배치 단계에서도 필요하므로 id로 들고 다닌다.
  // (Place에 score를 얹으면 응답 DTO까지 새어나가므로 별도 맵으로 유지)
  const scoreById = new Map(
    scored.map(({ place, score }) => [place.id, score]),
  );

  const dayClusters = clusterPlacesByDay(
    scored.map(({ place }) => place),
    input.dayCount,
    { mustIncludeIds: input.mustIncludePlaceIds },
  );

  return dayClusters.map((cluster) => ({
    day: cluster.day,
    items: orderWithinDay(
      cluster.places,
      input.travelMode,
      scoreById,
      input.dayStartOverrides?.[cluster.day],
      input.mustIncludePlaceIds,
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

/**
 * 후보 풀 안에서의 상대 관련도(0~1)를 계산하는 함수를 만든다.
 *
 * 절대 스코어를 그대로 쓰지 않는 이유: 현재 실데이터는 popularity가 전부 0, rating이 전부 0.5라
 * 스코어가 0.1~0.6의 좁은 구간에 몰려 있어서, 고정 가중치로 근접성과 비교하면 관련도가 항상 진다.
 * 풀 단위 min-max 정규화를 하면 스코어 스케일이 바뀌어도(popularity 도입 등) 가중치가 그대로 유효하다.
 *
 * 풀은 배치가 진행되며 줄어들지만 정규화 기준은 처음 한 번만 잡는다
 * (풀이 줄 때마다 다시 잡으면 남은 후보가 하나뿐일 때 관련도가 1로 튀어 비교가 무의미해진다).
 */
function makeRelevance(
  pool: Place[],
  scoreById: ReadonlyMap<string, number>,
): (place: Place) => number {
  let min = Infinity;
  let max = -Infinity;
  for (const place of pool) {
    const score = scoreById.get(place.id) ?? 0;
    if (score < min) min = score;
    if (score > max) max = score;
  }
  const range = max - min;
  // 전원 동점이면 관련도로는 우열을 못 가리므로 근접성만 보게 한다.
  return (place) =>
    range === 0 ? 1 : ((scoreById.get(place.id) ?? 0) - min) / range;
}

/**
 * 카테고리(관광/맛집/액티비티) + 시간대 기준으로 일차 내 순서를 배치한다.
 * 점심/오후 카페/저녁을 시간대 앵커로 배치하고, 그 사이 구간은 관련도+근접성 가중합으로 채운다.
 * startOverride가 있으면(숙소/기차역 등) 그 지점부터 첫 장소까지의 이동시간을 계산에 반영하고,
 * 없으면 스코어 1위 장소부터 시작한다 (오버라이드 지점 자체는 일정 아이템으로 표시되지 않음).
 */
function orderWithinDay(
  places: Place[],
  travelMode: TravelMode,
  scoreById: ReadonlyMap<string, number>,
  startOverride?: DayStartOverride,
  mustIncludePlaceIds?: ReadonlySet<string>,
): ScheduleItem[] {
  if (places.length === 0) {
    return [];
  }

  // FOOD는 끼니/카페 슬롯으로만 쓰고 일반 후보 풀에는 넣지 않는다.
  //
  // 예전엔 앵커로 뽑고 남은 음식점이 일반 풀에 합류했는데, 제주는 후보의 53%가 음식점이고
  // 식당이 밀집해 있어서 탐색이 계속 식당을 집었다. 그 결과 키워드가 '문화예술'이어도
  // 하루 9곳 중 7곳이 음식점이 됐다(실데이터 확인).
  // 하루에 끼니는 두 번이면 충분하므로, 나머지 시간대는 관광/액티비티에서만 고른다.
  const foodPlaces = places.filter((p) => p.category === 'FOOD');
  const cafes = foodPlaces.filter((p) => p.tags.includes(CAFE_TAG));
  const restaurants = foodPlaces.filter((p) => !p.tags.includes(CAFE_TAG));

  // 끼니는 식당에서만 고르고, 카페는 오후 슬롯 1곳으로 따로 뺀다.
  // 다만 그날 후보에 식당이 하나도 없으면 끼니를 통째로 비우는 것보다 카페라도 넣는 게 낫다.
  let mealPool = restaurants.length > 0 ? restaurants : cafes;
  let cafePool = restaurants.length > 0 ? cafes : [];
  let remaining = places.filter((p) => p.category !== 'FOOD');

  // 관련도 정규화는 풀별로 따로 잡는다. 한 기준으로 묶으면 음식점이 상위를 독식하는 지역에서
  // 관광지 관련도가 전부 0으로 눌려 키워드 신호가 사라진다.
  const generalRelevance = makeRelevance(remaining, scoreById);
  const mealRelevance = makeRelevance(mealPool, scoreById);
  const cafeRelevance = makeRelevance(cafePool, scoreById);

  let clock = parseClock(startOverride?.time ?? DAY_START_TIME);
  let currentLocation: GeoPoint | null = startOverride?.location ?? null;
  const items: ScheduleItem[] = [];

  const travelMinutesTo = (place: Place): number =>
    currentLocation
      ? getTravelTime(currentLocation, place.location, travelMode).minutes
      : 0;

  /** 이동시간 0분 -> 1, MAX_REASONABLE_TRAVEL_MINUTES 이상 -> 0. */
  const proximity = (place: Place): number => {
    if (!currentLocation) return 1; // 시작 지점이 없으면 거리 비교 자체가 불가능
    const minutes = Math.min(
      travelMinutesTo(place),
      MAX_REASONABLE_TRAVEL_MINUTES,
    );
    return 1 - minutes / MAX_REASONABLE_TRAVEL_MINUTES;
  };

  const bestByUtility = (
    pool: Place[],
    relevance: (place: Place) => number,
  ): Place | undefined => {
    let best: Place | undefined;
    let bestUtility = -Infinity;
    for (const candidate of pool) {
      const utility =
        RELEVANCE_WEIGHT * relevance(candidate) +
        PROXIMITY_WEIGHT * proximity(candidate);
      if (utility > bestUtility) {
        bestUtility = utility;
        best = candidate;
      }
    }
    return best;
  };

  /**
   * 다음 장소를 고른다.
   *
   * 담은 장소("담기"로 고른 것)가 풀에 남아 있으면 그 안에서만 고른다. 관련도·근접성
   * 비교는 그대로 쓰되, 채움 후보와는 애초에 겨루지 않게 한다 — 겨루게 하면 근접성이
   * 높은 주변 장소가 이겨서 사용자가 고른 곳이 마감 시각에 밀려 빠질 수 있다.
   *
   * 끼니 앵커도 이 함수를 쓰므로 "담은 식당이 있으면 그것, 없으면 자동"이 따로 구현할
   * 것 없이 성립한다.
   */
  const pickNext = (
    pool: Place[],
    relevance: (place: Place) => number,
  ): Place | undefined => {
    if (mustIncludePlaceIds !== undefined) {
      const pinned = pool.filter((p) => mustIncludePlaceIds.has(p.id));
      if (pinned.length > 0) {
        const best = bestByUtility(pinned, relevance);
        // 담은 장소가 마감에 걸리면 채움 후보로 내려가지 않는다. 남은 시간을
        // 주변 장소로 채우면 담은 곳이 더 확실히 빠진다.
        if (best) return best;
      }
    }
    return bestByUtility(pool, relevance);
  };

  const placeNext = (place: Place): void => {
    const travelFromPreviousMinutes = currentLocation
      ? travelMinutesTo(place)
      : undefined;
    if (travelFromPreviousMinutes !== undefined) {
      clock += travelFromPreviousMinutes;
    }
    // 문 열기 전에 도착하면 기다린다. 축제가 앵커라 가장 먼저 배치되는데,
    // 18:00에 여는 야간 행사가 09:00에 들어가는 일이 있었다.
    if (place.opensAt !== undefined && clock < place.opensAt) {
      clock = place.opensAt;
    }
    const stayMinutes = DEFAULT_VISIT_DURATION_MINUTES[place.category];
    items.push({
      place,
      startTime: formatClock(clock),
      stayMinutes,
      travelFromPreviousMinutes,
    });
    clock += stayMinutes;
    currentLocation = place.location;
  };

  const dayEnd = parseClock(DAY_END_TIME);

  /**
   * 마감 시각 이후에는 새 장소를 시작하지 않는다.
   *
   * mustIncludePlaceIds(사용자가 "담기"로 고른 장소)도 예외 없이 이 마감을 적용한다.
   * 조용히 마감을 넘겨 배치하는 것보다 빼는 편이 낫다 — 빠졌다는 사실은
   * schedule.service.ts의 generateFromPlaces가 요청과 결과를 대조해 excludedPlaces로
   * 이미 알리고 있으므로, 사용자에게 조용히 사라지지 않는다.
   *
   * drainUntil/anchor에서 이 조건에 걸리면 그 자리에서 완전히 멈춘다(break / return
   * undefined). 이 조건은 "지금 시각 기준 하루에 남은 시간이 없다"는 뜻이라, remaining/pool의
   * 다른 후보를 봐도 결과가 같다 — clock은 이미 그 지점까지 와 있으므로 다음으로 좋은 후보
   * 역시 대개 마감을 넘긴다. 계속 뒤지는 건 낭비이거나(넘김) 우연히 통과해도 하루 순서를
   * 어지럽힌다.
   */
  const withinDeadline = (place: Place): boolean => arrivalAt(place) <= dayEnd;

  /**
   * 이동 한 구간(직전 장소 -> 이 장소)이 이 시간을 넘으면 그 장소를 배치하지 않는다 —
   * TourAPI 원본 좌표 오류로 인접한 것처럼 보이는 두 장소 사이에 9시간대 이동이 계산되는
   * 사례가 실제로 있었다(예: 국립생물자원관 주소는 인천인데 저장된 좌표는 경북 내륙).
   *
   * drainUntil/anchor에서 이 조건에 걸려도 하루 채움을 멈추면 안 된다 — 이건 "하루에 남은
   * 시간이 없다"는 신호가 아니라 "이 장소 하나의 좌표가 쓰레기"라는 신호이기 때문이다.
   * 실데이터 검증(12개 지역 x 3일 일정)에서 이 구분 없이 canPlace 하나로 합쳐 break/return
   * undefined 하던 이전 구현은 36곳이 통째로 사라지는 회귀를 냈다. 예를 들어 전남은 하루별
   * 장소 수 패턴이 [5, 5, 7]이어야 할 것이 [8, 1, 1]로 무너졌다 — pickNext가 고른 최상위
   * 후보 하나가 좌표 오류로 이 상한에 걸리자, 바로 옆에 멀쩡한 후보가 여럿 남아 있었는데도
   * drainUntil이 하루 채움 루프 전체를 break해버렸기 때문이다. 그래서 이 조건에 걸리면
   * 그 장소 하나만 후보 풀에서 제거하고 다음 최상위 후보로 다시 시도한다 — 절대 멈추지 않는다.
   */
  const withinTravelCap = (place: Place): boolean =>
    travelMinutesTo(place) <= MAX_TRAVEL_LEG_MINUTES;

  /**
   * 그 장소를 실제로 시작하게 되는 시각. 이동시간을 더한 뒤, 아직 문을 열지
   * 않았으면 개장까지 기다린 시각이다.
   *
   * withinDeadline이 이 값을 봐야 하는 이유: 18:00에 여는 축제에 17:00에 도착하면
   * 이동시간만으로는 마감(21:00) 안이지만, 기다린 뒤 체류까지 하면 넘길 수 있다.
   */
  const arrivalAt = (place: Place): number => {
    const arrival = clock + travelMinutesTo(place);
    return place.opensAt !== undefined && arrival < place.opensAt
      ? place.opensAt
      : arrival;
  };

  const drainUntil = (clockLimit: number | null): void => {
    while (
      remaining.length > 0 &&
      (clockLimit === null || clock < clockLimit)
    ) {
      const next = pickNext(remaining, generalRelevance);
      if (!next || !withinDeadline(next)) break;
      if (!withinTravelCap(next)) {
        // 이 후보 하나만 좌표가 쓰레기인 것뿐, 하루가 시간이 없는 게 아니다.
        // 풀에서 제거하지 않으면 다음 루프에서 pickNext가 같은 후보를 또 골라 무한루프가 된다.
        remaining = remaining.filter((p) => p !== next);
        continue;
      }
      placeNext(next);
      remaining = remaining.filter((p) => p !== next);
    }
  };

  /**
   * 시간대 앵커(점심/카페/저녁): earliestTime 이전이면 그 시각까지 기다렸다가 한 곳을 배치한다.
   * latestTime을 주면 이미 그 시각을 지난 경우 슬롯 자체를 건너뛴다
   * (일정이 늦어졌을 때 저녁 시간에 '오후 카페'를 밀어넣지 않기 위함).
   * 배치한 장소를 반환하므로 호출측이 자기 풀에서 제거한다.
   */
  const anchor = (
    pool: Place[],
    relevance: (place: Place) => number,
    earliestTime: string,
    latestTime?: string,
  ): Place | undefined => {
    if (pool.length === 0) return undefined;
    if (latestTime !== undefined && clock >= parseClock(latestTime)) {
      return undefined;
    }
    const earliest = parseClock(earliestTime);
    if (clock < earliest) {
      clock = earliest;
    }
    // 이동 상한에 걸린 후보는 이 로컬 목록에서만 걷어내고 다음 후보를 본다 — 호출측의
    // mealPool/cafePool(outer `pool`)은 건드리지 않는다. 실제로 배치되는 장소만 호출측이
    // (anchor가 반환한 뒤) 자기 풀에서 제거하므로, 여기서 outer pool을 줄이면 안 된다.
    let localPool = pool;
    while (localPool.length > 0) {
      const next = pickNext(localPool, relevance);
      if (!next || !withinDeadline(next)) return undefined;
      if (!withinTravelCap(next)) {
        localPool = localPool.filter((p) => p !== next);
        continue;
      }
      placeNext(next);
      return next;
    }
    return undefined;
  };

  // 오전
  drainUntil(parseClock(LUNCH_WINDOW_EARLIEST));

  // 점심
  const lunch = anchor(mealPool, mealRelevance, LUNCH_WINDOW_EARLIEST);
  if (lunch) mealPool = mealPool.filter((p) => p !== lunch);

  // 점심 ~ 카페 타임
  drainUntil(parseClock(CAFE_WINDOW_EARLIEST));

  // 오후 카페 (하루 최대 1곳, 저녁 시간대로 넘어갔으면 건너뜀)
  const cafe = anchor(
    cafePool,
    cafeRelevance,
    CAFE_WINDOW_EARLIEST,
    DINNER_WINDOW_EARLIEST,
  );
  if (cafe) cafePool = cafePool.filter((p) => p !== cafe);

  // 오후
  drainUntil(parseClock(DINNER_WINDOW_EARLIEST));

  // 저녁
  const dinner = anchor(mealPool, mealRelevance, DINNER_WINDOW_EARLIEST);
  if (dinner) mealPool = mealPool.filter((p) => p !== dinner);

  // 저녁 이후 ~ 마감 시각(DAY_END_TIME)까지. drainUntil이 withinDeadline으로 마감을 지킨다.
  drainUntil(null);

  return items;
}
