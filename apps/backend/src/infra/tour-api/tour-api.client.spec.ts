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

describe('네트워크 오류 재시도', () => {
  // GitHub Actions 크론에서 부산 잡이 ConnectTimeoutError(apis.data.go.kr:443)로 죽었다.
  // 2회 + 고정 1초 간격이라 재시도가 26초 만에 소진됐는데, 바로 뒤 순차 실행된
  // 제주/서울은 성공했다 = 장애는 1분도 안 갔고 재시도 창이 짧아서 놓친 것이다.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('네트워크 오류는 MAX_ATTEMPTS(4)회까지 시도한다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockRejectedValue(new Error('fetch failed'));

    const assertion = expect(fetchPlacesByRegion('1', '12')).rejects.toThrow(
      /fetch failed/,
    );
    await jest.runAllTimersAsync();
    await assertion;

    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('재시도 도중 성공하면 결과를 그대로 반환한다', async () => {
    const fetchFn = mockFetch();
    fetchFn
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue(
        jsonResponse(envelope({ item: [{ contentid: 'a' }] }, 1)),
      );

    const promise = fetchPlacesByRegion('1', '12');
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('재시도 간격이 지수적으로 늘어난다 (1s -> 3s -> 9s)', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockRejectedValue(new Error('fetch failed'));

    const assertion = expect(fetchPlacesByRegion('1', '12')).rejects.toThrow();

    // 각 간격의 직전/직후를 확인해 백오프가 실제로 그 시각에 일어나는지 고정한다.
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(2999);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(8999);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(4);

    await assertion;
  });

  it('5xx도 재시도 대상이다', async () => {
    const fetchFn = mockFetch();
    fetchFn
      .mockResolvedValueOnce(textResponse('server error', 503))
      .mockResolvedValue(
        jsonResponse(envelope({ item: [{ contentid: 'a' }] }, 1)),
      );

    const promise = fetchPlacesByRegion('1', '12');
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
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

  it('지역 필터로 lDongRegnCd를 싣고 areaCode는 싣지 않는다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchPlacesByRegion('26', '28');

    const params = new URL(fetchFn.mock.calls[0][0]).searchParams;
    expect(params.get('lDongRegnCd')).toBe('26');
    expect(params.get('contentTypeId')).toBe('28');
    expect(fetchFn.mock.calls[0][0]).toContain('/areaBasedList2?');
    // areaCode로 조회하면 areacode가 비어 있는 레코드가 통째로 누락된다.
    // (제주 920 -> 1512, 서울 1658 -> 3080, 부산 537 -> 1054건)
    expect(params.get('areaCode')).toBeNull();
  });
});

describe('fetchFestivals', () => {
  it('eventStartDate와 lDongRegnCd를 싣고 areaCode는 싣지 않는다', async () => {
    const fetchFn = mockFetch();
    fetchFn.mockResolvedValue(jsonResponse(envelope('', 0)));

    await fetchFestivals('20260801', '50');

    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toContain('/searchFestival2');
    expect(url.searchParams.get('eventStartDate')).toBe('20260801');
    expect(url.searchParams.get('lDongRegnCd')).toBe('50');
    // areaCode를 붙이면 축제 레코드의 areacode가 비어 있어 0건이 된다.
    expect(url.searchParams.get('areaCode')).toBeNull();
  });
});
