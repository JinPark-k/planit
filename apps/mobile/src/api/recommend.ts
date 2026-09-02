import { apiFetch } from './client';
import { Paged, Place, RegionCode } from './types';

/**
 * 한 번에 받아올 개수.
 *
 * 서버 상한은 100이다. 50이면 하루 4곳 × 5일(권장 상한 20곳)을 고르기에 넉넉하고,
 * 이미지가 붙은 카드 50장은 스크롤로 훑을 만한 양이다.
 * 더 필요해지면 offset으로 "더 보기"를 붙일 수 있다.
 */
const RECOMMEND_LIMIT = 50;

/**
 * 키워드 스코어링 순 추천 장소.
 * 조회지만 keywords가 배열이라 백엔드가 POST를 쓴다.
 */
export function fetchRecommendations(
  region: RegionCode,
  keywords: string[],
): Promise<Paged<Place>> {
  return apiFetch<Paged<Place>>('/recommend', {
    method: 'POST',
    body: JSON.stringify({ region, keywords, limit: RECOMMEND_LIMIT }),
  });
}
