import { RegionCode } from './regions';

/**
 * run_batch_pipeline(region_code) — 지역코드를 파라미터로 받아 도시 단위로 재사용 가능한 배치 파이프라인.
 * TODO:
 *  1. TourAPI에서 해당 지역 원본 데이터 수집 (infra/tour-api)
 *  2. 내부 Place 형태로 정제
 *  3. Supabase에 upsert (infra/supabase)
 */
export async function runBatchPipeline(regionCode: RegionCode): Promise<void> {
  throw new Error(`Not implemented: runBatchPipeline(${regionCode})`);
}
