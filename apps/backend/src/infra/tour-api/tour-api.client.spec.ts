import { fetchFestivals, fetchPlacesByRegion } from './tour-api.client';

type FetchMock = jest.Mock<Promise<Response>, [string]>;

const originalKey = process.env.TOUR_API_KEY;
const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function envelope(items: unknown, totalCount: number, resultCode = '0000') {
  return {
    response: {
      header: {
        resultCode,
        resultMsg: resultCode === '0000' ? 'OK' : 'SERVICE ERROR',
      },
      body: { items, numOfRows: 1000, pageNo: 1, totalCount },
    },
  };
}

function mockFetch(): FetchMock {
  const fn = jest.fn() as FetchMock;
  global.fetch = fn;
  return fn;
}

beforeEach(() => {
  process.env.TOUR_API_KEY = 'test-key';
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.TOUR_API_KEY;
  else process.env.TOUR_API_KEY = originalKey;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('fetchPlacesByRegion 인증', () => {
  it('TOUR_API_KEY가 없으면 기존 에러 메시지로 reject한다', async () => {
    delete process.env.TOUR_API_KEY;
    mockFetch();
    await expect(fetchPlacesByRegion('1', '12')).rejects.toThrow(
      'Missing TOUR_API_KEY in environment',
    );
  });

  it('Encoding 키를 이중 인코딩하지 않는다', async () => {
    process.env.TOUR_API_KEY = 'abc%2Bdef%2F%3D';
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchPlacesByRegion('1', '12');

    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get('serviceKey')).toBe('abc+def/=');
  });

  it('Decoding 키는 그대로 전달된다 (디코드가 no-op)', async () => {
    process.env.TOUR_API_KEY = 'abc+def/=';
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchPlacesByRegion('1', '12');

    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get('serviceKey')).toBe('abc+def/=');
  });
});

describe('fetchPlacesByRegion 응답 처리', () => {
  it('totalCount가 0이면 items가 빈 문자열로 와도 빈 배열을 반환한다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await expect(fetchPlacesByRegion('1', '12')).resolves.toEqual([]);
  });

  it('resultCode가 정상이 아니면 코드와 메시지를 포함해 reject한다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0, '22')));

    await expect(fetchPlacesByRegion('1', '12')).rejects.toThrow(
      /resultCode=22/,
    );
  });

  it('JSON이 아닌 응답은 명확한 에러로 reject한다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(textResponse('<OpenAPI_ServiceResponse>...'));

    await expect(fetchPlacesByRegion('1', '12')).rejects.toThrow(
      /non-JSON response/,
    );
  });

  it('4xx는 재시도 없이 즉시 실패한다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(textResponse('unauthorized', 401));

    await expect(fetchPlacesByRegion('1', '12')).rejects.toThrow(/HTTP 401/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchPlacesByRegion 페이지네이션', () => {
  it('totalCount만큼 여러 페이지를 순차 조회한다', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      contentid: `a${i}`,
    }));
    const page2 = Array.from({ length: 500 }, (_, i) => ({
      contentid: `b${i}`,
    }));
    const fetchFn = mockFetch();
    fetchFn
      .mockResolvedValueOnce(jsonResponse(envelope({ item: page1 }, 1500)))
      .mockResolvedValueOnce(jsonResponse(envelope({ item: page2 }, 1500)));

    const result = await fetchPlacesByRegion('1', '39');

    expect(result).toHaveLength(1500);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('pageNo')).toBe(
      '1',
    );
    expect(new URL(fetchFn.mock.calls[1][0]).searchParams.get('pageNo')).toBe(
      '2',
    );
    expect(
      new URL(fetchFn.mock.calls[0][0]).searchParams.get('numOfRows'),
    ).toBe('1000');
  });

  it('요청 파라미터에 areaCode와 contentTypeId가 실린다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchPlacesByRegion('6', '28');

    const params = new URL(fetchFn.mock.calls[0][0]).searchParams;
    expect(params.get('areaCode')).toBe('6');
    expect(params.get('contentTypeId')).toBe('28');
    expect(fetchFn.mock.calls[0][0]).toContain('/areaBasedList2?');
  });
});

describe('fetchFestivals', () => {
  it('eventStartDate를 싣고 areaCode는 싣지 않는다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchFestivals('20260801');

    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toContain('/searchFestival2');
    expect(url.searchParams.get('eventStartDate')).toBe('20260801');
    // areaCode를 붙이면 축제 레코드의 areacode가 비어 있어 0건이 된다.
    expect(url.searchParams.get('areaCode')).toBeNull();
  });
});
