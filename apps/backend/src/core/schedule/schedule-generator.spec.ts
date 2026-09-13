import { generateSchedule } from './schedule-generator';
import { Place } from './schedule.types';
import { getTravelTime } from '../travel-time';

function place(
  id: string,
  category: Place['category'],
  lat: number,
  lng: number,
  popularity: number,
  rating: number,
): Place {
  return {
    id,
    name: id,
    category,
    location: { lat, lng },
    tags: [],
    popularity,
    rating,
  };
}

function minutesFromClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

describe('generateSchedule / orderWithinDay (day-1 case)', () => {
  it('장소가 1개면 09:00에 시작하고 이전 이동시간은 없다', () => {
    const p = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [p],
      dayCount: 1,
      travelMode: 'CAR',
    });
    expect(day.items).toHaveLength(1);
    expect(day.items[0].startTime).toBe('09:00');
    expect(day.items[0].travelFromPreviousMinutes).toBeUndefined();
  });

  it('startTime은 하루 안에서 시간순으로 non-decreasing이다', () => {
    const places = [
      place('a', 'SIGHTSEEING', 37.5, 127, 1, 1),
      place('b', 'SIGHTSEEING', 37.51, 127.01, 0.8, 0.8),
      place('c', 'ACTIVITY', 37.52, 127.02, 0.6, 0.6),
    ];
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: places,
      dayCount: 1,
      travelMode: 'CAR',
    });
    const minutes = day.items.map((item) => minutesFromClock(item.startTime));
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThanOrEqual(minutes[i - 1]);
    }
  });

  it('두 번째 이후 아이템의 travelFromPreviousMinutes는 실제 getTravelTime 값과 일치한다', () => {
    const a = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const b = place('b', 'SIGHTSEEING', 37.51, 127.01, 0.8, 0.8);
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [a, b],
      dayCount: 1,
      travelMode: 'CAR',
    });
    expect(day.items).toHaveLength(2);
    expect(day.items[0].travelFromPreviousMinutes).toBeUndefined();

    const expectedTravel = getTravelTime(a.location, b.location, 'CAR').minutes;
    expect(day.items[1].travelFromPreviousMinutes).toBe(expectedTravel);
    expect(minutesFromClock(day.items[1].startTime)).toBe(
      minutesFromClock('09:00') +
        90 /* SIGHTSEEING 체류시간 */ +
        expectedTravel,
    );
  });

  it('FOOD가 2개 이상이면 점심/저녁 시간대 근처에 배치된다', () => {
    const sightseeing = place('sight', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const lunch = place('lunch', 'FOOD', 37.5, 127.001, 0.9, 0.9);
    const dinner = place('dinner', 'FOOD', 37.5, 127.002, 0.5, 0.5);
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [sightseeing, lunch, dinner],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const lunchItem = day.items.find((i) => i.place.id === 'lunch');
    const dinnerItem = day.items.find((i) => i.place.id === 'dinner');
    expect(lunchItem).toBeDefined();
    expect(dinnerItem).toBeDefined();
    expect(minutesFromClock(lunchItem!.startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('12:00'),
    );
    expect(minutesFromClock(lunchItem!.startTime)).toBeLessThan(
      minutesFromClock('13:00'),
    );
    expect(minutesFromClock(dinnerItem!.startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('18:00'),
    );
    expect(minutesFromClock(dinnerItem!.startTime)).toBeLessThan(
      minutesFromClock('19:00'),
    );
  });

  it('FOOD가 하나도 없어도 에러 없이 09:00부터 스케줄을 생성한다', () => {
    const places = [
      place('a', 'SIGHTSEEING', 37.5, 127, 1, 1),
      place('b', 'ACTIVITY', 37.51, 127.01, 0.8, 0.8),
    ];
    expect(() =>
      generateSchedule({
        keywords: [],
        candidatePlaces: places,
        dayCount: 1,
        travelMode: 'CAR',
      }),
    ).not.toThrow();
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: places,
      dayCount: 1,
      travelMode: 'CAR',
    });
    expect(day.items[0].startTime).toBe('09:00');
  });
});

describe('체류시간(stayMinutes)', () => {
  it('카테고리별 기본 체류시간이 아이템에 실린다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [
        place('sight', 'SIGHTSEEING', 37.5, 127, 1, 1),
        place('food', 'FOOD', 37.501, 127.001, 1, 1),
        place('act', 'ACTIVITY', 37.502, 127.002, 1, 1),
      ],
      dayCount: 1,
      travelMode: 'CAR',
    });
    const byId = new Map(day.items.map((i) => [i.place.id, i.stayMinutes]));
    expect(byId.get('sight')).toBe(90);
    expect(byId.get('food')).toBe(60);
    expect(byId.get('act')).toBe(120);
  });

  it('다음 장소의 시작 시각은 체류시간과 이동시간의 합만큼 뒤다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [
        place('a', 'SIGHTSEEING', 37.5, 127, 2, 1),
        place('b', 'SIGHTSEEING', 37.51, 127.01, 1, 1),
      ],
      dayCount: 1,
      travelMode: 'CAR',
    });
    const [first, second] = day.items;
    expect(
      minutesFromClock(second.startTime) - minutesFromClock(first.startTime),
    ).toBe(first.stayMinutes + (second.travelFromPreviousMinutes ?? 0));
  });
});

