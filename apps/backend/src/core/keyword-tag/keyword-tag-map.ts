/**
 * 키워드 -> 태그 매핑 테이블.
 *
 * 여기 쓰이는 태그는 반드시 수집 단계에서 실제로 생성 가능한 태그여야 한다
 * (infra/tour-api/tour-api-mapping.ts의 DERIVABLE_TAGS).
 * 도출 불가능한 태그는 확정적 non-match이면서 scorePlace의 tagMatchRatio 분모만 키워
 * 점수를 조용히 깎기 때문이다. 검증은 batch/keyword-tag-coverage.spec.ts에서 한다.
 *
 * NOTE: core/는 데이터 소스에 의존하지 않아야 하므로 이 파일은 mapping 모듈을 import하지 않는다.
 * TODO: 실제 서비스 키워드 체계가 확정되면 재검토 (현재는 MVP 시드 데이터).
 */
export const KEYWORD_TAG_MAP: Record<string, string[]> = {
  바다: ['해변', '자연'],
  산: ['산', '등산', '자연'],
  자연: ['자연', '산책', '공원'],
  힐링: ['산책', '자연', '공원'],
  야외활동: ['자연', '산책', '액티비티'],
  맛집: ['맛집', '한식'],
  세계음식: ['맛집', '세계음식'],
  카페: ['카페', '디저트'],
  액티비티: ['액티비티', '체험', '레저'],
  수상레저: ['수상레저', '해변', '액티비티'],
  전통: ['전통', '역사', '문화재'],
  역사: ['역사', '문화재'],
  건축: ['건축', '문화'],
  문화예술: ['문화', '전시', '공연'],
  전시관람: ['전시', '문화', '실내'],
  축제: ['축제', '공연'],
  실내: ['실내', '전시', '문화'],
  가족여행: ['체험', '공원', '실내'],
  데이트: ['카페', '산책', '전시'],
};

/**
 * 선택 가능한 키워드 목록. 화면이 키워드를 하드코딩하지 않도록 API로 노출한다
 * (KEYWORD_TAG_MAP을 고치면 화면이 자동으로 따라간다).
 */
export const KEYWORD_LIST = Object.keys(KEYWORD_TAG_MAP);

export function resolveTagsForKeywords(keywords: string[]): string[] {
  const tags = new Set<string>();
  for (const keyword of keywords) {
    for (const tag of KEYWORD_TAG_MAP[keyword] ?? []) {
      tags.add(tag);
    }
  }
  return [...tags];
}
