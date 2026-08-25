import { clusterPlacesByDay, ClusterablePlace } from './clustering';

function place(id: string, lat: number, lng: number): ClusterablePlace {
  return { id, location: { lat, lng } };
}

// 서울 근처 좌표 그룹 vs 부산 근처 좌표 그룹 (지리적으로 확실히 분리됨)
const SEOUL_GROUP: ClusterablePlace[] = [
  place('seoul-1', 37.5665, 126.978),
  place('seoul-2', 37.5651, 126.9895),
  place('seoul-3', 37.5796, 126.977),
];
const BUSAN_GROUP: ClusterablePlace[] = [
  place('busan-1', 35.1796, 129.0756),
  place('busan-2', 35.1587, 129.1604),
  place('busan-3', 35.0951, 129.0409),
];

describe('clusterPlacesByDay', () => {
  it('dayCount가 0 이하면 빈 배열을 반환한다', () => {
    expect(clusterPlacesByDay(SEOUL_GROUP, 0)).toEqual([]);
    expect(clusterPlacesByDay(SEOUL_GROUP, -1)).toEqual([]);
  });

  it('장소가 없으면 dayCount만큼 빈 클러스터를 반환한다', () => {
    const result = clusterPlacesByDay([], 3);
    expect(result).toEqual([
      { day: 1, places: [] },
      { day: 2, places: [] },
      { day: 3, places: [] },
    ]);
  });

  it('dayCount가 1이면 전체를 하나의 클러스터로, 입력 순서를 유지한다', () => {
    const result = clusterPlacesByDay(SEOUL_GROUP, 1);
    expect(result).toEqual([{ day: 1, places: SEOUL_GROUP }]);
  });

  it('dayCount가 장소 수보다 많으면 정확히 dayCount개를 반환하고 초과분은 비운다', () => {
    const places = [place('a', 37.5, 127), place('b', 37.6, 127.1)];
    const result = clusterPlacesByDay(places, 5);
    expect(result).toHaveLength(5);
    expect(result[0].places).toHaveLength(1);
    expect(result[1].places).toHaveLength(1);
    expect(result[2].places).toEqual([]);
    expect(result[3].places).toEqual([]);
    expect(result[4].places).toEqual([]);
  });

  it('지리적으로 분리된 두 그룹을 서로 다른 날짜로 나누고 섞지 않는다', () => {
    const all = [...SEOUL_GROUP, ...BUSAN_GROUP];
    const result = clusterPlacesByDay(all, 2);
    expect(result).toHaveLength(2);

    const seoulIds = new Set(SEOUL_GROUP.map((p) => p.id));
    const busanIds = new Set(BUSAN_GROUP.map((p) => p.id));

    for (const cluster of result) {
      const clusterIds = cluster.places.map((p) => p.id);
      const allSeoul = clusterIds.every((id) => seoulIds.has(id));
      const allBusan = clusterIds.every((id) => busanIds.has(id));
      expect(allSeoul || allBusan).toBe(true);
    }
  });

  it('용량(capacity)을 초과하는 클러스터가 없다 (강제 배정 예외 제외)', () => {
    const places = Array.from({ length: 9 }, (_, i) =>
      place(`p${i}`, 37.5 + i * 0.01, 127 + i * 0.01),
    );
    const dayCount = 3;
    const capacity = Math.ceil(places.length / dayCount);
    const result = clusterPlacesByDay(places, dayCount);
    for (const cluster of result) {
      expect(cluster.places.length).toBeLessThanOrEqual(capacity);
    }
  });

  it('입력된 모든 장소가 정확히 한 번씩만 결과에 등장한다 (누락/중복 없음)', () => {
    const all = [...SEOUL_GROUP, ...BUSAN_GROUP];
    const result = clusterPlacesByDay(all, 3);
    const resultIds = result.flatMap((c) => c.places.map((p) => p.id));
    expect(resultIds.sort()).toEqual(all.map((p) => p.id).sort());
  });

  it('동일 입력에 대해 결정적으로 동일한 결과를 반환한다', () => {
    const all = [...SEOUL_GROUP, ...BUSAN_GROUP];
    const result1 = clusterPlacesByDay(all, 2);
    const result2 = clusterPlacesByDay(all, 2);
    expect(result1).toEqual(result2);
  });
});