describe('generateSchedule multi-day smoke test', () => {
  it('dayCount만큼 ScheduleDay를 생성하고 startTime 포맷이 유효하다', () => {
    const places = [
      place('a', 'SIGHTSEEING', 37.5, 127, 1, 1),
      place('b', 'FOOD', 37.51, 127.01, 0.9, 0.9),
      place('c', 'ACTIVITY', 35.18, 129.08, 0.8, 0.8),
      place('d', 'FOOD', 35.16, 129.16, 0.7, 0.7),
    ];
    const days = generateSchedule({
      keywords: [],
      candidatePlaces: places,
      dayCount: 2,
      travelMode: 'CAR',
    });
    expect(days).toHaveLength(2);
    for (const day of days) {
      for (const item of day.items) {
        expect(item.startTime).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });
});

describe('generateSchedule dayStartOverrides', () => {
  it('location만 지정하면 첫 아이템의 travelFromPreviousMinutes가 그 지점 기준으로 계산된다', () => {
    const p = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const startLocation = { lat: 37.49, lng: 126.99 };
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [p],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: startLocation } },
    });
    const expectedTravel = getTravelTime(
      startLocation,
      p.location,
      'CAR',
    ).minutes;
    expect(day.items).toHaveLength(1);
    expect(day.items[0].travelFromPreviousMinutes).toBe(expectedTravel);
    expect(minutesFromClock(day.items[0].startTime)).toBe(
      minutesFromClock('09:00') + expectedTravel,
    );
  });

  it('time만 지정하면 기본 09:00 대신 지정 시각부터 시작한다', () => {
    const p = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [p],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { time: '10:30' } },
    });
    expect(day.items[0].startTime).toBe('10:30');
    expect(day.items[0].travelFromPreviousMinutes).toBeUndefined();
  });

  it('location과 time을 함께 지정하면 둘 다 반영된다', () => {
    const p = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const startLocation = { lat: 37.49, lng: 126.99 };
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [p],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: startLocation, time: '10:30' } },
    });
    const expectedTravel = getTravelTime(
      startLocation,
      p.location,
      'CAR',
    ).minutes;
    expect(day.items[0].travelFromPreviousMinutes).toBe(expectedTravel);
    expect(minutesFromClock(day.items[0].startTime)).toBe(
      minutesFromClock('10:30') + expectedTravel,
    );
  });

  it('오버라이드 지점 자체는 별도 일정 아이템으로 나타나지 않는다', () => {
    const p = place('a', 'SIGHTSEEING', 37.5, 127, 1, 1);
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [p],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: {
        1: { location: { lat: 37.49, lng: 126.99 }, time: '10:30' },
      },
    });
    expect(day.items).toHaveLength(1);
    expect(day.items[0].place.id).toBe('a');
  });

  it('일차별로 지정한 날만 오버라이드가 적용되고, 지정 안 한 날은 기본값을 쓴다', () => {
    // 서울/부산처럼 지리적으로 멀리 떨어뜨려 day1/day2로 확실히 분리되게 하고,
    // 점수(popularity/rating)로 어느 쪽이 day1이 될지 결정되게 한다.
    const day1Candidate = place('seoul', 'SIGHTSEEING', 37.5665, 126.978, 1, 1);
    const day2Candidate = place(
      'busan',
      'SIGHTSEEING',
      35.1796,
      129.0756,
      0.1,
      0.1,
    );

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [day1Candidate, day2Candidate],
      dayCount: 2,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { time: '11:00' } },
    });

    const day1 = days.find((d) => d.items[0]?.place.id === 'seoul');
    const day2 = days.find((d) => d.items[0]?.place.id === 'busan');
    expect(day1).toBeDefined();
    expect(day2).toBeDefined();
    expect(day1!.items[0].startTime).toBe('11:00');
    expect(day2!.items[0].startTime).toBe('09:00');
  });
});

describe('하루 마감 시각(DAY_END_TIME)', () => {
  // 실데이터(제주 930건)로 확인된 문제: 상한이 없으면 하루에 465곳이 들어가고
  // formatClock의 24시간 랩어라운드로 23:07 -> 00:09처럼 시각이 되돌아갔다.
  function manyPlaces(count: number): Place[] {
    return Array.from({ length: count }, (_, i) =>
      place(
        `p${i}`,
        'SIGHTSEEING',
        // 서로 아주 가깝게 두어 이동시간이 아니라 마감 시각이 상한이 되게 한다
        33.45 + i * 0.0005,
        126.55 + i * 0.0005,
        1 - i * 0.001,
        1 - i * 0.001,
      ),
    );
  }

  it('후보가 아무리 많아도 21:00 이후에는 새 장소를 배치하지 않는다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: manyPlaces(200),
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items.length).toBeGreaterThan(0);
    for (const item of day.items) {
      expect(minutesFromClock(item.startTime)).toBeLessThanOrEqual(
        minutesFromClock('21:00'),
      );
    }
  });

  it('시각이 자정을 넘어 되돌아가지 않는다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: manyPlaces(200),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const minutes = day.items.map((i) => minutesFromClock(i.startTime));
    for (let i = 1; i < minutes.length; i += 1) {
      expect(minutes[i]).toBeGreaterThanOrEqual(minutes[i - 1]);
    }
  });

  it('하루 일정 수가 현실적인 범위로 제한된다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: manyPlaces(200),
      dayCount: 1,
      travelMode: 'CAR',
    });

    // 09:00~21:00(12시간)에 관광 90분 + 이동시간이면 10곳을 넘기 어렵다.
    expect(day.items.length).toBeLessThanOrEqual(12);
  });

  it('마감 시각을 넘기면 남은 후보는 그냥 제외한다 (에러 없이)', () => {
    expect(() =>
      generateSchedule({
        keywords: [],
        candidatePlaces: manyPlaces(500),
        dayCount: 2,
        travelMode: 'CAR',
      }),
    ).not.toThrow();
  });
});

