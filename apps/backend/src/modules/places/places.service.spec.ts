import { BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PlaceRow } from '../../infra/supabase/places.types';
import { PlacesService } from './places.service';

interface RangeCall {
  from: number;
  to: number;
}

/**
 * supabase-js 쿼리 빌더의 최소 페이크.
 * .from().select().eq().not().order().range() 체인만 흉내 내고,
 * range 호출마다 미리 준비한 페이지를 돌려준다.
 */
function fakeSupabase(pages: PlaceRow[][], error?: { message: string }) {
  const rangeCalls: RangeCall[] = [];
  const filters: Record<string, unknown> = {};
  let pageIndex = 0;

  const builder = {
    select: (columns: string) => {
      filters['select'] = columns;
      return builder;
    },
    eq: (col: string, val: unknown) => {
      filters[`eq:${col}`] = val;
      return builder;
    },
    not: (col: string, op: string, val: unknown) => {
      filters[`not:${col}`] = `${op}:${String(val)}`;
      return builder;
    },
    overlaps: (col: string, val: unknown) => {
      filters[`overlaps:${col}`] = val;
      return builder;
    },
    order: (col: string) => {
      filters['order'] = col;
      return builder;
    },
    range: (from: number, to: number) => {
      rangeCalls.push({ from, to });
      const data = pages[pageIndex] ?? [];
      pageIndex += 1;
      return Promise.resolve(
        error ? { data: null, error } : { data, error: null },
      );
    },
  };

  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, rangeCalls, filters };
}

function makeRows(count: number, startId = 0): PlaceRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `uuid-${startId + i}`,
    content_id: String(startId + i),
    content_type_id: '12',
    cat1: null,
    cat2: null,
    cat3: null,
    addr1: null,
    addr2: null,
    tel: null,
    overview: null,
    homepage: null,
    image_url: null,
    raw_response: null,
    name: `장소${startId + i}`,
    lat: 37.5,
    lng: 127.0,
    region_code: '1',
    sigungu_code: null,
    category: 'SIGHTSEEING',
    tags: ['자연'],
    popularity: 0,
    rating: 0.5,
    event_start_date: null,
    event_end_date: null,
    created_at: '2026-08-27T00:00:00Z',
    last_synced_at: '2026-08-27T00:00:00Z',
  }));
}

