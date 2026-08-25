import {
  scorePlace,
  scoreAndSortPlaces,
  DEFAULT_SCORING_WEIGHTS,
} from './scoring';
import { ScorablePlace } from './scoring.types';

function place(
  id: string,
  tags: string[],
  popularity: number,
  rating: number,
): ScorablePlace {
  return { id, tags, popularity, rating };
}

describe('scorePlace', () => {
  it('키워드 태그가 없으면 태그일치 성분은 0이고, 인기도+평점만 반영된다', () => {
    const p = place('a', ['자연'], 0.8, 0.6);
    const result = scorePlace(p, []);
    const expected =
      p.popularity * DEFAULT_SCORING_WEIGHTS.popularity +
      p.rating * DEFAULT_SCORING_WEIGHTS.rating;
    expect(result.score).toBeCloseTo(expected, 10);
  });

  it('태그가 완전히 일치하면 가중합을 수기 계산한 값과 일치한다', () => {
    const p = place('a', ['해변', '자연', '뷰맛집'], 0.8, 0.6);
    const keywordTags = ['해변', '자연'];
    const result = scorePlace(p, keywordTags);
    const expected =
      1 * DEFAULT_SCORING_WEIGHTS.tagMatch +
      0.8 * DEFAULT_SCORING_WEIGHTS.popularity +
      0.6 * DEFAULT_SCORING_WEIGHTS.rating;
    expect(result.score).toBeCloseTo(expected, 10);
  });
});

describe('scoreAndSortPlaces', () => {
  it('점수 내림차순으로 정렬된다', () => {
    const places = [
      place('low', [], 0.1, 0.1),
      place('high', [], 0.9, 0.9),
      place('mid', [], 0.5, 0.5),
    ];
    const result = scoreAndSortPlaces(places, []);
    expect(result.map((r) => r.place.id)).toEqual(['high', 'mid', 'low']);
  });

  it('커스텀 가중치를 주면 순위가 바뀔 수 있다', () => {
    const places = [
      place('highTagLowRating', ['자연'], 0.1, 0.1),
      place('lowTagHighRating', [], 0.1, 0.9),
    ];
    const keywordTags = ['자연'];

    const tagFocused = scoreAndSortPlaces(places, keywordTags, {
      tagMatch: 1,
      popularity: 0,
      rating: 0,
    });
    expect(tagFocused[0].place.id).toBe('highTagLowRating');

    const ratingFocused = scoreAndSortPlaces(places, keywordTags, {
      tagMatch: 0,
      popularity: 0,
      rating: 1,
    });
    expect(ratingFocused[0].place.id).toBe('lowTagHighRating');
  });
});
