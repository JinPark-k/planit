import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { TtlCache } from '../../common/ttl-cache';
import {
  FESTIVAL_LIST_COLUMNS,
  FestivalListRow,
} from '../../infra/supabase/places.types';
import { SUPABASE_CLIENT } from '../../infra/supabase/supabase.provider';
import { REGION_BY_DB_CODE, REGION_CODES } from '../../infra/tour-api/regions';
import {
  DEFAULT_FESTIVAL_LIMIT,
  FestivalQueryDto,
} from './dto/festival-query.dto';
import {
  PagedFestivalsDto,
  durationDays,
  toFestivalResponse,
} from './dto/festival-response.dto';

/**
 * 캐시 수명. places와 같은 이유(하루 한 번 배치로만 바뀐다)로 10분을 쓴다.
 * 축제는 전국 274건이라 조회 자체가 가볍지만, 홈 화면이라 호출은 가장 잦다.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** 전국 + 지역 15개면 16개면 충분하다. */
const CACHE_MAX_ENTRIES = 24;

/**
 * 한국 기준 오늘 날짜(YYYY-MM-DD).
 *
 * 서버는 UTC로 도는데 개최 기간은 한국 날짜다. UTC로 판정하면 한국 시간
 * 오전 9시 이전에 하루 전으로 계산되어, 오늘 끝나는 축제가 이미 끝난 것으로
 * 보이거나 그 반대가 된다.
 */
export function todayInKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  private readonly cache = new TtlCache<FestivalListRow[]>({
    ttlMs: CACHE_TTL_MS,
    maxEntries: CACHE_MAX_ENTRIES,
  });

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * 아직 끝나지 않은 축제를 임박한 순으로 반환한다.
   *
   * 지역을 지정하지 않으면 전국이다. 홈 화면이 그렇게 쓴다 — 축제는 시기를
   * 타서 한 지역만 보면 목록이 빈약해지고(제주 6건), 전국을 모으면 274건이 된다.
   */
  async findUpcoming(query: FestivalQueryDto): Promise<PagedFestivalsDto> {
    const today = todayInKst();
    const rows = await this.fetchRows(query, today);
    const sorted = sortByImminence(rows, today);

    const limit = query.limit ?? DEFAULT_FESTIVAL_LIMIT;
    const offset = query.offset ?? 0;

    return {
      total: sorted.length,
      limit,
      offset,
      items: sorted
        .slice(offset, offset + limit)
        .map((row) => toFestivalResponse(row, today)),
    };
  }

  private async fetchRows(
    query: FestivalQueryDto,
    today: string,
  ): Promise<FestivalListRow[]> {
    const cacheKey = `${query.region ?? 'ALL'}|${today}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.log(`findUpcoming(${cacheKey}) -> ${cached.length} (cached)`);
      return cached;
    }

    let request = this.supabase
      .from('places')
      .select(FESTIVAL_LIST_COLUMNS.join(','))
      // 개최 기간이 있는 행이 곧 축제다(searchFestival2로만 채워진다).
      .not('event_start_date', 'is', null)
      .not('event_end_date', 'is', null)
      .not('category', 'is', null)
      // 이미 끝난 축제는 내보내지 않는다. 지금까지는 이 컬럼을 아무도 읽지 않아
      // 끝난 축제가 일반 관광지처럼 일정에 들어갈 수 있었다.
      .gte('event_end_date', today);

    if (query.region) {
      request = request.eq('region_code', REGION_CODES[query.region]);
    }

    const { data, error } = await request.order('event_start_date', {
      ascending: true,
    });

    if (error) {
      throw new Error(`[festivals] findUpcoming failed: ${error.message}`);
    }

    // 지원 목록에 없는 지역코드의 행은 버린다. 일정을 만들 수 없으므로
    // 홈에 띄우면 눌러도 아무 일이 없는 카드가 된다.
    const rows = ((data ?? []) as unknown as FestivalListRow[]).filter(
      (row) => REGION_BY_DB_CODE[row.region_code] !== undefined,
    );

    this.cache.set(cacheKey, rows);
    this.logger.log(`findUpcoming(${cacheKey}) -> ${rows.length} festivals`);
    return rows;
  }
}

/**
 * 임박한 순으로 정렬한다.
 *
 * 시작일만으로 정렬하면 안 된다. 1월에 시작해 12월에 끝나는 상설 프로그램이
 * 맨 위를 차지한다(전국 274건 중 31일 이상이 55건). 진행 중인 축제는 오늘
 * 시작한 것으로 보고 같은 자리에 놓은 뒤, 기간이 짧은 것을 앞에 둔다 —
 * 짧을수록 "그때만 열리는" 축제이고, 그게 이 서비스가 내세우는 것이다.
 */
export function sortByImminence(
  rows: readonly FestivalListRow[],
  today: string,
): FestivalListRow[] {
  return [...rows].sort((a, b) => {
    const aStart = maxDate(a.event_start_date as string, today);
    const bStart = maxDate(b.event_start_date as string, today);
    if (aStart !== bStart) return aStart < bStart ? -1 : 1;

    const aDays = durationDays(
      a.event_start_date as string,
      a.event_end_date as string,
    );
    const bDays = durationDays(
      b.event_start_date as string,
      b.event_end_date as string,
    );
    if (aDays !== bDays) return aDays - bDays;

    return b.popularity - a.popularity;
  });
}

/** 'YYYY-MM-DD'는 사전순 비교가 곧 날짜 비교다. */
function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}