describe('이동 구간 상한(MAX_TRAVEL_LEG_MINUTES)', () => {
  it('이동시간이 상한(120분)을 넘는 장소는 배치하지 않는다', () => {
    const near = place('near', 'SIGHTSEEING', 33.45, 126.55, 1, 1);
    // near에서 아주 멀어 이동시간이 상한을 훨씬 넘는다.
    const far = place('far', 'SIGHTSEEING', 34.5, 127.6, 0.5, 0.5);

    const travelMinutes = getTravelTime(
      near.location,
      far.location,
      'CAR',
    ).minutes;
    expect(travelMinutes).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [near, far],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).toContain('near');
    expect(ids).not.toContain('far');
  });

  it('이동시간이 상한 이내(120분 이하)면 정상 배치된다', () => {
    const near = place('near', 'SIGHTSEEING', 33.45, 126.55, 1, 1);
    // 상한 바로 아래(118분)가 되도록 좌표를 잡았다.
    const withinCap = place(
      'withinCap',
      'SIGHTSEEING',
      33.45 + 0.34,
      126.55,
      0.5,
      0.5,
    );

    const travelMinutes = getTravelTime(
      near.location,
      withinCap.location,
      'CAR',
    ).minutes;
    expect(travelMinutes).toBeLessThanOrEqual(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [near, withinCap],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).toContain('near');
    expect(ids).toContain('withinCap');
  });

  it('mustInclude 축제는 상한과 무관하게 하루 첫 장소로 배치된다', () => {
    // 축제는 필러와 아주 멀리 떨어져 있다(이동시간 상한을 훨씬 넘는 거리). 하지만
    // 하루의 첫 장소는 currentLocation이 없어 이동시간이 0으로 계산되므로 상한 대상이 아니다.
    const festival = place('festival', 'SIGHTSEEING', 39.0, 125.0, 0.1, 0.1);
    const filler = place('filler', 'SIGHTSEEING', 33.45, 126.55, 1, 1);

    const travelMinutes = getTravelTime(
      festival.location,
      filler.location,
      'CAR',
    ).minutes;
    expect(travelMinutes).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [festival, filler],
      dayCount: 1,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['festival']),
    });

    expect(day.items[0].place.id).toBe('festival');
    expect(day.items[0].travelFromPreviousMinutes).toBeUndefined();
  });

  it('mustInclude 장소도 이동시간 상한을 넘으면 배치하지 않는다', () => {
    // "담기"로 고른 장소라도 예외가 아니다 — 조용히 비상식적인 이동을 만들기보다
    // 빠뜨리고, 빠졌다는 사실은 schedule.service.ts가 excludedPlaces로 알린다.
    //
    // 둘 다 mustInclude로 담되 관련도 차이를 크게 둬서 pickedNear가 확실히 먼저
    // 선택되게 한다(하루 첫 장소라 이동시간이 0으로 계산되어 상한 검사 자체가
    // 의미 없어지는 것을 피하기 위함). pickedNear가 배치된 뒤 currentLocation이
    // 실제 좌표를 가지므로, 그다음 pinned 후보인 pickedFar는 실측 이동시간으로
    // 상한 검사를 받는다.
    const pickedNear = place('pickedNear', 'SIGHTSEEING', 33.45, 126.55, 1, 1);
    const pickedFar = place('pickedFar', 'SIGHTSEEING', 34.5, 127.6, 0.1, 0.1);

    const travelMinutes = getTravelTime(
      pickedNear.location,
      pickedFar.location,
      'CAR',
    ).minutes;
    expect(travelMinutes).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [pickedNear, pickedFar],
      dayCount: 1,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['pickedNear', 'pickedFar']),
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).toContain('pickedNear');
    expect(ids).not.toContain('pickedFar');
  });
});

describe('이동 상한 초과 후보가 있어도 하루 채움을 멈추지 않는다 (회귀 방지)', () => {
  // 실데이터 검증(12개 지역 x 3일 일정)에서 canPlace 하나로 마감/이동상한을 합쳐
  // break하던 이전 구현은 36곳이 통째로 사라지는 회귀를 냈다. 예: 전남 하루별
  // 장소 수 패턴이 [5, 5, 7] -> [8, 1, 1]로 무너짐. pickNext가 고른 최상위 후보가
  // 좌표 오류로 이동 상한에 걸리면, 그 후보 하나만 걷어내고 다음 후보로 넘어가야
  // 한다 — 하루 채움 루프 전체를 멈추면 안 된다.
  const START = { lat: 33.45, lng: 126.55 };

  it('상한을 넘는 후보 하나가 채움 순서 중간에 걸려도, 그 뒤 후보가 이어서 배치된다', () => {
    // near_a/near_b: START 바로 옆이라 근접성이 압도적으로 높아 먼저 선택된다.
    // far: 점수가 near_a/near_b보다 낮지만 near_c보다는 관련도가 높아 세 번째로
    //   선택되고, 이동 상한(120분)에 걸려 배치되지 않는다.
    // near_c: far보다 관련도가 낮지만 이동시간은 상한 이내라, far가 걸러진 뒤에도
    //   채움이 이어진다면 네 번째로 배치돼야 한다.
    const nearA = place('near-a', 'SIGHTSEEING', 33.451, 126.551, 0.5, 0.5);
    const nearB = place('near-b', 'SIGHTSEEING', 33.452, 126.552, 0.5, 0.5);
    const nearC = place('near-c', 'SIGHTSEEING', 33.52, 126.55, 0.1, 0.1);
    const far = place('far', 'SIGHTSEEING', 34.5, 127.6, 1, 1);

    const travelMinutes = getTravelTime(START, far.location, 'CAR').minutes;
    expect(travelMinutes).toBeGreaterThan(120);
    // 세 번째 후보로 선택되는 시점에도 마감(21:00)은 넉넉히 남아 있어야 한다 —
    // 이 테스트가 이동 상한 때문에 걸러지는 것이지, 마감 때문에 멈추는 게 아님을 보장한다.
    expect(travelMinutes).toBeLessThan(600);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [nearA, nearB, nearC, far],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).not.toContain('far');
    expect(ids).toContain('near-a');
    expect(ids).toContain('near-b');
    expect(ids).toContain('near-c');
  });

  it('이동 상한을 넘는 후보가 pickNext의 최상위 선택이어도 하루가 1곳으로 끊기지 않는다', () => {
    // far가 인기도/평점에서 압도적이라 관련도만 보면 항상 1순위지만, 좌표가 멀어
    // 이동 상한에 걸린다. 근처 후보들(near0~2)은 점수가 낮지만 이동 상한 이내라
    // far가 걸러진 뒤에도 하루가 계속 채워져야 한다 — 예전 버그처럼 하루가
    // far 하나 시도하다 끊겨 1곳(혹은 0곳)으로 남으면 안 된다.
    const near0 = place('near0', 'SIGHTSEEING', 33.52, 126.55, 0.1, 0.1);
    const near1 = place('near1', 'SIGHTSEEING', 33.38, 126.55, 0.1, 0.1);
    const near2 = place('near2', 'SIGHTSEEING', 33.45, 126.62, 0.1, 0.1);
    const far = place('far', 'SIGHTSEEING', 34.5, 127.6, 1, 1);

    const travelMinutes = getTravelTime(START, far.location, 'CAR').minutes;
    expect(travelMinutes).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [near0, near1, near2, far],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).not.toContain('far');
    expect(ids).toContain('near0');
    expect(ids).toContain('near1');
    expect(ids).toContain('near2');
  });

  it('점심 앵커: 이동 상한을 넘는 식당 후보는 건너뛰고 가까운 식당을 점심으로 배치한다', () => {
    // farRestaurant가 점수는 더 높아 anchor의 pickNext 1순위지만 이동 상한에 걸린다.
    // 예전 버그(anchor의 `if (!next || !canPlace(next)) return undefined`)라면
    // 여기서 점심 슬롯 전체가 비었을 것이다 — 근처에 멀쩡한 nearRestaurant가
    // 남아 있어도 통째로 포기했다. 고쳐진 동작은 점심 슬롯이 비지 않고
    // nearRestaurant가 배치되는 것이다.
    const nearRestaurant = place(
      'near-restaurant',
      'FOOD',
      33.52,
      126.55,
      0.1,
      0.1,
    );
    const farRestaurant = place('far-restaurant', 'FOOD', 34.5, 127.6, 1, 1);

    const travelMinutes = getTravelTime(
      START,
      farRestaurant.location,
      'CAR',
    ).minutes;
    expect(travelMinutes).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [nearRestaurant, farRestaurant],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    const lunch = day.items.find(
      (i) =>
        i.place.category === 'FOOD' &&
        minutesFromClock(i.startTime) >= minutesFromClock('12:00') &&
        minutesFromClock(i.startTime) < minutesFromClock('13:00'),
    );
    expect(lunch).toBeDefined();
    expect(lunch!.place.id).toBe('near-restaurant');

    const ids = day.items.map((i) => i.place.id);
    expect(ids).not.toContain('far-restaurant');
  });
});

