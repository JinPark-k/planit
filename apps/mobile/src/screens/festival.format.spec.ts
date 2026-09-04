import { Festival } from '../api/types';
import {
  festivalPeriod,
  festivalTiming,
  isLongRunning,
  todayInKst,
} from './festival.format';

function festival(partial: Partial<Festival> = {}): Festival {
  return {
    id: 'f1',
    name: '축제',
    category: 'SIGHTSEEING',
    tags: ['축제'],
    location: { lat: 37.5, lng: 127 },
    startDate: '2026-09-12',
    endDate: '2026-09-13',
    region: 'SEOUL',
    ongoing: false,
    durationDays: 2,
    ...partial,
  };
}

describe('festivalPeriod', () => {
  it('기간을 월/일로 보여준다', () => {
    expect(festivalPeriod(festival())).toBe('9월 12일 ~ 9월 13일');
  });

  it('하루짜리는 하루로 표시한다', () => {
    const f = festival({ startDate: '2026-09-12', endDate: '2026-09-12' });
    expect(festivalPeriod(f)).toBe('9월 12일 하루');
  });

  it('해를 넘기면 종료일에 연도를 남긴다', () => {
    const f = festival({ startDate: '2026-12-20', endDate: '2027-01-05' });
    expect(festivalPeriod(f)).toBe('12월 20일 ~ 2027-01-05');
  });
});

describe('festivalTiming', () => {
  const TODAY = '2026-09-04';

  it('진행 중이면 남은 기간을 알린다', () => {
    const f = festival({ ongoing: true, endDate: '2026-09-07' });
    expect(festivalTiming(f, TODAY)).toBe('3일 남음');
  });

  it('오늘 끝나는 축제', () => {
    const f = festival({ ongoing: true, endDate: TODAY });
    expect(festivalTiming(f, TODAY)).toBe('오늘까지');
  });

  it('내일 끝나는 축제', () => {
    const f = festival({ ongoing: true, endDate: '2026-09-05' });
    expect(festivalTiming(f, TODAY)).toBe('내일까지');
  });

  it('예정이면 언제 시작하는지 알린다', () => {
    expect(festivalTiming(festival({ startDate: '2026-09-05' }), TODAY)).toBe(
      '내일 시작',
    );
    expect(festivalTiming(festival({ startDate: '2026-09-07' }), TODAY)).toBe(
      '3일 뒤',
    );
    expect(festivalTiming(festival({ startDate: '2026-09-20' }), TODAY)).toBe(
      '2주 뒤',
    );
    expect(festivalTiming(festival({ startDate: '2026-11-04' }), TODAY)).toBe(
      '2개월 뒤',
    );
  });
});

describe('isLongRunning', () => {
  it('한 달 넘게 열리면 상설로 본다', () => {
    // 연중 전시나 주말 상설 공연이라 "그때만 열린다"는 성격이 없다.
    expect(isLongRunning(festival({ durationDays: 365 }))).toBe(true);
  });

  it('며칠짜리는 상설이 아니다', () => {
    expect(isLongRunning(festival({ durationDays: 2 }))).toBe(false);
  });
});

describe('todayInKst', () => {
  it('UTC로는 어제인 시각도 한국 날짜로 준다', () => {
    // 서버(festivals.service.ts)와 같은 기준이어야 "오늘까지"가 어긋나지 않는다.
    expect(todayInKst(new Date('2026-09-03T15:30:00Z'))).toBe('2026-09-04');
  });
});
