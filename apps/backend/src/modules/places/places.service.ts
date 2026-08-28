import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
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
   * 해당 지역의 장소 row를 조회한다.
   *
   * 도메인 `Place`가 아니라 row를 돌려주는 이유: 한 번 조회한 row로 두 가지를 만들어야 한다.
   *   - 계산용: `toPlace(row)` -> core의 Place (스코어링/스케줄링)
   *   - 표현용: `toPlaceResponse(row)` -> 화면 DTO (주소/이미지/전화 포함)
   * `toPlace`가 표시 필드를 버리므로 Place만 받으면 응답을 만들 수 없다.
   * 어느 쪽으로 변환할지는 호출하는 서비스가 정한다.
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
          `[places] findRowsByRegion(${regionCode}) failed: ${error.message}`,
        );
      }

      const page_rows = (data ?? []) as PlaceRow[];
      rows.push(...page_rows);
      if (page_rows.length < PAGE_SIZE) break;
    }

    this.logger.log(`findRowsByRegion(${regionCode}) -> ${rows.length} places`);
    return rows;
  }
}
