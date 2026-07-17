import {
  haversineDistanceMeters,
  URBAN_DISTANCE_CORRECTION_FACTOR,
} from './haversine';
import { GeoPoint, TravelMode, TravelTimeResult } from './travel-time.types';

// TODO: 실제 경로 데이터(카카오모빌리티/구글 Directions 등)로 교체 시 이 파일 내부만 수정한다.
// 스코어링/클러스터링 로직은 이 함수의 반환 형태(TravelTimeResult)만 알면 되므로 건드리지 않는다.
const AVERAGE_SPEED_KMH: Record<TravelMode, number> = {
  CAR: 25,
  TRANSIT: 20,
  WALK: 4.5,
};

/**
 * MVP: 하버사인 거리 + 도심 보정계수로 이동시간을 근사한다.
 * 화면에는 항상 "약 n분" 형태의 추정치임을 표시할 것.
 */
export function getTravelTime(
  placeA: GeoPoint,
  placeB: GeoPoint,
  mode: TravelMode = 'CAR',
): TravelTimeResult {
  const straightLineDistance = haversineDistanceMeters(placeA, placeB);
  const distanceMeters =
    straightLineDistance * URBAN_DISTANCE_CORRECTION_FACTOR;
  const speedKmh = AVERAGE_SPEED_KMH[mode];
  const minutes = Math.ceil((distanceMeters / 1000 / speedKmh) * 60);

  return {
    minutes,
    distanceMeters,
    mode,
    isEstimate: true,
  };
}
