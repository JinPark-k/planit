import {
  leadInCopy,
  nightCopy,
  stayCopy,
  travelCopy,
  truncateForChip,
} from './liveTrip.copy';

const t = (h: number, m: number) => new Date(2026, 2, 2, h, m).getTime();

describe('truncateForChip', () => {
  it('8자 이하면 그대로 둔다', () => {
    expect(truncateForChip('제주공항')).toBe('제주공항');
  });

  it('8자를 넘으면 8자로 자르고 …을 붙인다', () => {
    expect(truncateForChip('아주아주아주아주긴장소명')).toBe('아주아주아주아주…');
  });

  it('정확히 경계(8자)면 자르지 않는다', () => {
    expect(truncateForChip('12345678')).toBe('12345678');
  });
});

describe('stayCopy', () => {
  it('다음 장소가 있으면 마감 시각과 다음 장소를 같이 보여준다', () => {
    const copy = stayCopy({
      placeName: '성산일출봉',
      endAt: t(11, 30),
      next: { placeName: '우도', startAt: t(14, 0) },
    });
    expect(copy.title).toBe('성산일출봉');
    expect(copy.body).toBe('11:30까지 · 다음 14:00 우도');
    expect(copy.shortText).toBe('성산일출봉');
  });

  it('다음 장소가 없으면 "오늘 일정 마지막"이다', () => {
    const copy = stayCopy({ placeName: '우도', endAt: t(18, 0) });
    expect(copy.body).toBe('오늘 일정 마지막');
  });

  it('shortText는 8자를 넘으면 말줄임한다', () => {
    const copy = stayCopy({ placeName: '아주아주아주아주긴장소명', endAt: t(11, 30) });
    expect(copy.shortText).toBe('아주아주아주아주…');
  });
});

describe('travelCopy', () => {
  it("받침 없는 장소명엔 '로'를 붙인다 (우도)", () => {
    const copy = travelCopy({ nextPlaceName: '우도', nextStartAt: t(14, 0) });
    expect(copy.title).toBe('우도로 이동 중');
    expect(copy.body).toBe('14:00 도착 예정');
  });

  it("받침 있는 장소명엔 '으로'를 붙인다 (성산일출봉)", () => {
    const copy = travelCopy({ nextPlaceName: '성산일출봉', nextStartAt: t(9, 0) });
    expect(copy.title).toBe('성산일출봉으로 이동 중');
  });

  it("받침이 'ㄹ'이면 '로'를 붙인다 (서울)", () => {
    const copy = travelCopy({ nextPlaceName: '서울', nextStartAt: t(9, 0) });
    expect(copy.title).toBe('서울로 이동 중');
  });

  it('shortText에도 말줄임이 적용된다', () => {
    const copy = travelCopy({ nextPlaceName: '아주아주아주아주긴장소명', nextStartAt: t(9, 0) });
    expect(copy.shortText).toBe('아주아주아주아주… 이동');
  });
});

describe('nightCopy', () => {
  it('오늘이 끝났음과 내일 첫 일정을 함께 알린다', () => {
    const copy = nightCopy({ nextFirstPlaceName: '비자림', nextFirstStartAt: t(9, 0) });
    expect(copy.title).toBe('오늘 일정이 끝났어요');
    expect(copy.body).toBe('내일 09:00 비자림부터');
    expect(copy.shortText).toBe('오늘 일정 끝');
  });
});

describe('leadInCopy', () => {
  it('다음 일차 시작 장소/시각을 안내한다', () => {
    const copy = leadInCopy({ firstPlaceName: '성산일출봉', firstStartAt: t(9, 0) });
    expect(copy.title).toBe('내일 여행 시작');
    expect(copy.body).toBe('09:00 성산일출봉부터');
    expect(copy.shortText).toBe('내일 여행');
  });
});
