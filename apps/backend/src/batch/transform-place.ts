import { PlaceInsert } from '../infra/supabase/places.types';
import {
  resolveCategory,
  resolveTags,
} from '../infra/tour-api/tour-api-mapping';
import {
  TourApiFestivalItem,
  TourApiRawItem,
} from '../infra/tour-api/tour-api.types';
import { REGION_CODES, RegionCode } from '../infra/tour-api/regions';

/** 빈 문자열/공백만 있는 값은 DB에 null로 저장한다. */
function nullable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** "YYYYMMDD" -> "YYYY-MM-DD". 형식이 아니면 null. */
export function parseTourApiDate(value: unknown): string | null {
  const raw = nullable(value);
  if (raw === null || !/^\d{8}$/.test(raw)) return null;
  const [year, month, day] = [
    raw.slice(0, 4),
    raw.slice(4, 6),
    raw.slice(6, 8),
  ];
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month}-${day}`;
}

function parseCoordinate(value: unknown): number | null {
  const raw = nullable(value);
  if (raw === null) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/**
 * 국내 좌표 범위(여유 있게: 마라도~고성, 백령도~독도).
 *
 * TourAPI 원본에 좌표가 잘못 들어간 항목이 실제로 존재한다
 * (예: 부산 '반송공원'의 mapx/mapy가 117.99/19.69 — 남중국해 좌표).
 * 이런 항목을 그대로 넣으면 clusterPlacesByDay의 farthest-point 시드 선택이
 * 이 이상치를 시드로 잡아 일차 클러스터링이 통째로 망가진다.
 */
const KOREA_BOUNDS = {
  minLat: 32.5,
  maxLat: 38.7,
  minLng: 124.5,
  maxLng: 132.0,
};

function isWithinKorea(lat: number, lng: number): boolean {
  return (
    lat >= KOREA_BOUNDS.minLat &&
    lat <= KOREA_BOUNDS.maxLat &&
    lng >= KOREA_BOUNDS.minLng &&
    lng <= KOREA_BOUNDS.maxLng
  );
}

/**
 * TourAPI 원본 item -> places upsert row.
 * 좌표가 없거나 DB CHECK 제약을 위반하는 항목은 null을 반환해 호출측이 스킵하게 한다.
 */
export function transformPlace(
  item: TourApiRawItem | TourApiFestivalItem,
  regionCode: RegionCode,
  syncedAt: string,
): PlaceInsert | null {
  const contentId = nullable(item.contentid);
  const name = nullable(item.title);
  if (contentId === null || name === null) return null;

  // TourAPI는 mapx=경도(lng), mapy=위도(lat). 뒤바꾸기 쉬우니 이 두 줄을 특히 주의할 것.
  const lng = parseCoordinate(item.mapx);
  const lat = parseCoordinate(item.mapy);
  if (lat === null || lng === null) return null;
  // places_lat_range / places_lng_range CHECK 위반 방지 + 원본 오염 좌표 제거.
  // 국내 범위를 벗어나면 (0,0)이든 남중국해 좌표든 전부 여기서 걸러진다.
  if (!isWithinKorea(lat, lng)) return null;

  const contentTypeId = nullable(item.contenttypeid);
  const cat1 = nullable(item.cat1);
  const cat2 = nullable(item.cat2);
  const cat3 = nullable(item.cat3);
  // 태그 도출의 1순위 근거. TourAPI가 cat1~3를 "삭제예정"으로 공지했다.
  const lclsSystm2 = nullable(item.lclsSystm2);
  const lclsSystm3 = nullable(item.lclsSystm3);
  const festival = item;

  return {
    content_id: contentId,
    content_type_id: contentTypeId,
    cat1,
    cat2,
    cat3,
    addr1: nullable(item.addr1),
    addr2: nullable(item.addr2),
    tel: nullable(item.tel),
    overview: null, // detailCommon2 미연동 (이번 범위 밖)
    homepage: null, // 동일
    image_url: nullable(item.firstimage) ?? nullable(item.firstimage2),
    raw_response: item as unknown as Record<string, unknown>,
    name,
    lat,
    lng,
    // 축제 레코드는 areacode가 빈 문자열이므로 원본 대신 "처리 중인 지역"을 항상 사용한다.
    // 이렇게 하면 findRowsByRegion이 조회할 값과 항상 일치한다. 원본 areacode는 raw_response에 남는다.
    region_code: REGION_CODES[regionCode],
    // 법정동 시군구 코드(lDongSignguCd)를 저장한다.
    // TourAPI가 sigungucode를 "미사용항목(삭제예정 - 법정동 시군구 코드로 대체)"로 공지했고,
    // 실측(2588행)에서도 lDongSignguCd는 100%, sigungucode는 56.1%만 채워져 있었다.
    sigungu_code: nullable(item.lDongSignguCd) ?? nullable(item.sigungucode),
    category: resolveCategory(contentTypeId),
    tags: resolveTags({
      contentTypeId,
      cat1,
      cat2,
      cat3,
      lclsSystm2,
      lclsSystm3,
    }),
    event_start_date: parseTourApiDate(festival.eventstartdate),
    event_end_date: parseTourApiDate(festival.eventenddate),
    last_synced_at: syncedAt,
  };
}

export interface TransformResult {
  rows: PlaceInsert[];
  skipped: number;
  /** 같은 content_id가 중복으로 들어와 제거된 건수. */
  deduped: number;
}

/**
 * PostgREST upsert 제약 두 가지를 여기서 흡수한다.
 *  1) bulk 페이로드의 모든 객체는 키 집합이 동일해야 한다 -> transformPlace가 항상 전 컬럼을 채운다.
 *  2) 같은 페이로드에 같은 conflict key가 두 번 있으면 실패한다
 *     ("ON CONFLICT DO UPDATE command cannot affect row a second time") -> content_id로 dedupe.
 */
export function transformPlaces(
  items: (TourApiRawItem | TourApiFestivalItem)[],
  regionCode: RegionCode,
  syncedAt: string,
): TransformResult {
  const byContentId = new Map<string, PlaceInsert>();
  let skipped = 0;
  let deduped = 0;

  for (const item of items) {
    const row = transformPlace(item, regionCode, syncedAt);
    if (row === null) {
      skipped += 1;
      continue;
    }
    if (byContentId.has(row.content_id)) deduped += 1;
    byContentId.set(row.content_id, row); // 나중 값이 이긴다
  }

  return { rows: [...byContentId.values()], skipped, deduped };
}
