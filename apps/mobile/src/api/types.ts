/**
 * 백엔드 응답/요청 타입.
 *
 * apps/backend의 DTO를 손으로 옮긴 것이다. 공유 패키지를 만들지 않은 이유는
 * 화면이 쓰는 표면이 아직 두 개(GET /keywords, POST /schedule)뿐이라
 * 패키지 하나를 유지하는 비용이 더 크기 때문. 표면이 늘면 그때 분리한다.
 */

export interface ApiError {
  statusCode: number;
  message: string;
}

/** infra/tour-api/regions.ts의 REGION_CODES 키와 같아야 한다. */
export type RegionCode = 'SEOUL' | 'BUSAN' | 'JEJU';

export type PlaceCategory = 'SIGHTSEEING' | 'FOOD' | 'ACTIVITY';

/** 이동수단. 백엔드 core/travel-time의 TRAVEL_MODES와 같아야 한다. */
export type TravelMode = 'CAR' | 'TRANSIT' | 'WALK';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  tags: string[];
  location: GeoPoint;
  address?: string;
  imageUrl?: string;
  tel?: string;
}

export interface ScheduleItem {
  place: Place;
  /** HH:MM */
  startTime: string;
  /** 이 장소에 머무는 시간(분). 카테고리별 기본값이라 추정치. */
  stayMinutes: number;
  /** 직전 장소로부터의 추정 이동시간(분). 각 일차의 첫 장소는 없다. */
  travelFromPreviousMinutes?: number;
}

export interface ScheduleDay {
  day: number;
  items: ScheduleItem[];
}

/** 목록 응답 공통 형태. total은 페이지네이션 이전의 전체 개수다. */
export interface Paged<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

/** 담았지만 일정에 넣지 못한 장소. */
export interface ExcludedPlace {
  placeId: string;
  /**
   * NOT_FOUND: 그 지역에서 찾을 수 없는 id(배치가 장소를 지웠거나 지역이 다름).
   * NO_TIME:   하루 마감까지 넣을 자리가 없었음.
   */
  reason: 'NOT_FOUND' | 'NO_TIME';
  /** NOT_FOUND는 장소 정보 자체가 없어 비어 있다. */
  place?: Place;
}

/**
 * POST /schedule/from-places 응답.
 *
 * 오마카세(POST /schedule)가 배열을 그대로 주는 것과 달리 객체로 감싸져 있다.
 * 담은 곳이 빠졌을 때 사용자에게 알려야 하기 때문이다.
 */
export interface ScheduleFromPlacesResponse {
  days: ScheduleDay[];
  excludedPlaces: ExcludedPlace[];
}

export interface GenerateScheduleRequest {
  keywords: string[];
  region: RegionCode;
  dayCount: number;
}
