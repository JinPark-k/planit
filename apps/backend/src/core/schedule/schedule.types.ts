import { GeoPoint, TravelMode } from '../travel-time';

export type PlaceCategory = 'SIGHTSEEING' | 'FOOD' | 'ACTIVITY';

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

export interface GenerateScheduleInput {
  keywords: string[];
  candidatePlaces: Place[];
  dayCount: number;
  travelMode: TravelMode;
}
