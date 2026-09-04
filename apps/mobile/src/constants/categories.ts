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

/**
 * 카테고리 필터 칩의 순서. 목업 03의 탭 순서를 따른다.
 *
 * 목업에는 "카페" 탭도 있지만 넣지 않는다. 카페는 카테고리가 아니라 태그라서
 * (백엔드 PlaceCategory는 관광/맛집/액티비티 셋뿐) 여기 섞으면 한 줄 안에
 * 성격이 다른 두 필터가 공존하게 된다. 카페는 키워드 칩으로 고른다.
 */
export const CATEGORY_OPTIONS: readonly {
  code: PlaceCategory;
  label: string;
}[] = [
  { code: 'SIGHTSEEING', label: CATEGORY_LABELS.SIGHTSEEING },
  { code: 'FOOD', label: CATEGORY_LABELS.FOOD },
  { code: 'ACTIVITY', label: CATEGORY_LABELS.ACTIVITY },
];
