import {
  TourApiFestivalItem,
  TourApiRawItem,
  TourApiResponse,
} from './tour-api.types';

const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const MOBILE_OS = 'ETC';
const MOBILE_APP = 'planit';
/** 1000까지 정상 동작 확인. 페이지 수를 줄여 공개 API 호출 횟수를 최소화한다. */
const PAGE_SIZE = 1000;
/** 페이지 간 간격(ms). fetchAllPages 주석 참고. */
const REQUEST_DELAY_MS = 200;
/** 응답 totalCount가 비정상일 때 무한루프를 막는 안전장치. */
const MAX_PAGES = 50;
/**
 * 네트워크 오류/5xx 재시도 횟수.
 *
 * 2회 + 고정 1초 간격이었을 때, GitHub Actions 크론에서 부산 잡이
 * `ConnectTimeoutError (apis.data.go.kr:443, timeout: 10000ms)`로 죽었다.
 * 2번의 시도가 26초 만에 소진됐는데, 바로 뒤에 순차 실행된 제주/서울은 성공했으니
 * 장애는 1분도 가지 않았다 — 재시도 창이 짧아서 놓친 것이다.
 * 해외 러너에서 data.go.kr 접속은 간헐적으로 10초를 넘기므로 창을 넓힌다.
 */
const MAX_ATTEMPTS = 4;
/** 재시도 간격(ms): 1s -> 3s -> 9s. 총 재시도 창 ~13초 + 시도별 연결 타임아웃. */
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_BACKOFF_FACTOR = 3;

type TourApiPath = 'areaBasedList2' | 'searchFestival2';

interface FatalError extends Error {
  fatal?: boolean;
}

function fatal(message: string): FatalError {
  const err: FatalError = new Error(message);
  err.fatal = true;
  return err;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireServiceKey(): string {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TOUR_API_KEY in environment');
  }
  // .env에는 공공데이터포털 "Encoding" 키(%2F, %3D 포함)가 들어있다.
  // URLSearchParams가 다시 인코딩하므로 여기서 한 번 디코드하지 않으면
  // 이중 인코딩(%252F)이 되어 인증이 실패한다.
  // "Decoding" 키(+,/,= 는 있지만 %는 없음)에 대해서는 decodeURIComponent가 no-op이라 두 형태 모두 안전하다.
  try {
    return decodeURIComponent(apiKey);
  } catch {
    return apiKey; // 디코드 불가한 형태면 원본 그대로 사용
  }
}