describe('고립 후보 사전 제외 (excludeIsolatedPlaces)', () => {
  // 실데이터 회귀: SEOUL [9,7,9] -> [9,1,9], GYEONGNAM [9,5,9] -> [9,1,9],
  // JEONBUK [9,2,2] -> [9,1,1]. 원인은 좌표가 틀린 장소(가장 가까운 이웃까지도
  // 120분을 넘는 장소)가 클러스터 시드로 앉으면, 이동 상한이 정상 동작해도 그날은
  // 두 번째 장소부터 계속 상한에 걸려 1곳으로 끝난다는 것. 클러스터링 전에
  // 이런 후보를 걸러내면 애초에 시드가 될 수 없다.

  /** 서로 가까운 좌표 그룹 (다른 지역과 확실히 분리됨). */
  const SEOUL_GROUP: Place[] = [
    place('seoul-1', 'SIGHTSEEING', 37.5665, 126.978, 0.5, 0.5),
    place('seoul-2', 'SIGHTSEEING', 37.5651, 126.9895, 0.5, 0.5),
    place('seoul-3', 'SIGHTSEEING', 37.5796, 126.977, 0.5, 0.5),
    place('seoul-4', 'SIGHTSEEING', 37.56, 126.985, 0.5, 0.5),
    place('seoul-5', 'SIGHTSEEING', 37.572, 126.98, 0.5, 0.5),
  ];
  const BUSAN_GROUP: Place[] = [
    place('busan-1', 'SIGHTSEEING', 35.1796, 129.0756, 0.5, 0.5),
    place('busan-2', 'SIGHTSEEING', 35.1587, 129.1604, 0.5, 0.5),
    place('busan-3', 'SIGHTSEEING', 35.0951, 129.0409, 0.5, 0.5),
    place('busan-4', 'SIGHTSEEING', 35.17, 129.1, 0.5, 0.5),
    place('busan-5', 'SIGHTSEEING', 35.19, 129.05, 0.5, 0.5),
  ];
  // 어느 그룹과도 멀고, 혼자라 자기 자신 외엔 이웃도 없다(실데이터의 좌표 오류 장소를 흉내).
  const ISOLATED = place('isolated', 'SIGHTSEEING', 39.0, 125.0, 0.9, 0.9);

  it('고립된 후보는 일정에 들어가지 않는다', () => {
    const nearGroup = SEOUL_GROUP.slice(0, 3);
    const travelToNearest = Math.min(
      ...nearGroup.map(
        (p) => getTravelTime(ISOLATED.location, p.location, 'CAR').minutes,
      ),
    );
    expect(travelToNearest).toBeGreaterThan(120);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [...nearGroup, ISOLATED],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).not.toContain('isolated');
    expect(ids).toContain('seoul-1');
    expect(ids).toContain('seoul-2');
    expect(ids).toContain('seoul-3');
  });

  it('고립된 후보가 하루를 망치지 않는다 (이번 회귀의 핵심)', () => {
    // ISOLATED가 걸러지지 않으면 farthest-point sampling이 SEOUL/BUSAN 중 한 그룹
    // 대신(혹은 더해) ISOLATED를 시드로 뽑을 수 있고, 그러면 그 날은 이동 상한에
    // 막혀 1곳으로 끝난다. 걸러지면 dayCount=2가 SEOUL_GROUP과 BUSAN_GROUP을
    // 각각 하루씩 채워야 한다 — 두 그룹 모두 여러 곳이 배치된다.
    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [...SEOUL_GROUP, ...BUSAN_GROUP, ISOLATED],
      dayCount: 2,
      travelMode: 'CAR',
    });

    expect(days).toHaveLength(2);
    for (const day of days) {
      expect(day.items.length).toBeGreaterThan(1);
    }

    const allIds = days.flatMap((d) => d.items.map((i) => i.place.id));
    expect(allIds).not.toContain('isolated');
    // 두 그룹 모두 실종되지 않고 어딘가에 배치되어야 한다.
    expect(allIds.some((id) => id.startsWith('seoul-'))).toBe(true);
    expect(allIds.some((id) => id.startsWith('busan-'))).toBe(true);
  });

  it('서로 가까운 장소들끼리는 본토와 멀어도 살아남는다 (섬 시나리오)', () => {
    // 울릉도/독도/백령도처럼 본토와는 멀지만 자기들끼리는 가까운 그룹은 제외 대상이
    // 아니다 — 가장 가까운 "이웃"이 상한 이내이기만 하면 된다. 실제 울릉도 좌표를
    // 흉내낸 두 지점을 쓴다.
    const ULLEUNGDO_GROUP: Place[] = [
      place('ulleungdo-1', 'SIGHTSEEING', 37.5057, 130.7997, 0.9, 0.9),
      place('ulleungdo-2', 'SIGHTSEEING', 37.51, 130.805, 0.9, 0.9),
    ];
    const travelWithinIsland = getTravelTime(
      ULLEUNGDO_GROUP[0].location,
      ULLEUNGDO_GROUP[1].location,
      'CAR',
    ).minutes;
    const travelFromMainland = getTravelTime(
      SEOUL_GROUP[0].location,
      ULLEUNGDO_GROUP[0].location,
      'CAR',
    ).minutes;
    expect(travelWithinIsland).toBeLessThanOrEqual(120);
    expect(travelFromMainland).toBeGreaterThan(120);

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [...SEOUL_GROUP, ...ULLEUNGDO_GROUP],
      dayCount: 2,
      travelMode: 'CAR',
    });

    const allIds = days.flatMap((d) => d.items.map((i) => i.place.id));
    expect(allIds).toContain('ulleungdo-1');
    expect(allIds).toContain('ulleungdo-2');
  });

  it('후보가 1개뿐이면 제외하지 않는다 (비교 대상이 없어 전부 제외되는 것을 막는 가드)', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [ISOLATED],
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items).toHaveLength(1);
    expect(day.items[0].place.id).toBe('isolated');
  });
});

