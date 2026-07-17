// TODO: TourAPI(공공데이터포털) 공식 areaCode 값으로 재검증 필요
export const REGION_CODES = {
  SEOUL: '1',
  BUSAN: '6',
  JEJU: '39',
} as const;

export type RegionCode = keyof typeof REGION_CODES;
