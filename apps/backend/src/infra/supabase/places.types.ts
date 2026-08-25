import { PlaceCategory } from '../../core/schedule/schedule.types';

/** `places` 테이블 row 셰이프. supabase-js 조회 결과 타이핑에 사용. */
export interface PlaceRow {
  id: string;
  content_id: string;
  content_type_id: string | null;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
  addr1: string | null;
  addr2: string | null;
  tel: string | null;
  overview: string | null;
  homepage: string | null;
  image_url: string | null;
  raw_response: Record<string, unknown> | null;
  name: string;
  lat: number;
  lng: number;
  region_code: string;
  sigungu_code: string | null;
  category: PlaceCategory | null;
  tags: string[];
  popularity: number;
  rating: number;
  created_at: string;
  last_synced_at: string;
}

/** `region_visitor_stats` 테이블 row 셰이프. */
export interface RegionVisitorStatsRow {
  id: number;
  region_code: string;
  sigungu_code: string | null;
  stat_base_date: string;
  visitor_count: number;
  source: string;
  created_at: string;
  last_synced_at: string;
}