describe('카테고리 균형 (FOOD는 끼니 슬롯에만)', () => {
  // 실데이터 문제: 제주 후보의 53%가 음식점이라, 앵커로 안 뽑힌 음식점이
  // 일반 풀에 섞이면 최근접 탐색이 계속 식당을 집어 하루 9곳 중 7곳이 음식점이 됐다.
  function foodHeavyPlaces(foodCount: number, sightCount: number): Place[] {
    const foods = Array.from({ length: foodCount }, (_, i) =>
      // 식당끼리 아주 가깝게 배치 = 최근접 탐색이 식당을 선호하게 되는 실제 상황 재현
      place(
        `food${i}`,
        'FOOD',
        33.25 + i * 0.0002,
        126.41 + i * 0.0002,
        0.9,
        0.9,
      ),
    );
    const sights = Array.from({ length: sightCount }, (_, i) =>
      place(
        `sight${i}`,
        'SIGHTSEEING',
        33.3 + i * 0.01,
        126.5 + i * 0.01,
        0.5,
        0.5,
      ),
    );
    return [...foods, ...sights];
  }

  it('음식점이 아무리 많아도 하루 FOOD는 2곳(점심/저녁)을 넘지 않는다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: foodHeavyPlaces(50, 10),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const foodCount = day.items.filter(
      (i) => i.place.category === 'FOOD',
    ).length;
    expect(foodCount).toBeLessThanOrEqual(2);
  });

  it('끼니 외 시간대는 관광/액티비티로 채운다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: foodHeavyPlaces(50, 10),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const nonFood = day.items.filter((i) => i.place.category !== 'FOOD');
    expect(nonFood.length).toBeGreaterThan(0);
  });

  it('음식점이 1곳뿐이면 점심만 배치하고 나머지는 관광으로 채운다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: foodHeavyPlaces(1, 5),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const foods = day.items.filter((i) => i.place.category === 'FOOD');
    expect(foods).toHaveLength(1);
    expect(minutesFromClock(foods[0].startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('12:00'),
    );
  });

  it('음식점이 없어도 관광 일정이 정상 생성된다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: foodHeavyPlaces(0, 5),
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items.length).toBeGreaterThan(0);
    expect(day.items.every((i) => i.place.category !== 'FOOD')).toBe(true);
  });
});