async function requestPage<TItem>(
  path: TourApiPath,
  params: Record<string, string>,
): Promise<{ items: TItem[]; totalCount: number }> {
  const query = new URLSearchParams({
    serviceKey: requireServiceKey(),
    MobileOS: MOBILE_OS,
    MobileApp: MOBILE_APP,
    _type: 'json',
    ...params,
  });
  const url = `${TOUR_API_BASE_URL}/${path}?${query.toString()}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.status >= 500) {
        // 5xx는 일시적일 수 있으므로 재시도 대상(= fatal 아님).
        throw new Error(
          `[tour-api] ${path} HTTP ${res.status} ${res.statusText}`,
        );
      }
      if (!res.ok) {
        // 4xx는 재시도해도 동일하므로 즉시 실패시킨다.
        throw fatal(`[tour-api] ${path} HTTP ${res.status} ${res.statusText}`);
      }

      // 인증 실패/쿼터 초과 시 200 + XML 에러 문서가 오는 경우가 있어 파싱 실패를 따로 잡는다.
      const text = await res.text();
      let parsed: TourApiResponse<TItem>;
      try {
        parsed = JSON.parse(text) as TourApiResponse<TItem>;
      } catch {
        throw fatal(
          `[tour-api] ${path} returned non-JSON response: ${text.slice(0, 200)}`,
        );
      }

      const envelope = parsed?.response;
      if (!envelope?.header || !envelope?.body) {
        throw fatal(
          `[tour-api] ${path} unexpected response shape: ${text.slice(0, 200)}`,
        );
      }
      if (envelope.header.resultCode !== '0000') {
        throw fatal(
          `[tour-api] ${path} failed: resultCode=${envelope.header.resultCode} resultMsg=${envelope.header.resultMsg}`,
        );
      }

      // totalCount가 0이면 body.items가 객체가 아니라 빈 문자열("")로 온다.
      const body = envelope.body;
      const items =
        typeof body.items === 'string' ? [] : (body.items.item ?? []);
      return { items, totalCount: Number(body.totalCount) || 0 };
    } catch (err) {
      lastError = err;
      if ((err as FatalError).fatal || attempt === MAX_ATTEMPTS) break;
      // 네트워크 오류/5xx만 재시도. 지수 백오프로 일시적 장애가 지나갈 시간을 준다.
      const waitMs =
        RETRY_BASE_DELAY_MS * RETRY_BACKOFF_FACTOR ** (attempt - 1);
      console.warn(
        `[tour-api] ${path} attempt ${attempt}/${MAX_ATTEMPTS} failed ` +
          `(${err instanceof Error ? err.message : String(err)}), retrying in ${waitMs}ms`,
      );
      await delay(waitMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * 페이지네이션은 순차 + 페이지 간 200ms 지연으로 처리한다.
 * - 전체 호출량이 작다: 지역당 콘텐츠타입 4종 + 축제 1회 ≈ 5~7회.
 *   병렬화해도 실행 시간이 몇 초 줄 뿐이라 얻는 게 없다.
 * - 공공데이터포털 키는 일일 트래픽 쿼터와 순간 호출 제한이 있어,
 *   순차 + 소폭 지연이 429/일시 차단 위험을 없애는 가장 싼 방법이다.
 */
async function fetchAllPages<TItem>(
  path: TourApiPath,
  baseParams: Record<string, string>,
): Promise<TItem[]> {
  const all: TItem[] = [];
  let pageNo = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (all.length < totalCount && pageNo <= MAX_PAGES) {
    if (pageNo > 1) await delay(REQUEST_DELAY_MS);
    const page = await requestPage<TItem>(path, {
      ...baseParams,
      numOfRows: String(PAGE_SIZE),
      pageNo: String(pageNo),
    });
    totalCount = page.totalCount;
    if (page.items.length === 0) break; // 방어: 빈 페이지면 즉시 종료
    all.push(...page.items);
    pageNo += 1;
  }
  return all;
}

/**
 * 지역기반 관광정보 조회. 콘텐츠타입 단위로 호출한다(12/14/28/39).
 *
 * areaCode가 아니라 lDongRegnCd(법정동 시도코드)로 거른다.
 * TourAPI의 areacode 필드가 채워지지 않은 레코드가 많아, areaCode로 조회하면
 * 그런 레코드가 통째로 빠진다 (새별오름 contentid=572973, 카멜리아힐 741109 등
 * 제주 대표 관광지가 areacode='' 라서 누락됐다).
 *
 * 2026-08 실측 — 우리가 수집하는 타입(12/14/28/39) 합계:
 *   제주 920 -> 1512, 서울 1658 -> 3080, 부산 537 -> 1054.
 * lDongRegnCd 결과가 areaCode 결과를 완전히 포함하는 것도 확인했다
 * (areaCode에만 있는 contentid 0건). 그래서 합집합이 아니라 단순 전환으로 충분하다.
 *
 * 같은 원인으로 축제(searchFestival2)는 이미 lDongRegnCd로 필터링하고 있었다.
 */
export function fetchPlacesByRegion(
  lDongRegnCd: string,
  contentTypeId: string,
): Promise<TourApiRawItem[]> {
  return fetchAllPages<TourApiRawItem>('areaBasedList2', {
    lDongRegnCd,
    contentTypeId,
  });
}

/**
 * 축제 조회. 장소와 같은 이유로 areaCode가 아니라 lDongRegnCd로 거른다
 * (축제 레코드는 areacode가 빈 문자열이라 areaCode 필터가 0건이 된다).
 *
 * 2026-08 실측으로 서버 필터와 전국 조회 후 클라이언트 필터의 결과가
 * 완전히 동일함을 확인했다(제주 5 / 서울 50 / 부산 19건, contentid 집합 일치).
 * 전국 264건을 받아 버리던 것을 지역분만 받도록 바꾼다.
 *
 * @param eventStartDate YYYYMMDD. 이 날짜 기준 진행중/예정 축제를 반환.
 * @param lDongRegnCd 법정동 시도코드.
 */
export function fetchFestivals(
  eventStartDate: string,
  lDongRegnCd: string,
): Promise<TourApiFestivalItem[]> {
  return fetchAllPages<TourApiFestivalItem>('searchFestival2', {
    eventStartDate,
    lDongRegnCd,
  });
}
