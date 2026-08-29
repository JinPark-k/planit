import {
  TourApiFestivalItem,
  TourApiRawItem,
} from '../infra/tour-api/tour-api.types';
import {
  parseTourApiDate,
  transformPlace,
  transformPlaces,
} from './transform-place';

const SYNCED_AT = '2026-08-27T00:00:00.000Z';

function item(partial: Partial<TourApiRawItem> = {}): TourApiRawItem {
  return {
    contentid: '123',
    contenttypeid: '12',
    title: '테스트 장소',
    mapx: '126.9779',
    mapy: '37.5665',
    ...partial,
  };
}

describe('transformPlace 좌표 처리', () => {
  it('mapx는 경도(lng), mapy는 위도(lat)로 매핑된다', () => {
    const row = transformPlace(
      item({ mapx: '126.9779', mapy: '37.5665' }),
      'SEOUL',
      SYNCED_AT,
    );
    expect(row).not.toBeNull();
    expect(row!.lat).toBe(37.5665);
    expect(row!.lng).toBe(126.9779);
  });

  it.each([
    ['mapx 누락', { mapx: undefined as unknown as string }],
    ['mapy 빈 문자열', { mapy: '' }],
    ['숫자가 아닌 좌표', { mapx: 'N/A' }],
    ['(0,0) 미기입 좌표', { mapx: '0', mapy: '0' }],
    ['위도 범위 초과', { mapy: '95' }],
    ['경도 범위 초과', { mapx: '181' }],
    // TourAPI 원본에 실재하는 오염 좌표(부산 반송공원이 남중국해로 찍힘).
    // 이런 이상치가 남으면 clusterPlacesByDay의 시드 선택이 망가진다.
    ['국내 범위 밖 좌표', { mapx: '117.9925662504', mapy: '19.6944274800' }],
  ])('%s 이면 null을 반환한다', (_label, partial) => {
    expect(transformPlace(item(partial), 'SEOUL', SYNCED_AT)).toBeNull();
  });

  it.each([
    ['제주 마라도 인근', { mapx: '126.2668', mapy: '33.1120' }],
    ['강원 고성 인근', { mapx: '128.4677', mapy: '38.3800' }],
    ['독도', { mapx: '131.8686', mapy: '37.2411' }],
  ])('국내 경계 좌표 %s 는 통과한다', (_label, partial) => {
    expect(transformPlace(item(partial), 'SEOUL', SYNCED_AT)).not.toBeNull();
  });
});

describe('transformPlace 필수값', () => {
  it('contentid가 없으면 null', () => {
    expect(
      transformPlace(item({ contentid: '' }), 'SEOUL', SYNCED_AT),
    ).toBeNull();
  });

  it('title이 없으면 null', () => {
    expect(
      transformPlace(item({ title: '   ' }), 'SEOUL', SYNCED_AT),
    ).toBeNull();
  });
});

describe('transformPlace 필드 정제', () => {
  it('빈 문자열/공백 필드는 null이 된다', () => {
    const row = transformPlace(
      item({
        addr2: '',
        tel: '   ',
        sigungucode: '',
        lDongSignguCd: '',
        lclsSystm3: '',
      }),
      'SEOUL',
      SYNCED_AT,
    )!;
    expect(row.addr2).toBeNull();
    expect(row.tel).toBeNull();
    expect(row.sigungu_code).toBeNull();
    expect(row.lcls_systm3).toBeNull();
  });

  it('image_url은 firstimage가 없으면 firstimage2로 폴백한다', () => {
    expect(
      transformPlace(
        item({ firstimage: '', firstimage2: 'http://img2' }),
        'SEOUL',
        SYNCED_AT,
      )!.image_url,
    ).toBe('http://img2');
    expect(
      transformPlace(
        item({ firstimage: 'http://img1', firstimage2: 'http://img2' }),
        'SEOUL',
        SYNCED_AT,
      )!.image_url,
    ).toBe('http://img1');
    expect(
      transformPlace(
        item({ firstimage: '', firstimage2: '' }),
        'SEOUL',
        SYNCED_AT,
      )!.image_url,
    ).toBeNull();
  });

  it('overview/homepage는 이번 범위 밖이라 항상 null이다', () => {
    const row = transformPlace(item(), 'SEOUL', SYNCED_AT)!;
    expect(row.overview).toBeNull();
    expect(row.homepage).toBeNull();
  });

  it('raw_response에 원본이 그대로 보존된다 (인터페이스에 없는 필드 포함)', () => {
    const source = item({ lclsSystm1: 'FD', zipcode: '06102' });
    const row = transformPlace(source, 'SEOUL', SYNCED_AT)!;
    expect(row.raw_response).toEqual(source);
  });

  it('last_synced_at은 전달받은 값을 그대로 쓴다', () => {
    expect(transformPlace(item(), 'SEOUL', SYNCED_AT)!.last_synced_at).toBe(
      SYNCED_AT,
    );
  });

  it('category와 tags가 매핑되어 채워진다', () => {
    const restaurant = transformPlace(
      item({
        contenttypeid: '39',
        lclsSystm1: 'FD',
        lclsSystm2: 'FD01',
        lclsSystm3: 'FD010100',
      }),
      'SEOUL',
      SYNCED_AT,
    )!;
    expect(restaurant.category).toBe('FOOD');
    expect(restaurant.tags).toEqual(expect.arrayContaining(['맛집', '한식']));
  });
});

