/**
 * 키워드 -> 태그 매핑 테이블.
 * TODO: 실제 서비스 키워드/태그 체계가 확정되면 채운다 (현재는 예시 스켈레톤).
 */
export const KEYWORD_TAG_MAP: Record<string, string[]> = {
  // 예: '바다': ['해변', '자연', '뷰맛집'],
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
