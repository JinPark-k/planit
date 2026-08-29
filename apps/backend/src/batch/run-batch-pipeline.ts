import { PlaceInsert } from '../infra/supabase/places.types';
import { createSupabaseClient } from '../infra/supabase/supabase.client';
import {
  fetchFestivals,
  fetchPlacesByRegion,
} from '../infra/tour-api/tour-api.client';
import {
  AREA_BASED_CONTENT_TYPE_IDS,
  isUnmappedLcls,
} from '../infra/tour-api/tour-api-mapping';
import {
  TourApiFestivalItem,
  TourApiRawItem,
} from '../infra/tour-api/tour-api.types';
import { REGION_LDONG_CODES, RegionCode } from '../infra/tour-api/regions';
import { transformPlaces } from './transform-place';

/**
 * upsert 청크 크기.
 * raw_response(jsonb)를 통째로 저장하므로 row당 대략 1~1.5KB.
 * 300 x 1.5KB ~= 450KB로 PostgREST 요청 본문 한도(~1MB)와 statement timeout에
 * 여유를 두면서, 호출 횟수도 지역당 몇 회 수준으로 유지된다.
 */
const UPSERT_CHUNK_SIZE = 300;

/** KST 기준 오늘 날짜 YYYYMMDD. searchFestival2의 eventStartDate에 사용. */
export function todayInKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * run_batch_pipeline(region_code) — TourAPI 수집 -> 정제 -> Supabase upsert.
 * Nest DI 없이 ts-node로 그대로 실행 가능해야 한다(cli.ts / GitHub Actions 크론).
 */
export async function runBatchPipeline(regionCode: RegionCode): Promise<void> {
  const log = (msg: string) => console.log(`[batch:${regionCode}] ${msg}`);
  const lDongRegnCd = REGION_LDONG_CODES[regionCode];
  const syncedAt = new Date().toISOString();

  // 1) 수집
  const rawItems: (TourApiRawItem | TourApiFestivalItem)[] = [];
  for (const contentTypeId of AREA_BASED_CONTENT_TYPE_IDS) {
    const items = await fetchPlacesByRegion(lDongRegnCd, contentTypeId);
    log(
      `areaBasedList2 lDongRegnCd=${lDongRegnCd} contentTypeId=${contentTypeId} ` +
        `fetched=${items.length}`,
    );
    rawItems.push(...items);
  }

  const eventStartDate = todayInKst();
  const festivals = await fetchFestivals(eventStartDate, lDongRegnCd);
  log(
    `searchFestival2 eventStartDate=${eventStartDate} lDongRegnCd=${lDongRegnCd} ` +
      `fetched=${festivals.length}`,
  );
  rawItems.push(...festivals);

  // 2) 정제
  const { rows, skipped, excluded, deduped } = transformPlaces(
    rawItems,
    regionCode,
    syncedAt,
  );
  log(
    `transformed=${rows.length} skipped=${skipped} ` +
      `excluded=${excluded} deduped=${deduped}`,
  );

  // 매핑 튜닝용: 분류체계로 태그를 못 만드는 코드를 상위 10개만 노출.
  const unmapped = new Map<string, number>();
  for (const row of rows) {
    if (isUnmappedLcls(row.lcls_systm2, row.lcls_systm3)) {
      const code = row.lcls_systm3 ?? row.lcls_systm2 ?? '(없음)';
      unmapped.set(code, (unmapped.get(code) ?? 0) + 1);
    }
  }
  if (unmapped.size > 0) {
    const top = [...unmapped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, n]) => `${code}:${n}`)
      .join(', ');
    log(`unmapped lclsSystm3 codes (top 10): ${top}`);
  }

  if (rows.length === 0) {
    log('no rows to upsert — done.');
    return;
  }

  // 3) 적재
  const supabase = createSupabaseClient('serviceRole');
  const chunks = chunk<PlaceInsert>(rows, UPSERT_CHUNK_SIZE);
  let upserted = 0;
  for (const [index, part] of chunks.entries()) {
    const { error } = await supabase
      .from('places')
      .upsert(part, { onConflict: 'content_id' });
    if (error) {
      throw new Error(
        `[batch:${regionCode}] upsert failed at chunk ${index + 1}/${chunks.length}: ${error.message}`,
      );
    }
    upserted += part.length;
    log(`upserted ${upserted}/${rows.length}`);
  }

  log(
    `done. upserted=${upserted} skipped=${skipped} ` +
      `excluded=${excluded} deduped=${deduped}`,
  );
}
