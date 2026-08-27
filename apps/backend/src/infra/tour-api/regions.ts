/**
 * TourAPI areaCode.
 * 2026-08 areaBasedList2(contentTypeId=12) 실호출로 검증: SEOUL=1(395건), BUSAN=6(141건), JEJU=39(329건).
 */
export const REGION_CODES = {
  SEOUL: '1',
  BUSAN: '6',
  JEJU: '39',
} as const;

/**
 * 법정동 시도코드(lDongRegnCd). TourAPI areaCode와 코드 체계가 다르다.
 * 축제(searchFestival2) 레코드는 areacode/sigungucode가 빈 문자열로 와서
 * areaCode 필터가 0건이 되므로, 전국을 받아 이 코드로 필터링한다.
 */
export const REGION_LDONG_CODES = {
  SEOUL: '11',
  BUSAN: '26',
  JEJU: '50',
} as const;

export type RegionCode = keyof typeof REGION_CODES;