describe('키워드 반영 (관련도 + 근접성 가중합)', () => {
  // 실데이터 문제: 순수 최근접으로 다음 장소를 고르면 첫 장소에만 스코어가 반영되고
  // 그 뒤로는 키워드가 완전히 무시된다. 제주에서 '자연'과 '문화예술'의 일정이
  // 첫 장소만 다르고 나머지가 동일하게 나왔다.
  function tagged(
    id: string,
    lat: number,
    lng: number,
    tags: string[],
    popularity = 0,
    rating = 0,
  ): Place {
    return {
      id,
      name: id,
      category: 'SIGHTSEEING',
      location: { lat, lng },
      tags,
      popularity,
      rating,
    };
  }

  const START = { lat: 33.45, lng: 126.55 };
  const NATURE_TAGS = ['자연', '산책', '공원'];

  it('시작 지점 바로 옆이어도 키워드에 안 맞으면 건너뛰고 맞는 곳을 고른다', () => {
    // 예전 최근접 방식이면 무조건 nearIrrelevant가 먼저 나왔다.
    const nearIrrelevant = tagged('near', 33.4505, 126.5505, [], 0.4, 0.4);
    const farRelevant = tagged('far', 33.47, 126.57, NATURE_TAGS);

    const [day] = generateSchedule({
      keywords: ['자연'],
      candidatePlaces: [nearIrrelevant, farRelevant],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    expect(day.items[0].place.id).toBe('far');
  });

  it('관련도가 같으면 가까운 쪽을 고른다 (근접성은 여전히 유효하다)', () => {
    const near = tagged('near', 33.4505, 126.5505, NATURE_TAGS);
    const far = tagged('far', 33.47, 126.57, NATURE_TAGS);

    const [day] = generateSchedule({
      keywords: ['자연'],
      candidatePlaces: [near, far],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    expect(day.items[0].place.id).toBe('near');
  });

  it('키워드에 맞더라도 이동시간이 과하면(40분 이상) 가까운 쪽을 고른다', () => {
    // 관련도만 보면 섬 반대편까지 가는 일정이 나오므로 이동시간에 상한을 둔다.
    const nearIrrelevant = tagged('near', 33.4505, 126.5505, [], 0.4, 0.4);
    const farRelevant = tagged('far', 33.65, 126.75, NATURE_TAGS);

    const [day] = generateSchedule({
      keywords: ['자연'],
      candidatePlaces: [nearIrrelevant, farRelevant],
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    });

    expect(day.items[0].place.id).toBe('near');
    expect(
      getTravelTime(START, farRelevant.location, 'CAR').minutes,
    ).toBeGreaterThanOrEqual(40);
  });

  it('키워드가 다르면 첫 장소뿐 아니라 일정 전체가 달라진다', () => {
    // 자연/문화 장소를 지리적으로 섞어 두어, 거리만으로는 구분이 안 되게 한다.
    const places = [
      tagged('nature1', 33.45, 126.55, NATURE_TAGS),
      tagged('culture1', 33.4505, 126.5505, ['문화', '전시', '실내']),
      tagged('nature2', 33.455, 126.555, NATURE_TAGS),
      tagged('culture2', 33.4555, 126.5555, ['문화', '전시', '실내']),
      tagged('nature3', 33.46, 126.56, NATURE_TAGS),
      tagged('culture3', 33.4605, 126.5605, ['문화', '전시', '실내']),
    ];

    const natureDay = generateSchedule({
      keywords: ['자연'],
      candidatePlaces: places,
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    })[0];
    const cultureDay = generateSchedule({
      keywords: ['문화예술'],
      candidatePlaces: places,
      dayCount: 1,
      travelMode: 'CAR',
      dayStartOverrides: { 1: { location: START } },
    })[0];

    const natureIds = natureDay.items.map((i) => i.place.id);
    const cultureIds = cultureDay.items.map((i) => i.place.id);
    expect(natureIds).not.toEqual(cultureIds);

    // 첫 장소만이 아니라 앞쪽 절반이 각 키워드에 맞는 장소로 채워져야 한다.
    const half = Math.ceil(natureIds.length / 2);
    expect(
      natureIds.slice(0, half).every((id) => id.startsWith('nature')),
    ).toBe(true);
    expect(
      cultureIds.slice(0, half).every((id) => id.startsWith('culture')),
    ).toBe(true);
  });

  it('끼니 장소도 키워드를 반영해 고른다', () => {
    const sight = tagged('sight', 33.45, 126.55, NATURE_TAGS);
    const nearKorean: Place = {
      id: 'near-korean',
      name: 'near-korean',
      category: 'FOOD',
      location: { lat: 33.4505, lng: 126.5505 },
      tags: ['맛집', '한식'],
      popularity: 0.4,
      rating: 0.4,
    };
    const farWorld: Place = {
      id: 'far-world',
      name: 'far-world',
      category: 'FOOD',
      location: { lat: 33.47, lng: 126.57 },
      tags: ['맛집', '세계음식'],
      popularity: 0,
      rating: 0,
    };

    const [day] = generateSchedule({
      keywords: ['세계음식'],
      candidatePlaces: [sight, nearKorean, farWorld],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const foods = day.items.filter((i) => i.place.category === 'FOOD');
    expect(foods[0].place.id).toBe('far-world');
  });
});

describe('카페 슬롯 (끼니와 분리)', () => {
  // TourAPI는 contentTypeId 39를 통째로 FOOD로 주기 때문에 카페/전통찻집도 category가 FOOD다.
  // 카테고리만 보고 끼니를 고르면 저녁이 베이커리가 된다
  // (실데이터: 제주 FOOD 492곳 중 172곳이 카페, 키워드 6종 중 3종에서 끼니에 카페가 들어갔다).
  function food(id: string, lat: number, lng: number, tags: string[]): Place {
    return {
      id,
      name: id,
      category: 'FOOD',
      location: { lat, lng },
      tags,
      popularity: 0,
      rating: 0.5,
    };
  }

  function sight(id: string, lat: number, lng: number): Place {
    return {
      id,
      name: id,
      category: 'SIGHTSEEING',
      location: { lat, lng },
      tags: ['자연'],
      popularity: 0,
      rating: 0.5,
    };
  }

  const CAFE_TAGS = ['카페', '디저트', '실내'];
  const RESTAURANT_TAGS = ['맛집', '한식'];

  /** 카페가 식당보다 많고 더 가까운, 카페가 이기기 쉬운 배치. */
  function cafeHeavyPlaces(): Place[] {
    return [
      sight('sight0', 33.45, 126.55),
      sight('sight1', 33.4502, 126.5502),
      sight('sight2', 33.4504, 126.5504),
      food('cafe0', 33.4501, 126.5501, CAFE_TAGS),
      food('cafe1', 33.4503, 126.5503, CAFE_TAGS),
      food('cafe2', 33.4505, 126.5505, CAFE_TAGS),
      food('rest0', 33.452, 126.552, RESTAURANT_TAGS),
      food('rest1', 33.4522, 126.5522, RESTAURANT_TAGS),
    ];
  }

  it('점심/저녁 슬롯에는 카페가 아니라 식당이 들어간다', () => {
    const [day] = generateSchedule({
      keywords: ['카페'], // 카페 키워드여도 끼니는 식당이어야 한다
      candidatePlaces: cafeHeavyPlaces(),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const meals = day.items.filter(
      (i) =>
        i.place.category === 'FOOD' &&
        (minutesFromClock(i.startTime) >= minutesFromClock('18:00') ||
          (minutesFromClock(i.startTime) >= minutesFromClock('12:00') &&
            minutesFromClock(i.startTime) < minutesFromClock('14:00'))),
    );
    expect(meals.length).toBeGreaterThan(0);
    for (const meal of meals) {
      expect(meal.place.tags).not.toContain('카페');
    }
  });

  it('카페는 하루 최대 1곳만 배치한다', () => {
    const [day] = generateSchedule({
      keywords: ['카페'],
      candidatePlaces: cafeHeavyPlaces(),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const cafeItems = day.items.filter((i) => i.place.tags.includes('카페'));
    expect(cafeItems.length).toBeLessThanOrEqual(1);
  });

  it('카페는 오후(14:00 이후 ~ 저녁 이전)에 배치한다', () => {
    const [day] = generateSchedule({
      keywords: ['카페'],
      candidatePlaces: cafeHeavyPlaces(),
      dayCount: 1,
      travelMode: 'CAR',
    });

    const cafeItems = day.items.filter((i) => i.place.tags.includes('카페'));
    expect(cafeItems).toHaveLength(1);
    expect(minutesFromClock(cafeItems[0].startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('14:00'),
    );
    expect(minutesFromClock(cafeItems[0].startTime)).toBeLessThan(
      minutesFromClock('18:00'),
    );
  });

  it('식당이 하나도 없으면 끼니를 비우지 않고 카페라도 배치한다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [
        sight('sight0', 33.45, 126.55),
        food('cafe0', 33.4501, 126.5501, CAFE_TAGS),
        food('cafe1', 33.4503, 126.5503, CAFE_TAGS),
      ],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const lunch = day.items.find(
      (i) =>
        i.place.category === 'FOOD' &&
        minutesFromClock(i.startTime) >= minutesFromClock('12:00'),
    );
    expect(lunch).toBeDefined();
  });

  it('카페가 하나도 없어도 점심/저녁이 정상 배치된다', () => {
    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [
        sight('sight0', 33.45, 126.55),
        food('rest0', 33.4501, 126.5501, RESTAURANT_TAGS),
        food('rest1', 33.4503, 126.5503, RESTAURANT_TAGS),
      ],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const foods = day.items.filter((i) => i.place.category === 'FOOD');
    expect(foods).toHaveLength(2);
    expect(minutesFromClock(foods[0].startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('12:00'),
    );
    expect(minutesFromClock(foods[1].startTime)).toBeGreaterThanOrEqual(
      minutesFromClock('18:00'),
    );
  });
});

describe('generateSchedule - mustIncludePlaceIds ("담기")', () => {
  /** 서로 가까운 좌표들. 이동시간 때문에 마감에 걸리는 일을 피한다. */
  function near(
    id: string,
    category: Place['category'],
    offset: number,
  ): Place {
    return place(id, category, 33.45 + offset * 0.002, 126.57, 0.5, 0.5);
  }

  function scheduledIds(days: ReturnType<typeof generateSchedule>): string[] {
    return days.flatMap((day) => day.items.map((item) => item.place.id));
  }

  it('담은 장소가 후보에 밀리지 않고 일정에 들어간다', () => {
    // 담지 않은 장소가 훨씬 많고 인기도도 높다. 우선권이 없으면 밀려난다.
    const picked = near('picked', 'SIGHTSEEING', 30);
    const fillers = Array.from({ length: 20 }, (_, i) =>
      place(`filler-${i}`, 'SIGHTSEEING', 33.45 + i * 0.001, 126.57, 1, 1),
    );

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [...fillers, picked],
      dayCount: 1,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['picked']),
    });

    expect(scheduledIds(days)).toContain('picked');
  });

  it('관광지만 담아도 끼니가 채움 후보에서 들어온다', () => {
    // 결정 1: 담은 것에 식당이 없으면 자동으로 채운다.
    const picked = near('sight', 'SIGHTSEEING', 0);
    const restaurant = near('restaurant', 'FOOD', 1);

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [picked, restaurant],
      dayCount: 1,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['sight']),
    });

    expect(scheduledIds(days)).toContain('sight');
    expect(scheduledIds(days)).toContain('restaurant');
  });

  it('담은 식당이 있으면 자동 식당 대신 그것이 끼니로 쓰인다', () => {
    const pickedFood = near('picked-food', 'FOOD', 5);
    const otherFood = near('other-food', 'FOOD', 1);
    const sight = near('sight', 'SIGHTSEEING', 0);

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [sight, otherFood, pickedFood],
      dayCount: 1,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['picked-food']),
    });

    const ids = scheduledIds(days);
    expect(ids).toContain('picked-food');
    // 점심 슬롯을 담은 식당이 먼저 가져가므로, 담지 않은 식당보다 앞선다.
    if (ids.includes('other-food')) {
      expect(ids.indexOf('picked-food')).toBeLessThan(
        ids.indexOf('other-food'),
      );
    }
  });

  it('담은 곳이 일수보다 적어도 빈 일차 없이 채워진다', () => {
    // 결정 3: 3곳 담고 3일이어도 각 일차가 비지 않는다.
    const picked = ['p1', 'p2', 'p3'].map((id, i) =>
      place(id, 'SIGHTSEEING', 33.4 + i * 0.5, 126.5 + i * 0.3, 0.5, 0.5),
    );
    const fillers = Array.from({ length: 30 }, (_, i) =>
      place(
        `f-${i}`,
        'SIGHTSEEING',
        33.4 + (i % 3) * 0.5,
        126.5 + (i % 3) * 0.3 + 0.01,
        0.5,
        0.5,
      ),
    );

    const days = generateSchedule({
      keywords: [],
      candidatePlaces: [...picked, ...fillers],
      dayCount: 3,
      travelMode: 'CAR',
      mustIncludePlaceIds: new Set(['p1', 'p2', 'p3']),
    });

    expect(days).toHaveLength(3);
    for (const day of days) {
      expect(day.items.length).toBeGreaterThan(0);
    }
  });

  it('mustIncludePlaceIds가 없으면 기존 결과와 완전히 같다', () => {
    // 회귀 방지: 오마카세 경로가 바뀌면 안 된다.
    const places = Array.from({ length: 12 }, (_, i) =>
      place(
        `p-${i}`,
        i % 3 === 0 ? 'FOOD' : 'SIGHTSEEING',
        33.4 + i * 0.01,
        126.5 + i * 0.01,
        i / 12,
        0.5,
      ),
    );
    const input = {
      keywords: ['바다'],
      candidatePlaces: places,
      dayCount: 2,
      travelMode: 'CAR' as const,
    };

    expect(
      generateSchedule({ ...input, mustIncludePlaceIds: new Set() }),
    ).toEqual(generateSchedule(input));
  });
});

describe('generateSchedule / 개장 시각', () => {
  /** place()에 opensAt을 얹는다. 'HH:MM'으로 읽기 쉽게 쓴다. */
  function opening(p: Place, hhmm: string): Place {
    return { ...p, opensAt: minutesFromClock(hhmm) };
  }

  it('문 열기 전에 도착하면 개장까지 기다린다', () => {
    // 이 테스트가 이 기능을 만든 이유다. 축제가 앵커라 가장 먼저 배치되는데,
    // 시간 제약이 없을 때는 18:00에 여는 야간 행사가 09:00에 들어갔다.
    const night = opening(
      place('night', 'SIGHTSEEING', 37.5, 127, 1, 1),
      '18:00',
    );

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [night],
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items[0].place.id).toBe('night');
    expect(day.items[0].startTime).toBe('18:00');
  });

  it('이미 열려 있으면 기다리지 않는다', () => {
    const morning = opening(
      place('morning', 'SIGHTSEEING', 37.5, 127, 1, 1),
      '08:00',
    );

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [morning],
      dayCount: 1,
      travelMode: 'CAR',
    });

    // 하루 시작(09:00)에 이미 열려 있으므로 08:00로 당기지 않는다.
    expect(day.items[0].startTime).toBe('09:00');
  });

  it('개장 시각이 없으면 제약 없이 배치한다', () => {
    // 일반 장소는 영업시간을 수집하지 않아 opensAt이 비어 있다. 모르는 것에
    // 제약을 걸면 멀쩡한 장소가 빠진다.
    const plain = place('plain', 'SIGHTSEEING', 37.5, 127, 1, 1);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [plain],
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items[0].startTime).toBe('09:00');
  });

  it('기다리면 마감을 넘기는 장소는 넣지 않는다', () => {
    // 마감은 21:00이다. 22:00에 여는 곳은 기다려도 시작할 수 없다.
    const tooLate = opening(
      place('tooLate', 'SIGHTSEEING', 37.5, 127, 1, 1),
      '22:00',
    );

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [tooLate],
      dayCount: 1,
      travelMode: 'CAR',
    });

    expect(day.items.map((i) => i.place.id)).not.toContain('tooLate');
  });

  it('기다린 뒤에도 남은 장소를 이어서 채운다', () => {
    const night = opening(
      place('night', 'SIGHTSEEING', 37.5, 127, 9, 1),
      '18:00',
    );
    const nearby = place('nearby', 'SIGHTSEEING', 37.501, 127.001, 1, 1);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [night, nearby],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const ids = day.items.map((i) => i.place.id);
    expect(ids).toContain('night');
    // 야간 행사가 먼저 잡히면 그 뒤 시간이 마감에 가까워 nearby가 빠질 수 있다.
    // 어느 쪽이든 시각은 단조 증가해야 한다.
    const times = day.items.map((i) => minutesFromClock(i.startTime));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('generateSchedule - weather', () => {
  it('weather를 안 주면 기존과 동일하게 스코어 우위(야외/실내 보정 없음)로 순서가 정해진다', () => {
    const indoor = place('indoor', 'SIGHTSEEING', 37.5, 127, 0.6, 0.6);
    indoor.tags = ['실내'];
    const outdoor = place('outdoor', 'SIGHTSEEING', 37.5, 127, 0.65, 0.65);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [indoor, outdoor],
      dayCount: 1,
      travelMode: 'CAR',
    });

    // 보정이 없으면 베이스 스코어가 더 높은 outdoor가 먼저 온다.
    expect(day.items[0].place.id).toBe('outdoor');
  });

  it('weather: RAIN이면 실내 장소 보정으로 순서가 뒤집힐 수 있다', () => {
    const indoor = place('indoor', 'SIGHTSEEING', 37.5, 127, 0.6, 0.6);
    indoor.tags = ['실내'];
    const outdoor = place('outdoor', 'SIGHTSEEING', 37.5, 127, 0.65, 0.65);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [indoor, outdoor],
      dayCount: 1,
      travelMode: 'CAR',
      weather: 'RAIN',
    });

    expect(day.items[0].place.id).toBe('indoor');
  });

  it('weather: CLEAR면 야외 태그 장소 보정으로 순서가 뒤집힐 수 있다', () => {
    const outdoor = place('outdoor', 'SIGHTSEEING', 37.5, 127, 0.6, 0.6);
    outdoor.tags = ['자연'];
    const indoorish = place('indoorish', 'SIGHTSEEING', 37.5, 127, 0.65, 0.65);

    const [day] = generateSchedule({
      keywords: [],
      candidatePlaces: [outdoor, indoorish],
      dayCount: 1,
      travelMode: 'CAR',
      weather: 'CLEAR',
    });

    expect(day.items[0].place.id).toBe('outdoor');
  });
});
