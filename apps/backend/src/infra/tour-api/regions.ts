/**
 * places.region_code에 저장되는 값. 출처는 TourAPI areaCode다.
 *
 * NOTE: 수집 쿼리에는 더 이상 쓰지 않는다 — areacode가 비어 있는 레코드를 놓치는 문제로
 * 수집 필터는 REGION_LDONG_CODES로 옮겼다(tour-api.client.ts 참고).
 * 저장/조회 키로는 그대로 유지해, 이미 적재된 행과 호환을 깨지 않는다.
 */
export const REGION_CODES = {
  SEOUL: '1',
  BUSAN: '6',
  JEJU: '39',
  GANGWON: '32',
  GYEONGBUK: '35',
  // 전남광주통합특별시에는 쓸 수 있는 areaCode가 없다. areaCode2는 아직 구 체계라
  // 광주(5)/전라남도(38)를 따로 주는데, 그 두 코드로 조회하면 0건이 나온다
  // (실측 2026-09-04: areaCode=38도 areaCode=5도 축제 0건).
  // 실제 데이터는 통합 시도로만 존재하므로 여기서는 lDong 코드를 저장 키로 쓴다.
  //
  // JEONNAM/GWANGJU가 같은 코드를 공유하는 이유: 두 지역은 실제로 행정 통합됐지만
  // (통합을 사실로 전제하고 서비스가 하나의 지역으로만 노출하면, 아직 통합되지 않은
  // 다른 광역시-도 쌍과의 형평 문제가 생긴다는 논의가 있었다) 전남/광주를 계속 별개
  // 지역으로 노출하기로 했다. 조회/저장은 이 공유 코드 하나로 하고, 구분은 저장된
  // addr1을 읽는 시점에 한다 — classifyJeonnamGwangju 참고.
  JEONNAM: '12',
  GWANGJU: '12',
  GYEONGGI: '31',
  INCHEON: '2',
  DAEJEON: '3',
  DAEGU: '4',
  ULSAN: '7',
  CHUNGBUK: '33',
  CHUNGNAM: '34',
  JEONBUK: '37',
  GYEONGNAM: '36',
} as const;

/**
 * 법정동 시도코드(lDongRegnCd). TourAPI areaCode와 코드 체계가 다르다.
 * TourAPI의 지역 필터로 사용하는 코드 — areacode 필드가 비어 있는 레코드가 많아
 * areaCode로 조회하면 그만큼이 통째로 누락된다(제주 920 -> 1512건).
 *   - areaBasedList2: 쿼리 파라미터로 전달
 *   - searchFestival2: 전국을 받아 응답의 lDongRegnCd로 필터링
 */
export const REGION_LDONG_CODES = {
  SEOUL: '11',
  BUSAN: '26',
  JEJU: '50',
  GANGWON: '51',
  GYEONGBUK: '47',
  // 전남과 광주가 통합되며 생긴 새 코드다. 기존 전남(46)/광주(29)로 조회하면
  // 한 건도 잡히지 않는다 - 조용히 통째로 누락되므로 주의.
  // JEONNAM/GWANGJU 둘 다 이 코드로 조회한다(REGION_CODES 주석 참고) — 배치는
  // 어느 한쪽 키로만 실행해도 두 지역 데이터가 전부 들어온다.
  JEONNAM: '12',
  GWANGJU: '12',
  GYEONGGI: '41',
  INCHEON: '28',
  DAEJEON: '30',
  DAEGU: '27',
  ULSAN: '31',
  CHUNGBUK: '43',
  CHUNGNAM: '44',
  JEONBUK: '52',
  GYEONGNAM: '48',
} as const;

export type RegionCode = keyof typeof REGION_CODES;

/** 요청 검증/Swagger 문서용 런타임 목록. REGION_CODES에 지역을 추가하면 자동으로 따라간다. */
export const REGION_CODE_LIST = Object.keys(REGION_CODES) as RegionCode[];

/** JEONNAM과 GWANGJU가 공유하는 db 코드. */
const JEONNAM_GWANGJU_DB_CODE: string = REGION_CODES.JEONNAM;

/**
 * places.region_code 값에서 지역 키를 되찾는다.
 *
 * 축제 조회는 지역을 고르지 않고 전국을 한 번에 읽으므로, row의 region_code를
 * 앱이 쓰는 키(SEOUL 등)로 되돌려야 한다. REGION_CODES에서 파생시켜
 * 지역을 추가할 때 이쪽을 빼먹는 일이 없게 한다.
 *
 * JEONNAM_GWANGJU_DB_CODE는 일부러 뺀다 — JEONNAM/GWANGJU 둘 다 이 코드를 쓰므로
 * 역방향이 1:1이 아니다. 이 코드로 조회하면 여기서는 undefined가 나오게 해서
 * (뒤에 오는 GWANGJU가 조용히 이기는 대신) regionFromDbRow를 쓰도록 강제한다.
 */
export const REGION_BY_DB_CODE: Readonly<Record<string, RegionCode>> =
  Object.fromEntries(
    Object.entries(REGION_CODES)
      .filter(([, dbCode]) => dbCode !== JEONNAM_GWANGJU_DB_CODE)
      .map(([key, dbCode]) => [dbCode, key as RegionCode]),
  );

/**
 * 주소에서 전남/광주를 가른다.
 *
 * 통합 이후에도 시군구 표기 자체는 안 바뀌었다 — 광주 자치구 5곳(동구/서구/남구/
 * 북구/광산구)은 전부 "구"로 끝나고, 전남 22개 시/군은 전부 "시"나 "군"으로
 * 끝난다. 시도명(첫 토큰)은 못 쓴다 — 광주 주소도 통합 시도명인
 * "전남광주통합특별시"로 나와 시도 토큰만으로는 구분이 안 된다
 * (locality.ts가 같은 이유로 광주를 METRO_SIDO_PREFIXES에서 뺐다).
 *
 * addr1이 없거나 형식을 못 읽으면 JEONNAM으로 둔다 — 전남이 22개 시/군으로 더
 * 넓어 오분류 영향이 작다.
 */
export function classifyJeonnamGwangju(
  addr1: string | null | undefined,
): 'JEONNAM' | 'GWANGJU' {
  const sigungu = (addr1 ?? '').trim().split(/\s+/)[1] ?? '';
  return sigungu.endsWith('구') ? 'GWANGJU' : 'JEONNAM';
}

/**
 * places.region_code(+addr1)에서 앱이 쓰는 지역 키를 되찾는다.
 * REGION_BY_DB_CODE만으로는 JEONNAM_GWANGJU_DB_CODE를 못 되돌리므로 이 함수를 쓴다.
 */
export function regionFromDbRow(
  dbRegionCode: string,
  addr1: string | null | undefined,
): RegionCode | undefined {
  if (dbRegionCode === JEONNAM_GWANGJU_DB_CODE) {
    return classifyJeonnamGwangju(addr1);
  }
  return REGION_BY_DB_CODE[dbRegionCode];
}

/** db 코드를 공유해 조회 후 addr1로 다시 나눠야 하는 지역 키. */
export const SHARED_DB_CODE_REGIONS: ReadonlySet<RegionCode> = new Set([
  'JEONNAM',
  'GWANGJU',
]);