describe('transformPlace region_code', () => {
  it('축제처럼 areacode가 비어도 처리 중인 지역값을 쓴다', () => {
    const festival: TourApiFestivalItem = {
      ...item({ contenttypeid: '15', areacode: '', sigungucode: '' }),
      eventstartdate: '20260801',
      eventenddate: '20260803',
    };
    const row = transformPlace(festival, 'BUSAN', SYNCED_AT)!;
    expect(row.region_code).toBe('6');
  });

  it('원본 areacode가 처리 지역과 달라도 처리 지역값이 우선한다', () => {
    const row = transformPlace(item({ areacode: '39' }), 'SEOUL', SYNCED_AT)!;
    expect(row.region_code).toBe('1');
  });
});

describe('parseTourApiDate', () => {
  it('YYYYMMDD를 ISO 날짜로 변환한다', () => {
    expect(parseTourApiDate('20260801')).toBe('2026-08-01');
  });

  it.each([
    ['undefined', undefined],
    ['빈 문자열', ''],
    ['이미 ISO 형식', '2026-08-01'],
    ['자릿수 부족', '2026080'],
    ['숫자 아님', 'abcdefgh'],
    ['월 범위 초과', '20261301'],
    ['일 0', '20260800'],
  ])('%s 이면 null을 반환한다', (_label, value) => {
    expect(parseTourApiDate(value)).toBeNull();
  });
});

describe('transformPlace 축제 기간', () => {
  it('축제는 기간이 파싱되어 채워진다', () => {
    const festival: TourApiFestivalItem = {
      ...item({ contenttypeid: '15' }),
      eventstartdate: '20260801',
      eventenddate: '20260803',
    };
    const row = transformPlace(festival, 'SEOUL', SYNCED_AT)!;
    expect(row.event_start_date).toBe('2026-08-01');
    expect(row.event_end_date).toBe('2026-08-03');
  });

  it('축제가 아닌 항목은 기간이 null이다', () => {
    const row = transformPlace(
      item({ contenttypeid: '12' }),
      'SEOUL',
      SYNCED_AT,
    )!;
    expect(row.event_start_date).toBeNull();
    expect(row.event_end_date).toBeNull();
  });
});

describe('transformPlaces', () => {
  it('스킵된 항목을 카운트한다', () => {
    const result = transformPlaces(
      [item({ contentid: '1' }), item({ contentid: '2', mapx: 'N/A' })],
      'SEOUL',
      SYNCED_AT,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it('content_id 중복을 제거하고 나중 값이 이긴다', () => {
    const result = transformPlaces(
      [
        item({ contentid: '1', title: '이전' }),
        item({ contentid: '1', title: '이후' }),
      ],
      'SEOUL',
      SYNCED_AT,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('이후');
    expect(result.deduped).toBe(1);
  });

  it('모든 row가 동일한 키 집합을 갖는다 (PostgREST bulk upsert 요구사항)', () => {
    const festival: TourApiFestivalItem = {
      ...item({ contentid: '2', contenttypeid: '15' }),
      eventstartdate: '20260801',
      eventenddate: '20260803',
    };
    const minimal = item({
      contentid: '3',
      addr1: undefined,
      tel: undefined,
      lclsSystm1: undefined,
    });
    const { rows } = transformPlaces(
      [item({ contentid: '1' }), festival, minimal],
      'SEOUL',
      SYNCED_AT,
    );
    expect(rows).toHaveLength(3);
    const keySets = rows.map((r) => Object.keys(r).sort().join(','));
    expect(new Set(keySets).size).toBe(1);
  });

  it('빈 입력은 빈 결과를 반환한다', () => {
    expect(transformPlaces([], 'SEOUL', SYNCED_AT)).toEqual({
      rows: [],
      skipped: 0,
      excluded: 0,
      deduped: 0,
    });
  });
});

describe('숙박 제외', () => {
  it('캠핑(AC05)은 저장하지 않고 excluded로 센다', () => {
    const result = transformPlaces(
      [
        {
          contentid: '1',
          title: '별헤는밤글램핑',
          mapx: '126.5',
          mapy: '33.4',
          contenttypeid: '28',
          lclsSystm2: 'AC05',
          lclsSystm3: 'AC050400',
        },
        {
          contentid: '2',
          title: '제주승마장',
          mapx: '126.5',
          mapy: '33.4',
          contenttypeid: '28',
          lclsSystm2: 'LS01',
          lclsSystm3: 'LS010700',
        },
      ],
      'JEJU',
      '2026-08-29T00:00:00.000Z',
    );

    expect(result.rows.map((r) => r.name)).toEqual(['제주승마장']);
    expect(result.excluded).toBe(1);
    expect(result.skipped).toBe(0);
  });
});
