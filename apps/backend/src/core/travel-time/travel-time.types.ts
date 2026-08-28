export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * 런타임에서도 목록이 필요해 const 배열로 두고 타입을 파생시킨다
 * (요청 검증/Swagger 문서는 타입만으로는 값 목록을 알 수 없다).
 */
export const TRAVEL_MODES = ['CAR', 'TRANSIT', 'WALK'] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface TravelTimeResult {
  /** 추정 이동시간(분). 화면에는 "약 n분" 형태로 표시할 것 */
  minutes: number;
  distanceMeters: number;
  mode: TravelMode;
  /** MVP는 하버사인 근사치이므로 항상 true. 실제 경로 데이터로 교체되면 false로 전환 */
  isEstimate: true;
}
