import { PlaceCategory } from '../api/types';

/**
 * 카테고리 표시명. 지역명(REGION_OPTIONS)과 같은 이유로 앱에 둔다 —
 * 백엔드는 코드만 내려주고 표시명을 갖고 있지 않다
 * (infra/tour-api/tour-api-mapping.ts의 CONTENT_TYPE_TO_CATEGORY 참고).
 */
export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  SIGHTSEEING: '관광',
  FOOD: '맛집',
  ACTIVITY: '액티비티',
};
