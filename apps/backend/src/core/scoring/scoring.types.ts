export interface ScorablePlace {
  id: string;
  tags: string[];
  popularity: number;
  rating: number;
}

export interface ScoringWeights {
  tagMatch: number;
  popularity: number;
  rating: number;
}

export interface ScoredPlace<T extends ScorablePlace = ScorablePlace> {
  place: T;
  score: number;
}

/** 기상청 예보 요약(infra/weather/kma.client.ts의 SkyCondition)에서 UNKNOWN을 뺀 값.
 *  UNKNOWN은 "보정 없음"과 같은 뜻이라 스코어링까지 내려보내지 않고 호출측(schedule.service)이
 *  걸러낸다 — scorePlace/generateSchedule은 weather가 아예 없을 때와 똑같이 동작한다. */
export type WeatherCondition = 'RAIN' | 'CLEAR';
