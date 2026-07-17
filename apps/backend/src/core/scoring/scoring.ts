import { ScorablePlace, ScoredPlace, ScoringWeights } from './scoring.types';

// TODO: 실제 데이터 분포(인기도/평점 스케일)를 확인한 뒤 가중치를 튜닝한다.
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  tagMatch: 0.5,
  popularity: 0.3,
  rating: 0.2,
};

function tagMatchRatio(placeTags: string[], keywordTags: string[]): number {
  if (keywordTags.length === 0) return 0;
  const matched = keywordTags.filter((tag) => placeTags.includes(tag)).length;
  return matched / keywordTags.length;
}

/**
 * score = 태그 일치도 + 인기도 + 평점의 가중합.
 * TODO: popularity/rating은 실제 데이터 삽입 후 0~1 정규화 로직을 확정한다 (현재는 이미 0~1이라 가정).
 */
export function scorePlace<T extends ScorablePlace>(
  place: T,
  keywordTags: string[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoredPlace<T> {
  const score =
    tagMatchRatio(place.tags, keywordTags) * weights.tagMatch +
    place.popularity * weights.popularity +
    place.rating * weights.rating;

  return { place, score };
}

export function scoreAndSortPlaces<T extends ScorablePlace>(
  places: T[],
  keywordTags: string[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoredPlace<T>[] {
  return places
    .map((place) => scorePlace(place, keywordTags, weights))
    .sort((a, b) => b.score - a.score);
}
