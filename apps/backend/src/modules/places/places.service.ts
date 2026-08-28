import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Place } from '../../core';
import { toPlace } from '../../infra/supabase/place.mapper';
import { PlaceRow } from '../../infra/supabase/places.types';
import { SUPABASE_CLIENT } from '../../infra/supabase/supabase.provider';
import { REGION_CODES, RegionCode } from '../../infra/tour-api/regions';

/**
 * PostgREST의 max_rows(기본 1000)만큼씩 끊어 읽는다.
 * 서울이 1700건대라 한 번에 조회하면 조용히 잘리므로 반드시 페이지네이션해야 한다.
 */
const PAGE_SIZE = 1000;
/** 데이터가 예상보다 많거나 응답이 이상할 때 무한루프를 막는 안전장치. */
const MAX_PAGES = 20;

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * 해당 지역의 장소 row를 그대로 조회한다.
   *
   * 도메인 `Place`가 아니라 row를 돌려주는 경로가 따로 있는 이유:
   * 화면 응답에는 주소/이미지/전화가 필요한데 `toPlace`가 그 필드들을 버리기 때문이다.
   * 알고리즘은 `findByRegion`, 화면 응답은 이 메서드를 쓴다.
   *
   * cat 코드 매핑이 안 된 행은 category가 NULL로 남아 있어 제외한다
   * (core의 Place.category는 non-null이며, 카테고리 없이는 시간대 배치를 할 수 없다).
   */
  async findRowsByRegion(regionCode: RegionCode): Promise<PlaceRow[]> {
    const dbRegionCode = REGION_CODES[regionCode];
    if (!dbRegionCode) {
      throw new BadRequestException(
        `Unknown regionCode: ${regionCode}. Expected one of ${Object.keys(REGION_CODES).join(', ')}`,
      );
    }

    const rows: PlaceRow[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE_SIZE;
      const { data, error } = await this.supabase
        .from('places')
        .select('*')
        .eq('region_code', dbRegionCode)
        .not('category', 'is', null)
        .order('content_id', { ascending: true }) // 페이지 간 순서 보장(없으면 중복/누락 가능)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(
          `[places] findByRegion(${regionCode}) failed: ${error.message}`,
        );
      }

      const page_rows = (data ?? []) as PlaceRow[];
      rows.push(...page_rows);
      if (page_rows.length < PAGE_SIZE) break;
    }

    this.logger.log(`findByRegion(${regionCode}) -> ${rows.length} places`);
    return rows;
  }

  /** 스케줄링/스코어링용 도메인 Place 목록. */
  async findByRegion(regionCode: RegionCode): Promise<Place[]> {
    const rows = await this.findRowsByRegion(regionCode);
    return rows.map(toPlace);
  }
}
