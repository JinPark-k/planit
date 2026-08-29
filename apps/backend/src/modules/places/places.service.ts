import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  PLACE_LIST_COLUMNS,
  PlaceListRow,
} from '../../infra/supabase/places.types';
import { SUPABASE_CLIENT } from '../../infra/supabase/supabase.provider';
import { REGION_CODES, RegionCode } from '../../infra/tour-api/regions';
import { TtlCache } from '../../common/ttl-cache';
import type { PlaceCategory } from '../../core';

/**
 * PostgREST의 max_rows(기본 1000)만큼씩 끊어 읽는다.
 * 서울이 1700건대라 한 번에 조회하면 조용히 잘리므로 반드시 페이지네이션해야 한다.
 */
const PAGE_SIZE = 1000;
/** 데이터가 예상보다 많거나 응답이 이상할 때 무한루프를 막는 안전장치. */
const MAX_PAGES = 20;

/**
 * 조회 결과 캐시 수명.
 *
 * places는 하루 한 번 배치로만 바뀌는데 요청마다 지역 전체를 읽는다
 * (서울 3,115건 = 4페이지 왕복). 인증이 없어 아무나 호출할 수 있으므로
 * 반복 호출이 그대로 Supabase 전송량이 된다.
 *
 * 10분: 배치 결과가 반영되기까지 최대 이만큼 늦지만 배치가 하루 한 번이라
 * 실질적인 신선도 손해가 없고, 반복 호출 비용은 크게 준다.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
/**
 * 키워드 조합마다 캐시 키가 생기므로 상한이 필요하다.
 * 지역 3개 × 자주 쓰는 조합 정도를 담고, 넘치면 오래된 것부터 버린다.
 * 한 항목이 최대 3천여 행(가벼운 컬럼만 select하므로 수 MB 수준)이다.
 */
const CACHE_MAX_ENTRIES = 32;

/** 후보 축소 조건. 스코어 정렬 전에 DB에서 걸러 전송량을 줄인다. */
export interface PlaceFilter {
  category?: PlaceCategory;
  /** 이 태그 중 하나라도 가진 장소만. 비거나 없으면 태그 필터를 걸지 않는다. */
  anyTags?: string[];
}

/**
 * 같은 조회를 같은 키로 모은다.
 *
 * 태그를 정렬하는 이유: `overlaps`는 순서를 따지지 않으므로 `['바다','맛집']`과
 * `['맛집','바다']`는 같은 질의다. 정렬하지 않으면 같은 결과가 키만 달라 따로 캐시된다.
 */
export function placesCacheKey(
  regionCode: RegionCode,
  filter: PlaceFilter,
): string {
  const tags = [...(filter.anyTags ?? [])].sort().join(',');
  return `${regionCode}|${filter.category ?? ''}|${tags}`;
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  /** 인스턴스 단위. Nest 싱글턴이라 프로세스 전체가 공유하고, 테스트끼리는 섞이지 않는다. */
  private readonly cache = new TtlCache<PlaceListRow[]>({
    ttlMs: CACHE_TTL_MS,
    maxEntries: CACHE_MAX_ENTRIES,
  });

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
  async findRowsByRegion(
    regionCode: RegionCode,
    filter: PlaceFilter = {},
  ): Promise<PlaceListRow[]> {
    const dbRegionCode = REGION_CODES[regionCode];
    if (!dbRegionCode) {
      throw new BadRequestException(
        `Unknown regionCode: ${regionCode}. Expected one of ${Object.keys(REGION_CODES).join(', ')}`,
      );
    }

    const cacheKey = placesCacheKey(regionCode, filter);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.log(
        `findRowsByRegion(${regionCode}) -> ${cached.length} places (cached)`,
      );
      return [...cached];
    }

    const rows: PlaceListRow[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE_SIZE;
      let query = this.supabase
        .from('places')
        .select(PLACE_LIST_COLUMNS.join(','))
        .eq('region_code', dbRegionCode)
        .not('category', 'is', null);

      if (filter.category) {
        query = query.eq('category', filter.category);
      }
      if (filter.anyTags?.length) {
        // 키워드 태그가 하나도 안 겹치는 장소는 스코어가 최저값으로 동일해 순위에 의미가 없다.
        // 앱에서 걸러내면 안 쓸 행까지 전부 받아와야 하므로 DB에서 자른다
        // (제주 '문화예술' 기준 930건 -> 62건).
        query = query.overlaps('tags', filter.anyTags);
      }

      const { data, error } = await query
        .order('content_id', { ascending: true }) // 페이지 간 순서 보장(없으면 중복/누락 가능)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(
          `[places] findRowsByRegion(${regionCode}) failed: ${error.message}`,
        );
      }

      const pageRows = (data ?? []) as unknown as PlaceListRow[];
      rows.push(...pageRows);
      if (pageRows.length < PAGE_SIZE) break;
    }

    this.cache.set(cacheKey, rows);

    this.logger.log(`findRowsByRegion(${regionCode}) -> ${rows.length} places`);
    // 얕은 복사를 돌려준다. 호출측이 배열을 in-place로 정렬/변형해도 캐시가 오염되지 않는다
    // (지금 호출자들은 map/slice만 쓰지만, 이 함수가 배열을 넘겨준다는 사실만 보고
    //  나중에 정렬을 넣기 쉽다).
    return [...rows];
  }
}
