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

export interface ClusterOptions {
  /**
   * 반드시 일정에 넣어야 하는 장소의 id("담기"로 고른 것).
   *
   * 이 장소들이 일차의 지리적 중심을 정한다. 시드를 여기서 먼저 뽑고 배정도 먼저 하므로,
   * 사용자가 고른 곳을 중심으로 하루가 짜이고 나머지는 그 주변에서 채워진다.
   * 비어 있으면 아래 로직이 전부 "전체 풀"로 되돌아가 기존 동작과 같아진다.
   */
  mustIncludeIds?: ReadonlySet<string>;
}

/**
 * 그리디 방식으로 장소를 지역별로 묶어 일차(day)별 그룹으로 나눈다.
 * 1) farthest-point sampling으로 dayCount개 시드를 한 번씩만 선택 (반복/재평가 없음)
 * 2) 나머지 장소를 스코어 순으로 순회하며, 용량(capacity)이 남은 가장 가까운 클러스터에 배정
 * k-means처럼 수렴할 때까지 반복하지 않고 단일 패스로 끝나므로 "그리디"이며, 비용이 예측 가능하다.
 *
 * options.mustIncludeIds를 주면 그 장소들이 시드와 배정에서 우선권을 갖는다(위 설명 참고).
 */
export function clusterPlacesByDay<T extends ClusterablePlace>(
  places: T[],
  dayCount: number,
  options: ClusterOptions = {},
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

  const mustIncludeIds = options.mustIncludeIds;
  const isMustInclude = (place: T): boolean =>
    mustIncludeIds !== undefined && mustIncludeIds.has(place.id);
  const mustIncludeIndices = places
    .map((place, i) => (isMustInclude(place) ? i : -1))
    .filter((i) => i >= 0);

  // 1) 시드 선택: farthest-point sampling
  //
  // 담은 장소가 있으면 그 안에서 먼저 뽑고, 일수를 못 채우면 전체 풀에서 이어 뽑는다.
  // 담은 장소가 없으면 후보가 항상 전체 풀이라 기존과 동일하게 동작한다.
  const seedIndices = new Set<number>();
  const seeds: T[] = [];

  const seedCandidates = (): number[] => {
    const pending = mustIncludeIndices.filter((i) => !seedIndices.has(i));
    if (pending.length > 0) return pending;
    return places.map((_, i) => i).filter((i) => !seedIndices.has(i));
  };

  const addSeed = (index: number): void => {
    seeds.push(places[index]);
    seedIndices.add(index);
  };

  addSeed(seedCandidates()[0]);

  while (seeds.length < effectiveDayCount) {
    let bestIndex = -1;
    let bestMinDistance = -Infinity;
    for (const i of seedCandidates()) {
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
    addSeed(bestIndex);
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

  // 담은 장소를 먼저 배정한다. 나중에 돌리면 용량이 찬 클러스터에 밀려
  // 가장 가까운 일차가 아닌 곳으로 갈 수 있다.
  const unseeded = places.filter((_, i) => !seedIndices.has(i));
  const remainingPlaces = [
    ...unseeded.filter(isMustInclude),
    ...unseeded.filter((place) => !isMustInclude(place)),
  ];
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
