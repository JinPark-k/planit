import { TourApiRawItem } from './tour-api.types';

const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

/**
 * TODO: 실제 TourAPI 엔드포인트(지역기반 관광정보조회 등) 연동.
 * 공공데이터포털 서비스키(TOUR_API_KEY)와 파라미터(areaCode 등)를 사용해 구현한다.
 */
export function fetchPlacesByRegion(
  _areaCode: string,
): Promise<TourApiRawItem[]> {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('Missing TOUR_API_KEY in environment'));
  }

  return Promise.reject(
    new Error(
      `Not implemented: fetchPlacesByRegion (base url: ${TOUR_API_BASE_URL})`,
    ),
  );
}
