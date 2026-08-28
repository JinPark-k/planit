import { GeoPoint, TravelMode } from '../travel-time';

/** 런타임 목록이 필요해 const 배열로 두고 타입을 파생시킨다(요청 검증/Swagger 문서용). */
export const PLACE_CATEGORIES = ['SIGHTSEEING', 'FOOD', 'ACTIVITY'] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export interface Place {
  id: string;
  name: string;
  location: GeoPoint;
  category: PlaceCategory;
  tags: string[];
  popularity: number;
  rating: number;
}

export interface ScheduleItem {
  place: Place;
  /** ISO time string, e.g. "10:00" */
  startTime: string;
  /** 직전 장소로부터의 이동시간(분). 첫 장소는 undefined */
  travelFromPreviousMinutes?: number;
}

export interface ScheduleDay {
  day: number;
  items: ScheduleItem[];
}

export interface DayStartOverride {
  /** 지정 시 이 위치를 해당 일차의 시작 지점으로 사용 (예: 숙소, 기차역, 터미널).
   *  일정 아이템(장소)으로 표시되지 않고, 그 지점부터 첫 장소까지의 이동시간 계산에만 쓰인다. */
  location?: GeoPoint;
  /** 지정 시 이 시각부터 일정 시작 (예: 기차 도착시간). "HH:MM" 형식. 미지정 시 기본 시작 시각(09:00). */
  time?: string;
}

export interface GenerateScheduleInput {
  keywords: string[];
  candidatePlaces: Place[];
  dayCount: number;
  travelMode: TravelMode;
  /** 일차별 시작 지점/시각 오버라이드. key: day 번호(1부터). 지정 안 한 일차는 기본값
   *  (점수 1위 장소부터 시작, 09:00) 사용. 예: {1: {location: 기차역좌표, time: '10:30'}} */
  dayStartOverrides?: Record<number, DayStartOverride>;
}
