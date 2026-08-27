/**
 * areaBasedList2 / searchFestival2 응답 item 셰이프.
 * 2026-08 실호출로 확인한 필드만 명시한다.
 */
export interface TourApiRawItem {
  contentid: string;
  /** 12=관광지,14=문화시설,15=축제공연행사,25=여행코스,28=레포츠,32=숙박,38=쇼핑,39=음식점 */
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  /** 경도(longitude). 위도가 아니다 — mapy와 뒤바꾸기 쉬우니 주의. 문자열로 온다. */
  mapx: string;
  /** 위도(latitude). 문자열로 온다. */
  mapy: string;
  mlevel?: string;
  /** TourAPI 지역코드(서울=1, 부산=6, 제주=39). 축제 레코드에서는 빈 문자열로 온다. */
  areacode?: string;
  sigungucode?: string;
  /** 법정동 시도코드(서울=11, 부산=26, 제주=50). areacode와 코드 체계가 다르다. */
  lDongRegnCd?: string;
  lDongSignguCd?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  lclsSystm1?: string;
  lclsSystm2?: string;
  lclsSystm3?: string;
  firstimage?: string;
  firstimage2?: string;
  cpyrhtDivCd?: string;
  tel?: string;
  createdtime?: string;
  modifiedtime?: string;
  // NOTE: overview/homepage는 areaBasedList2·searchFestival2 응답에 없다.
  //       항목별 detailCommon2 호출이 필요해 이번 범위에서 제외(호출 쿼터 비용). DB 컬럼은 null 유지.
  [key: string]: unknown;
}

/** searchFestival2 전용 추가 필드. */
export interface TourApiFestivalItem extends TourApiRawItem {
  /** YYYYMMDD */
  eventstartdate?: string;
  /** YYYYMMDD */
  eventenddate?: string;
  festivaltype?: string;
  progresstype?: string;
}

/** 공공데이터포털 공통 응답 봉투(_type=json). */
export interface TourApiResponse<TItem = TourApiRawItem> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      /** totalCount가 0이면 객체가 아니라 빈 문자열("")로 온다. 반드시 분기 처리할 것. */
      items: { item?: TItem[] } | '';
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}
