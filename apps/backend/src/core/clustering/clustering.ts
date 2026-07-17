import { GeoPoint } from '../travel-time';

export interface ClusterablePlace {
  id: string;
  location: GeoPoint;
}

export interface DayCluster<T extends ClusterablePlace = ClusterablePlace> {
  day: number;
  places: T[];
}

/**
 * 그리디 방식으로 장소를 지역별로 묶어 일차(day)별 그룹으로 나눈다.
 * TODO: 시드 선택 전략, 클러스터당 최대 장소 수, 일수(dayCount) 결정 로직을 구현한다.
 */
export function clusterPlacesByDay<T extends ClusterablePlace>(
  _places: T[],
  _dayCount: number,
): DayCluster<T>[] {
  throw new Error('Not implemented: clusterPlacesByDay');
}
