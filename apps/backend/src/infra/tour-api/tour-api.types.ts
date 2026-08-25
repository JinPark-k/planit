export interface TourApiRawItem {
  contentid: string;
  contenttypeid: string; // 12=관광지,14=문화시설,15=축제공연행사,25=여행코스,28=레포츠,32=숙박,38=쇼핑,39=음식점
  title: string;
  addr1?: string;
  addr2?: string;
  mapx: string; // 경도
  mapy: string; // 위도
  areacode: string;
  sigungucode?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  firstimage?: string;
  tel?: string;
  overview?: string;
  homepage?: string;
  // TODO: detailIntro 등 콘텐츠타입별 추가 필드는 필요 시 확장 (영업시간 등은 현재 범위 아님)
  [key: string]: unknown;
}
