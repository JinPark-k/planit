/**
 * 키워드 -> 태그 매핑 테이블.
 * TODO: 실제 서비스 키워드/태그 체계가 확정되면 재검토한다 (현재는 MVP 시드 데이터).
 */
export const KEYWORD_TAG_MAP: Record<string, string[]> = {
  바다: ['해변', '자연', '뷰맛집'],
  산: ['등산', '자연', '전망'],
  맛집: ['맛집', '로컬맛집'],
  카페: ['카페', '디저트', '뷰맛집'],
  액티비티: ['체험', '액티비티', '레저'],
  힐링: ['자연', '조용함', '산책'],
  데이트: ['뷰맛집', '카페', '야경'],
  가족여행: ['가족', '체험', '실내'],
  인생샷: ['포토스팟', '뷰맛집', '인생샷'],
  전통: ['전통', '역사', '문화재'],
  야경: ['야경', '뷰맛집'],
  전통시장: ['전통시장', '맛집', '로컬'],
};

export function resolveTagsForKeywords(keywords: string[]): string[] {
  const tags = new Set<string>();
  for (const keyword of keywords) {
    for (const tag of KEYWORD_TAG_MAP[keyword] ?? []) {
      tags.add(tag);
    }
  }
  return [...tags];
}
