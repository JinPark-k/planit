/**
 * 축제가 열리는 곳이 얼마나 "지방"인지.
 *
 * 제안서가 내세운 사회적 가치가 지역 소멸 극복과 대도시 집중 완화이고,
 * 차별성 표에도 "소규모 지역 특화, 숨은 축제 우선"이라고 적혀 있다.
 * 홈 목록에서 그 우선순위를 실제로 구현하는 값이다.
 *
 * popularity 컬럼을 쓰지 못한다. 실데이터가 전 행 0이고 rating도 전 행 0.5라
 * 정렬 신호가 되지 않는다(scoring.ts의 TODO에도 같은 지적이 있다).
 * 대신 100% 채워져 있는 주소를 쓴다.
 */
export const LOCALITY_TIERS = ['RURAL', 'CITY', 'METRO'] as const;
export type LocalityTier = (typeof LOCALITY_TIERS)[number];

/**
 * 특별시·광역시 시도명 접두사.
 *
 * endsWith('광역시')로 판별하면 안 된다 — 실데이터에 "서울특별"처럼 잘린
 * 표기가 섞여 있어(2026-09-06 실측) 서울 축제가 지방으로 분류된다.
 *
 * 광주는 넣지 않는다. 전남과 통합되어 "전남광주통합특별시"가 되었고,
 * 그 시도명은 "전남"으로 시작해 여기 어느 접두사와도 겹치지 않는다.
 */
const METRO_SIDO_PREFIXES = [
  '서울',
  '부산',
  '대구',
  '인천',
  '대전',
  '울산',
  '세종',
] as const;

/** 정렬용 순위. 작을수록 앞이다. */
export const LOCALITY_RANK: Readonly<Record<LocalityTier, number>> = {
  RURAL: 0,
  CITY: 1,
  METRO: 2,
};

/**
 * 주소에서 행정 단위를 읽는다.
 *
 * 광역시 안의 군(대구 달성군, 부산 기장군)은 RURAL로 보지 않는다. 행정 단위는
 * 군이지만 지역 소멸 담론의 대상이 아니고, 그대로 두면 대도시 축제가 목록
 * 맨 앞을 차지한다.
 */
export function localityTier(address: string | null | undefined): LocalityTier {
  const parts = (address ?? '').trim().split(/\s+/);
  const sido = parts[0] ?? '';
  const sigungu = parts[1] ?? '';

  if (METRO_SIDO_PREFIXES.some((prefix) => sido.startsWith(prefix))) {
    return 'METRO';
  }
  if (sigungu.endsWith('군')) return 'RURAL';
  // 주소를 읽지 못하면 중간값으로 둔다. 알 수 없는 것을 맨 앞에 올릴 이유가 없다.
  return 'CITY';
}

export function localityRank(address: string | null | undefined): number {
  return LOCALITY_RANK[localityTier(address)];
}