describe('PlacesService.findRowsByRegion', () => {
  it('지역 코드를 TourAPI areaCode로 변환해 조회한다', async () => {
    const { client, filters } = fakeSupabase([makeRows(3)]);
    await new PlacesService(client).findRowsByRegion('JEJU');
    expect(filters['eq:region_code']).toBe('39');
  });

  it('category가 NULL인 행은 제외하도록 필터를 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('SEOUL');
    // 매핑 안 된 행은 category가 NULL이고, 도메인 Place는 category가 필수다.
    expect(filters['not:category']).toBe('is:null');
  });

  it('한 페이지에 다 들어오면 추가 조회하지 않는다', async () => {
    const { client, rangeCalls } = fakeSupabase([makeRows(10)]);
    const places = await new PlacesService(client).findRowsByRegion('BUSAN');
    expect(places).toHaveLength(10);
    expect(rangeCalls).toHaveLength(1);
    expect(rangeCalls[0]).toEqual({ from: 0, to: 999 });
  });

  it('1000건을 넘으면 페이지네이션해서 전부 가져온다 (잘림 방지)', async () => {
    // 서울이 1700건대라 페이지네이션이 없으면 조용히 1000건으로 잘린다.
    const { client, rangeCalls } = fakeSupabase([
      makeRows(1000, 0),
      makeRows(706, 1000),
    ]);
    const places = await new PlacesService(client).findRowsByRegion('SEOUL');
    expect(places).toHaveLength(1706);
    expect(rangeCalls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ]);
  });

  it('페이지 간 순서를 보장하기 위해 정렬 조건을 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('SEOUL');
    expect(filters['order']).toBe('content_id');
  });

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    const { client } = fakeSupabase([[]]);
    await expect(
      new PlacesService(client).findRowsByRegion('SEOUL'),
    ).resolves.toEqual([]);
  });

  it('알 수 없는 지역 코드는 명확한 에러를 던진다', async () => {
    const { client } = fakeSupabase([[]]);
    await expect(
      new PlacesService(client).findRowsByRegion('TOKYO' as unknown as 'SEOUL'),
    ).rejects.toThrow(/Unknown regionCode: TOKYO/);
  });

  it('조회 실패 시 지역명을 포함한 에러를 던진다', async () => {
    const { client } = fakeSupabase([[]], { message: 'permission denied' });
    await expect(
      new PlacesService(client).findRowsByRegion('JEJU'),
    ).rejects.toThrow(/findRowsByRegion\(JEJU\) failed: permission denied/);
  });

  it('raw_response 같은 미사용 컬럼은 조회하지 않는다', async () => {
    // select('*')을 쓰면 raw_response(jsonb)까지 딸려온다.
    // 제주 930건 기준 전송량 966kB 중 657kB(68%)가 raw_response이고 런타임에 아무도 안 읽는다.
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('JEJU');
    const selected = String(filters['select']);
    expect(selected).not.toBe('*');
    expect(selected).not.toContain('raw_response');
    expect(selected).not.toContain('overview');
    // 화면/스코어링에 필요한 컬럼은 반드시 있어야 한다.
    for (const column of [
      'content_id',
      'name',
      'lat',
      'lng',
      'tags',
      'addr1',
      'image_url',
    ]) {
      expect(selected).toContain(column);
    }
  });

  it('category 필터를 주면 DB 쿼리에 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('JEJU', {
      category: 'FOOD',
    });
    expect(filters['eq:category']).toBe('FOOD');
  });

  it('anyTags를 주면 태그가 하나라도 겹치는 행만 조회한다', async () => {
    // 앱에서 걸러내면 안 쓸 행까지 전부 받아와야 한다(제주 문화예술 930건 -> 62건).
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('JEJU', {
      anyTags: ['문화', '전시', '공연'],
    });
    expect(filters['overlaps:tags']).toEqual(['문화', '전시', '공연']);
  });

  it('anyTags가 비어 있으면 태그 필터를 걸지 않는다', async () => {
    // 키워드 없는 조회까지 0건이 되면 안 된다.
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('JEJU', { anyTags: [] });
    expect(filters['overlaps:tags']).toBeUndefined();
  });

  it('필터를 안 주면 지역/카테고리NULL 조건만 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findRowsByRegion('JEJU');
    expect(filters['eq:category']).toBeUndefined();
    expect(filters['overlaps:tags']).toBeUndefined();
  });

  it('row를 변환하지 않고 그대로 반환한다', async () => {
    // 이 서비스는 조회까지만 책임진다. 계산용(toPlace)/표현용(toPlaceResponse) 변환은
    // 호출하는 서비스가 정하므로, 표시 필드가 살아 있는 채로 넘어와야 한다.
    const { client } = fakeSupabase([makeRows(1)]);
    const [row] = await new PlacesService(client).findRowsByRegion('SEOUL');
    expect(row.content_id).toBe('0');
    expect(row.tags).toEqual(['자연']);
    expect(row.popularity).toBe(0);
  });

  it('알 수 없는 지역 코드는 500이 아니라 400으로 나간다', async () => {
    // 이전에는 plain Error라 Nest 기본 필터를 타고 500이 됐다.
    const { client } = fakeSupabase([[]]);
    await expect(
      new PlacesService(client).findRowsByRegion('TOKYO' as unknown as 'SEOUL'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PlacesService 캐시', () => {
  // TTL 만료 자체는 common/ttl-cache.spec.ts에서 시계를 주입해 검증한다.
  // 여기서는 서비스가 캐시를 "언제 쓰고 언제 안 쓰는지"만 본다.

  it('같은 조회를 반복하면 DB를 한 번만 읽는다', async () => {
    const { client, rangeCalls } = fakeSupabase([makeRows(3)]);
    const service = new PlacesService(client);

    const first = await service.findRowsByRegion('JEJU');
    const second = await service.findRowsByRegion('JEJU');

    expect(rangeCalls).toHaveLength(1);
    expect(second).toEqual(first);
  });

  it('필터가 다르면 각각 조회한다', async () => {
    const { client, rangeCalls } = fakeSupabase([makeRows(3), makeRows(2)]);
    const service = new PlacesService(client);

    await service.findRowsByRegion('JEJU');
    await service.findRowsByRegion('JEJU', { category: 'FOOD' });

    expect(rangeCalls).toHaveLength(2);
  });

  it('지역이 다르면 각각 조회한다', async () => {
    const { client, rangeCalls } = fakeSupabase([makeRows(3), makeRows(2)]);
    const service = new PlacesService(client);

    await service.findRowsByRegion('JEJU');
    await service.findRowsByRegion('BUSAN');

    expect(rangeCalls).toHaveLength(2);
  });

  it('태그 순서만 다른 조회는 같은 캐시를 쓴다', async () => {
    // overlaps는 순서를 따지지 않으므로 같은 질의다. 키가 갈리면 헛되이 두 번 읽는다.
    const { client, rangeCalls } = fakeSupabase([makeRows(3)]);
    const service = new PlacesService(client);

    await service.findRowsByRegion('JEJU', { anyTags: ['바다', '맛집'] });
    await service.findRowsByRegion('JEJU', { anyTags: ['맛집', '바다'] });

    expect(rangeCalls).toHaveLength(1);
  });

  it('반환된 배열을 호출측이 변형해도 캐시가 오염되지 않는다', async () => {
    const { client } = fakeSupabase([makeRows(3)]);
    const service = new PlacesService(client);

    const first = await service.findRowsByRegion('JEJU');
    first.reverse();
    first.pop();

    const second = await service.findRowsByRegion('JEJU');
    expect(second).toHaveLength(3);
    expect(second[0].content_id).toBe('0');
  });

  it('조회 실패는 캐시하지 않는다', async () => {
    // 일시적인 오류를 TTL 동안 물고 있으면 회복돼도 계속 실패한다.
    const { client, rangeCalls } = fakeSupabase([[]], {
      message: 'permission denied',
    });
    const service = new PlacesService(client);

    await expect(service.findRowsByRegion('JEJU')).rejects.toThrow();
    await expect(service.findRowsByRegion('JEJU')).rejects.toThrow();

    expect(rangeCalls).toHaveLength(2);
  });
});
