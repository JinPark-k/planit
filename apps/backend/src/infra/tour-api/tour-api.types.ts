export interface TourApiRawItem {
  contentid: string;
  title: string;
  mapx: string;
  mapy: string;
  areacode: string;
  // TODO: TourAPI 공식 응답 스펙에 맞춰 필드 보강 (공공데이터포털 문서 참고)
  [key: string]: unknown;
}
