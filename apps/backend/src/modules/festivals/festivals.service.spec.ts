import { FestivalListRow } from '../../infra/supabase/places.types';
import { sortByImminence, todayInKst } from './festivals.service';
import { durationDays, toFestivalResponse } from './dto/festival-response.dto';

function festival(
  name: string,
  start: string,
  end: string,
  extra: Partial<FestivalListRow> = {},
): FestivalListRow {
  return {
    content_id: name,
    name,
    lat: 37.5,
    lng: 127,
    category: 'SIGHTSEEING',
    tags: ['축제'],
    popularity: 0,
    rating: 0.5,
    addr1: '서울특별시',
    addr2: null,
    image_url: null,
    tel: null,
    event_start_date: start,
    event_end_date: end,
    region_code: '1',
    ...extra,
  };
}

describe('todayInKst', () => {
  it('UTC 자정 직후에도 한국 날짜를 준다', () => {
    // UTC 2026-09-04 00:30 = KST 2026-09-04 09:30. 같은 날.
    expect(todayInKst(new Date('2026-09-04T00:30:00Z'))).toBe('2026-09-04');
  });

  it('UTC로는 아직 어제인 시각도 한국 날짜로 넘긴다', () => {
    // UTC 2026-09-03 15:30 = KST 2026-09-04 00:30. 한국은 이미 다음 날이다.
    // UTC로 판정하면 오늘 시작하는 축제가 목록에서 빠진다.
    expect(todayInKst(new Date('2026-09-03T15:30:00Z'))).toBe('2026-09-04');
  });
});

describe('durationDays', () => {
  it('하루짜리는 1이다', () => {
    expect(durationDays('2026-09-12', '2026-09-12')).toBe(1);
  });

  it('시작일과 종료일을 포함해 센다', () => {
    expect(durationDays('2026-09-12', '2026-09-13')).toBe(2);
  });

  it('해를 넘겨도 센다', () => {
    expect(durationDays('2026-01-01', '2026-12-31')).toBe(365);
  });
});

describe('sortByImminence', () => {
  const TODAY = '2026-09-04';

  it('가까운 축제를 앞에 둔다', () => {
    const rows = [
      festival('다음달', '2026-10-01', '2026-10-02'),
      festival('내일', '2026-09-05', '2026-09-06'),
      festival('다음주', '2026-09-11', '2026-09-12'),
    ];

    expect(sortByImminence(rows, TODAY).map((r) => r.name)).toEqual([
      '내일',
      '다음주',
      '다음달',
    ]);
  });

  it('연중 상설 프로그램이 오늘 열리는 축제를 밀어내지 않는다', () => {
    // 시작일 그대로 정렬하면 1월에 시작한 연중 프로그램이 1위가 된다.
    // 진행 중인 것끼리는 기간이 짧은 쪽을 앞에 둬서 이를 막는다.
    //
    // 실측(2026-09-04, 전국 274건): 진행 중 65건 중 42건(65%)이 31일 이상인데,
    // 이 규칙 덕에 상위 12건이 전부 오늘 열리는 2~3일짜리 축제로 채워진다.
    const rows = [
      festival('연중 상설', '2026-01-01', '2026-12-31'),
      festival('오늘 이틀', TODAY, '2026-09-05'),
    ];

    expect(sortByImminence(rows, TODAY).map((r) => r.name)).toEqual([
      '오늘 이틀',
      '연중 상설',
    ]);
  });

  it('진행 중인 축제가 아직 시작 안 한 축제보다 앞선다', () => {
    // 연중 상설이라도 오늘 열리고 있는 것은 맞으므로, 내일 시작하는 축제보다
    // 앞에 온다. 기간으로 밀어내는 것은 같은 날 안에서만이다.
    const rows = [
      festival('내일 시작', '2026-09-05', '2026-09-06'),
      festival('연중 상설', '2026-01-01', '2026-12-31'),
    ];

    expect(sortByImminence(rows, TODAY).map((r) => r.name)).toEqual([
      '연중 상설',
      '내일 시작',
    ]);
  });

  it('진행 중인 축제는 오늘 시작한 것으로 보고 짧은 것을 앞에 둔다', () => {
    const rows = [
      festival('진행 중 장기', '2026-08-01', '2026-11-30'),
      festival('진행 중 단기', '2026-09-03', '2026-09-05'),
      festival('내일 시작', '2026-09-05', '2026-09-06'),
    ];

    // 앞의 둘은 이미 시작해 오늘 자리로 오고, 그 안에서 기간이 짧은 쪽이 먼저다.
    expect(sortByImminence(rows, TODAY).map((r) => r.name)).toEqual([
      '진행 중 단기',
      '진행 중 장기',
      '내일 시작',
    ]);
  });

  it('같은 날 같은 기간이면 인기도가 높은 쪽이 먼저다', () => {
    const rows = [
      festival('덜 알려짐', '2026-09-05', '2026-09-06', { popularity: 1 }),
      festival('많이 알려짐', '2026-09-05', '2026-09-06', { popularity: 9 }),
    ];

    expect(sortByImminence(rows, TODAY).map((r) => r.name)).toEqual([
      '많이 알려짐',
      '덜 알려짐',
    ]);
  });

  it('입력 배열을 바꾸지 않는다', () => {
    const rows = [
      festival('나중', '2026-10-01', '2026-10-02'),
      festival('먼저', '2026-09-05', '2026-09-06'),
    ];
    sortByImminence(rows, TODAY);
    expect(rows.map((r) => r.name)).toEqual(['나중', '먼저']);
  });
});

describe('toFestivalResponse', () => {
  const TODAY = '2026-09-04';

  it('개최 기간과 지역을 붙인다', () => {
    const row = festival('제주 축제', '2026-09-12', '2026-09-13', {
      region_code: '39',
    });

    expect(toFestivalResponse(row, TODAY)).toMatchObject({
      name: '제주 축제',
      startDate: '2026-09-12',
      endDate: '2026-09-13',
      region: 'JEJU',
      ongoing: false,
      durationDays: 2,
    });
  });

  it('이미 시작한 축제는 ongoing이다', () => {
    const row = festival('진행 중', '2026-09-01', '2026-09-30');
    expect(toFestivalResponse(row, TODAY).ongoing).toBe(true);
  });

  it('오늘 시작하는 축제도 ongoing이다', () => {
    const row = festival('오늘 시작', TODAY, '2026-09-05');
    expect(toFestivalResponse(row, TODAY).ongoing).toBe(true);
  });

  it('통합 지역코드도 되돌린다', () => {
    // 전남광주는 areaCode가 없어 REGION_CODES에 lDong 코드를 넣었다.
    const row = festival('광주 축제', '2026-09-05', '2026-09-06', {
      region_code: '12',
    });
    expect(toFestivalResponse(row, TODAY).region).toBe('JEONNAM_GWANGJU');
  });
});
