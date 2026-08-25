import { GeoPoint, haversineDistanceMeters } from '../travel-time';

export interface ClusterablePlace {
  id: string;
  location: GeoPoint;
}

export interface DayCluster<T extends ClusterablePlace = ClusterablePlace> {
  day: number;
  places: T[];
}

function emptyClusters<T extends ClusterablePlace>(
  dayCount: number,
): DayCluster<T>[] {
  return Array.from({ length: dayCount }, (_, i) => ({
    day: i + 1,
    places: [],
  }));
}

/**
 * 그리디 방식으로 장소를 지역별로 묶어 일차(day)별 그룹으로 나눈다.
 * 1) farthest-point sampling으로 dayCount개 시드를 한 번씩만 선택 (반복/재평가 없음)
 * 2) 나머지 장소를 스코어 순으로 순회하며, 용량(capacity)이 남은 가장 가까운 클러스터에 배정
 * k-means처럼 수렴할 때까지 반복하지 않고 단일 패스로 끝나므로 "그리디"이며, 비용이 예측 가능하다.
 */
export function clusterPlacesByDay<T extends ClusterablePlace>(
  places: T[],
  dayCount: number,
): DayCluster<T>[] {
  if (dayCount <= 0) {
    return [];
  }
  if (places.length === 0) {
    return emptyClusters<T>(dayCount);
  }
  if (dayCount === 1) {
    return [{ day: 1, places: [...places] }];
  }

  const effectiveDayCount = Math.min(dayCount, places.length);

  // 1) 시드 선택: farthest-point sampling
  const seeds: T[] = [places[0]];
  const seedIndices = new Set<number>([0]);
  while (seeds.length < effectiveDayCount) {
    let bestIndex = -1;
    let bestMinDistance = -Infinity;
    for (let i = 0; i < places.length; i++) {
      if (seedIndices.has(i)) continue;
      let minDistanceToSeeds = Infinity;
      for (const seed of seeds) {
        const d = haversineDistanceMeters(places[i].location, seed.location);
        if (d < minDistanceToSeeds) minDistanceToSeeds = d;
      }
      if (minDistanceToSeeds > bestMinDistance) {
        bestMinDistance = minDistanceToSeeds;
        bestIndex = i;
      }
    }
    seeds.push(places[bestIndex]);
    seedIndices.add(bestIndex);
  }

  // 2) 용량 인지 최근접 배정
  const capacity = Math.ceil(places.length / effectiveDayCount);
  const clusters: DayCluster<T>[] = seeds.map((seed, i) => ({
    day: i + 1,
    places: [seed],
  }));
  for (let i = effectiveDayCount; i < dayCount; i++) {
    clusters.push({ day: i + 1, places: [] });
  }

  const remainingPlaces = places.filter((_, i) => !seedIndices.has(i));
  for (const place of remainingPlaces) {
    const distances = clusters
      .slice(0, effectiveDayCount)
      .map((cluster, i) => ({
        clusterIndex: i,
        distance: haversineDistanceMeters(place.location, seeds[i].location),
      }))
      .sort((a, b) => a.distance - b.distance);

    const availableTarget = distances.find(
      (d) => clusters[d.clusterIndex].places.length < capacity,
    );
    const targetIndex = (availableTarget ?? distances[0]).clusterIndex;
    clusters[targetIndex].places.push(place);
  }

  return clusters;
}
