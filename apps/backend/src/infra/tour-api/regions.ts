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
} as const;

export type RegionCode = keyof typeof REGION_CODES;

/** 요청 검증/Swagger 문서용 런타임 목록. REGION_CODES에 지역을 추가하면 자동으로 따라간다. */
export const REGION_CODE_LIST = Object.keys(REGION_CODES) as RegionCode[];
