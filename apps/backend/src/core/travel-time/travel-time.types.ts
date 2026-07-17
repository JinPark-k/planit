export interface GeoPoint {
  lat: number;
  lng: number;
}

export type TravelMode = 'CAR' | 'TRANSIT' | 'WALK';

export interface TravelTimeResult {
  /** 추정 이동시간(분). 화면에는 "약 n분" 형태로 표시할 것 */
  minutes: number;
  distanceMeters: number;
  mode: TravelMode;
  /** MVP는 하버사인 근사치이므로 항상 true. 실제 경로 데이터로 교체되면 false로 전환 */
  isEstimate: true;
}
