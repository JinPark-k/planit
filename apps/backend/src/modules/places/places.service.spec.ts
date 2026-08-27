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
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters[`eq:${col}`] = val;
      return builder;
    },
    not: (col: string, op: string, val: unknown) => {
      filters[`not:${col}`] = `${op}:${String(val)}`;
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

describe('PlacesService.findByRegion', () => {
  it('지역 코드를 TourAPI areaCode로 변환해 조회한다', async () => {
    const { client, filters } = fakeSupabase([makeRows(3)]);
    await new PlacesService(client).findByRegion('JEJU');
    expect(filters['eq:region_code']).toBe('39');
  });

  it('category가 NULL인 행은 제외하도록 필터를 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findByRegion('SEOUL');
    // 매핑 안 된 행은 category가 NULL이고, 도메인 Place는 category가 필수다.
    expect(filters['not:category']).toBe('is:null');
  });

  it('한 페이지에 다 들어오면 추가 조회하지 않는다', async () => {
    const { client, rangeCalls } = fakeSupabase([makeRows(10)]);
    const places = await new PlacesService(client).findByRegion('BUSAN');
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
    const places = await new PlacesService(client).findByRegion('SEOUL');
    expect(places).toHaveLength(1706);
    expect(rangeCalls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ]);
  });

  it('페이지 간 순서를 보장하기 위해 정렬 조건을 건다', async () => {
    const { client, filters } = fakeSupabase([makeRows(1)]);
    await new PlacesService(client).findByRegion('SEOUL');
    expect(filters['order']).toBe('content_id');
  });

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    const { client } = fakeSupabase([[]]);
    await expect(
      new PlacesService(client).findByRegion('SEOUL'),
    ).resolves.toEqual([]);
  });

  it('알 수 없는 지역 코드는 명확한 에러를 던진다', async () => {
    const { client } = fakeSupabase([[]]);
    await expect(
      new PlacesService(client).findByRegion('TOKYO' as unknown as 'SEOUL'),
    ).rejects.toThrow(/Unknown regionCode: TOKYO/);
  });

  it('조회 실패 시 지역명을 포함한 에러를 던진다', async () => {
    const { client } = fakeSupabase([[]], { message: 'permission denied' });
    await expect(
      new PlacesService(client).findByRegion('JEJU'),
    ).rejects.toThrow(/findByRegion\(JEJU\) failed: permission denied/);
  });

  it('row를 도메인 Place로 변환해 반환한다', async () => {
    const { client } = fakeSupabase([makeRows(1)]);
    const [place] = await new PlacesService(client).findByRegion('SEOUL');
    expect(place).toEqual({
      id: '0',
      name: '장소0',
      location: { lat: 37.5, lng: 127.0 },
      category: 'SIGHTSEEING',
      tags: ['자연'],
      popularity: 0,
      rating: 0.5,
    });
  });
});
