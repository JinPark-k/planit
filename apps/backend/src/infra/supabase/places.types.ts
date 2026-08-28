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
  /** 'YYYY-MM-DD'. 축제(contentTypeId=15)만 non-null. */
  event_start_date: string | null;
  event_end_date: string | null;
  created_at: string;
  last_synced_at: string;
}

/**
 * 목록 조회에서 실제로 읽는 컬럼.
 *
 * `select('*')`을 쓰면 raw_response(jsonb)까지 딸려온다. 제주 930건 기준 전송량 966kB 중
 * 657kB(68%)가 raw_response이고 런타임에 아무도 읽지 않는다(재정제용 보관 컬럼).
 * cat1~3/overview/homepage/created_at 등도 조회 경로에서는 쓰이지 않는다.
 *
 * 배열과 타입을 한 곳에서 파생시켜 쿼리 문자열과 타입이 어긋나지 않게 한다.
 */
export const PLACE_LIST_COLUMNS = [
  'content_id',
  'name',
  'lat',
  'lng',
  'category',
  'tags',
  'popularity',
  'rating',
  'addr1',
  'addr2',
  'image_url',
  'tel',
] as const;

/** 목록 조회 결과 row. PlaceRow의 부분집합이라 PlaceRow를 그대로 넘겨도 된다. */
export type PlaceListRow = Pick<PlaceRow, (typeof PLACE_LIST_COLUMNS)[number]>;

/**
 * places upsert 페이로드 셰이프.
 * id/created_at은 DB가 채우고, popularity/rating은 의도적으로 제외한다.
 * (PostgREST upsert는 페이로드에 있는 컬럼만 UPDATE하므로, 제외하면 후속 배치가 계산한
 *  popularity/rating 값을 이 배치가 덮어쓰지 않는다.)
 */
export type PlaceInsert = Omit<
  PlaceRow,
  'id' | 'created_at' | 'popularity' | 'rating'
>;

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
