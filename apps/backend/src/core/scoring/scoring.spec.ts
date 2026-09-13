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

describe('날씨 보정', () => {
  it('weather를 안 주면 기존과 완전히 동일한 점수를 낸다', () => {
    const p = place('a', ['실내', '전시'], 0.8, 0.6);
    const withoutWeather = scorePlace(p, []);
    const explicitUndefined = scorePlace(
      p,
      [],
      DEFAULT_SCORING_WEIGHTS,
      undefined,
    );
    expect(withoutWeather.score).toBe(explicitUndefined.score);
  });

  it('RAIN이면 실내 태그를 가진 장소 점수가 1.2배가 된다', () => {
    const indoor = place('indoor', ['실내'], 0.8, 0.6);
    const base = scorePlace(indoor, []);
    const rainy = scorePlace(indoor, [], DEFAULT_SCORING_WEIGHTS, 'RAIN');
    expect(rainy.score).toBeCloseTo(base.score * 1.2, 10);
  });

  it('RAIN이어도 실내 태그가 없으면 보정하지 않는다', () => {
    const outdoor = place('outdoor', ['자연', '산책'], 0.8, 0.6);
    const base = scorePlace(outdoor, []);
    const rainy = scorePlace(outdoor, [], DEFAULT_SCORING_WEIGHTS, 'RAIN');
    expect(rainy.score).toBeCloseTo(base.score, 10);
  });

  it('CLEAR면 야외 태그를 가진 장소 점수가 1.15배가 된다', () => {
    const outdoor = place('outdoor', ['자연', '산책'], 0.8, 0.6);
    const base = scorePlace(outdoor, []);
    const clear = scorePlace(outdoor, [], DEFAULT_SCORING_WEIGHTS, 'CLEAR');
    expect(clear.score).toBeCloseTo(base.score * 1.15, 10);
  });

  it('CLEAR여도 야외 태그가 없으면 보정하지 않는다', () => {
    const indoor = place('indoor', ['실내'], 0.8, 0.6);
    const base = scorePlace(indoor, []);
    const clear = scorePlace(indoor, [], DEFAULT_SCORING_WEIGHTS, 'CLEAR');
    expect(clear.score).toBeCloseTo(base.score, 10);
  });

  it('어느 쪽 태그도 아니면 어떤 날씨에도 보정하지 않는다', () => {
    const neutral = place('neutral', ['맛집', '한식'], 0.8, 0.6);
    const base = scorePlace(neutral, []);
    expect(
      scorePlace(neutral, [], DEFAULT_SCORING_WEIGHTS, 'RAIN').score,
    ).toBeCloseTo(base.score, 10);
    expect(
      scorePlace(neutral, [], DEFAULT_SCORING_WEIGHTS, 'CLEAR').score,
    ).toBeCloseTo(base.score, 10);
  });

  it('scoreAndSortPlaces도 weather를 그대로 반영해 순위를 바꿀 수 있다', () => {
    const places = [
      place('indoor', ['실내'], 0.5, 0.5),
      place('outdoor', ['자연'], 0.5, 0.5),
    ];
    // 태그일치도 0(키워드 없음), popularity/rating 동률이라 보정 전에는 동점 -> 원래 순서 유지.
    const noWeather = scoreAndSortPlaces(places, []);
    expect(noWeather[0].place.id).toBe('indoor');

    const rainy = scoreAndSortPlaces(
      places,
      [],
      DEFAULT_SCORING_WEIGHTS,
      'RAIN',
    );
    expect(rainy[0].place.id).toBe('indoor');
    expect(rainy[0].score).toBeGreaterThan(rainy[1].score);
  });
});
