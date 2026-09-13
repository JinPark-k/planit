import {
  ScorablePlace,
  ScoredPlace,
  ScoringWeights,
  WeatherCondition,
} from './scoring.types';

// TODO: 실제 데이터 분포(인기도/평점 스케일)를 확인한 뒤 가중치를 튜닝한다.
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  tagMatch: 0.5,
  popularity: 0.3,
  rating: 0.2,
};

/**
 * 날씨 보정에 쓰는 실내/야외 태그.
 *
 * infra/tour-api/tour-api-mapping.ts의 DERIVABLE_TAGS 중 일부를 그대로 옮긴 문자열이다.
 * core는 infra를 import할 수 없으므로(레이어 규칙, apps/backend/CLAUDE.md) 그 모듈을 참조하는
 * 대신 여기 상수로 복제해 둔다 — 실제 태그 체계가 바뀌면 두 곳을 같이 고쳐야 한다.
 */
export const WEATHER_INDOOR_TAGS = ['실내'];
export const WEATHER_OUTDOOR_TAGS = [
  '자연',
  '해변',
  '산',
  '등산',
  '산책',
  '공원',
  '수상레저',
];

/** 제안서 명시 가중치: 강수 예보 시 실내 행사 +20%, 맑음 시 야외 행사 +15%. */
const RAIN_INDOOR_MULTIPLIER = 1.2;
const CLEAR_OUTDOOR_MULTIPLIER = 1.15;

function tagMatchRatio(placeTags: string[], keywordTags: string[]): number {
  if (keywordTags.length === 0) return 0;
  const matched = keywordTags.filter((tag) => placeTags.includes(tag)).length;
  return matched / keywordTags.length;
}

/**
 * weather가 없으면 항상 1(보정 없음)이라 기존 호출부는 동작이 그대로다.
 * 실내/야외 어느 쪽 태그도 없는 장소(예: 순수 맛집)는 어느 날씨에도 보정하지 않는다.
 */
function weatherMultiplier(
  placeTags: string[],
  weather: WeatherCondition | undefined,
): number {
  if (
    weather === 'RAIN' &&
    placeTags.some((t) => WEATHER_INDOOR_TAGS.includes(t))
  ) {
    return RAIN_INDOOR_MULTIPLIER;
  }
  if (
    weather === 'CLEAR' &&
    placeTags.some((t) => WEATHER_OUTDOOR_TAGS.includes(t))
  ) {
    return CLEAR_OUTDOOR_MULTIPLIER;
  }
  return 1;
}

/**
 * score = (태그 일치도 + 인기도 + 평점의 가중합) * 날씨 보정.
 * TODO: popularity/rating은 실제 데이터 삽입 후 0~1 정규화 로직을 확정한다 (현재는 이미 0~1이라 가정).
 */
export function scorePlace<T extends ScorablePlace>(
  place: T,
  keywordTags: string[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  weather?: WeatherCondition,
): ScoredPlace<T> {
  const baseScore =
    tagMatchRatio(place.tags, keywordTags) * weights.tagMatch +
    place.popularity * weights.popularity +
    place.rating * weights.rating;

  return { place, score: baseScore * weatherMultiplier(place.tags, weather) };
}

export function scoreAndSortPlaces<T extends ScorablePlace>(
  places: T[],
  keywordTags: string[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  weather?: WeatherCondition,
): ScoredPlace<T>[] {
  return places
    .map((place) => scorePlace(place, keywordTags, weights, weather))
    .sort((a, b) => b.score - a.score);
}
