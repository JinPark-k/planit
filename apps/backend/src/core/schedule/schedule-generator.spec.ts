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
    const nearIrrelevantFood: Place = {
      id: 'near-food',
      name: 'near-food',
      category: 'FOOD',
      location: { lat: 33.4505, lng: 126.5505 },
      tags: ['맛집', '한식'],
      popularity: 0.4,
      rating: 0.4,
    };
    const farCafe: Place = {
      id: 'far-cafe',
      name: 'far-cafe',
      category: 'FOOD',
      location: { lat: 33.47, lng: 126.57 },
      tags: ['카페', '디저트'],
      popularity: 0,
      rating: 0,
    };

    const [day] = generateSchedule({
      keywords: ['카페'],
      candidatePlaces: [sight, nearIrrelevantFood, farCafe],
      dayCount: 1,
      travelMode: 'CAR',
    });

    const foods = day.items.filter((i) => i.place.category === 'FOOD');
    expect(foods[0].place.id).toBe('far-cafe');
  });
});
