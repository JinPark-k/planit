import { apiFetch } from './client';
import { Festival, Paged, RegionCode } from './types';

/**
 * 홈에 한 번에 받아올 개수.
 *
 * 진행·예정 축제가 전국 274건(2026-09-04 실측)이라 서버 상한 100이면 넉넉하다.
 * 40이면 스크롤로 훑을 만하고, 더 필요해지면 offset으로 "더 보기"를 붙인다.
 */
const FESTIVAL_LIMIT = 40;

/**
 * 아직 끝나지 않은 축제를 임박한 순으로.
 *
 * 지역을 넘기지 않으면 전국이다. 홈은 전국을 쓴다 — 축제는 시기를 타서 한
 * 지역만 보면 목록이 빈약해진다(제주 6건).
 */
export function fetchFestivals(region?: RegionCode): Promise<Paged<Festival>> {
  const params = new URLSearchParams({ limit: String(FESTIVAL_LIMIT) });
  if (region) params.set('region', region);
  return apiFetch<Paged<Festival>>(`/festivals?${params.toString()}`);
}
