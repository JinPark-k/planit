import { haversineDistanceMeters } from './haversine';
import { getTravelTime } from './travel-time';
import { URBAN_DISTANCE_CORRECTION_FACTOR } from './haversine';

const SEOUL_CITY_HALL = { lat: 37.5663, lng: 126.9779 };
const BUSAN_CITY_HALL = { lat: 35.1796, lng: 129.0756 };

describe('haversineDistanceMeters', () => {
  it('같은 지점 사이의 거리는 0이다', () => {
    expect(haversineDistanceMeters(SEOUL_CITY_HALL, SEOUL_CITY_HALL)).toBe(0);
  });

  it('서울-부산 직선거리가 실제 값(약 325km)에 근접한다', () => {
    const distance = haversineDistanceMeters(SEOUL_CITY_HALL, BUSAN_CITY_HALL);
    expect(distance).toBeGreaterThan(300_000);
    expect(distance).toBeLessThan(350_000);
  });
});

describe('getTravelTime', () => {
  it('직선거리에 도심 보정계수를 곱한 값을 distanceMeters로 반환한다', () => {
    const straightLine = haversineDistanceMeters(
      SEOUL_CITY_HALL,
      BUSAN_CITY_HALL,
    );
    const result = getTravelTime(SEOUL_CITY_HALL, BUSAN_CITY_HALL, 'CAR');
    expect(result.distanceMeters).toBeCloseTo(
      straightLine * URBAN_DISTANCE_CORRECTION_FACTOR,
      5,
    );
  });

  it('isEstimate는 항상 true이고 mode를 그대로 반환한다', () => {
    const result = getTravelTime(SEOUL_CITY_HALL, BUSAN_CITY_HALL, 'TRANSIT');
    expect(result.isEstimate).toBe(true);
    expect(result.mode).toBe('TRANSIT');
  });

  it('mode를 생략하면 기본값 CAR을 사용한다', () => {
    const result = getTravelTime(SEOUL_CITY_HALL, BUSAN_CITY_HALL);
    expect(result.mode).toBe('CAR');
  });

  it('같은 두 지점에 대해 WALK가 TRANSIT보다, TRANSIT이 CAR보다 오래 걸린다', () => {
    const car = getTravelTime(SEOUL_CITY_HALL, BUSAN_CITY_HALL, 'CAR').minutes;
    const transit = getTravelTime(
      SEOUL_CITY_HALL,
      BUSAN_CITY_HALL,
      'TRANSIT',
    ).minutes;
    const walk = getTravelTime(
      SEOUL_CITY_HALL,
      BUSAN_CITY_HALL,
      'WALK',
    ).minutes;
    expect(walk).toBeGreaterThan(transit);
    expect(transit).toBeGreaterThan(car);
  });
});
