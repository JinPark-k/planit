/**
 * 기상청 단기예보(getVilageFcst) 클라이언트.
 *
 * 인증키로 TOUR_API_KEY를 쓴다 — 이름이 "tour"인데 날씨에 쓰는 이유는, 공공데이터포털이
 * 계정당 서비스키를 하나만 발급하고(활용신청한 API마다 새 키가 생기지 않는다) 우리가
 * TourAPI 신청 때 받은 키를 기상청 API 신청에도 그대로 등록해 재사용하기 때문이다.
 * 별도 KMA_API_KEY를 두면 실제로는 항상 같은 값을 두 곳에 넣어야 해서 혼란만 커진다.
 */

const KMA_BASE_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

/** 예보 조회는 하루치를 넉넉히 받는다. 하루 최대 예보 항목(카테고리 12종 * 8회)보다 크게 잡는다. */
const NUM_OF_ROWS = 1000;
/** 기상청 API는 오전 5시 발표본을 쓰면 그날 하루 예보가 전부 들어온다. */
const BASE_TIME = '0500';

export type SkyCondition = 'RAIN' | 'CLEAR' | 'UNKNOWN';

interface KmaForecastItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

interface KmaForecastResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      /** totalCount가 0이면 객체가 아니라 빈 문자열("")로 온다(TourAPI와 동일한 습성). */
      items?: { item?: KmaForecastItem[] } | '';
    };
  };
}

function requireServiceKey(): string {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TOUR_API_KEY in environment');
  }
  // .env에는 공공데이터포털 "Encoding" 키가 들어있다. tour-api.client.ts의
  // requireServiceKey와 동일한 이유로 한 번 디코드한다(중복이지만 두 클라이언트가
  // 서로 다른 계층(infra/tour-api vs infra/weather)이라 공유 유틸을 만들 정도는 아니다).
  try {
    return decodeURIComponent(apiKey);
  } catch {
    return apiKey;
  }
}

/**
 * 위경도 -> 기상청 Lambert Conformal Conic 격자(nx/ny).
 * 기상청이 공개한 변환 공식(기상청 격자체계 안내문서)을 그대로 옮긴 것이라 매직넘버로 보여도 임의값이 아니다.
 */
const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 투영 위도1(deg)
const SLAT2 = 60.0; // 투영 위도2(deg)
const OLON = 126.0; // 기준점 경도(deg)
const OLAT = 38.0; // 기준점 위도(deg)
const XO = 43; // 기준점 X좌표(GRID)
const YO = 136; // 기준점 Y좌표(GRID)
const DEGRAD = Math.PI / 180.0;

const re = RE / GRID;
const slat1 = SLAT1 * DEGRAD;
const slat2 = SLAT2 * DEGRAD;
const olon = OLON * DEGRAD;
const olat = OLAT * DEGRAD;

let sn =
  Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
  Math.tan(Math.PI * 0.25 + slat1 * 0.5);
sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
sf = (sf ** sn * Math.cos(slat1)) / sn;
let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
ro = (re * sf) / ro ** sn;

export function toGrid(lat: number, lng: number): { nx: number; ny: number } {
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / ra ** sn;
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

/**
 * KST 기준 base_date(YYYYMMDD)를 정한다.
 *
 * 오전 5시 발표본이 실제로 API에 반영되기까지 지연이 있어, 그 이전에 당일 날짜로 조회하면
 * "아직 없음" 취급으로 빈 응답을 받을 수 있다. 그 구간은 전날 발표본(그래도 3일 예보 범위
 * 안에 오늘이 포함된다)을 쓴다.
 */
function resolveBaseDate(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 5) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

function mostFrequent(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  let best: number | undefined;
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      bestCount = count;
      best = value;
    }
  }
  return best;
}

/**
 * 예보 항목 목록에서 해당 날짜(fcstDate, 'YYYYMMDD') 하루치만 골라 하나의 상태로 요약한다.
 * 순수 함수로 분리해 네트워크 호출 없이 판정 로직만 테스트할 수 있게 한다.
 *
 * 판정 규칙(제안서의 "강수 예보 시/맑음 시" 가중치를 적용하기 위한 최소 신호):
 * - PTY(강수형태)가 0이 아닌 시간대가 있거나 POP(강수확률) 최대값이 60 이상이면 RAIN
 * - 그 외 SKY(하늘상태) 최빈값이 1(맑음)이면 CLEAR
 * - 그 날짜 데이터가 없거나(예보 범위 밖) 위 조건에 해당하지 않으면 UNKNOWN
 */
export function summarizeDayCondition(
  items: readonly KmaForecastItem[],
  fcstDate: string,
): SkyCondition {
  const dayItems = items.filter((item) => item.fcstDate === fcstDate);
  if (dayItems.length === 0) return 'UNKNOWN';

  const hasPrecipitation = dayItems.some(
    (item) => item.category === 'PTY' && Number(item.fcstValue) !== 0,
  );
  const maxPop = Math.max(
    0,
    ...dayItems
      .filter((item) => item.category === 'POP')
      .map((item) => Number(item.fcstValue)),
  );
  if (hasPrecipitation || maxPop >= 60) return 'RAIN';

  const skyValues = dayItems
    .filter((item) => item.category === 'SKY')
    .map((item) => Number(item.fcstValue));
  if (mostFrequent(skyValues) === 1) return 'CLEAR';

  return 'UNKNOWN';
}

/**
 * 해당 날짜의 하루치 예보를 한 값으로 요약한다.
 * 예보 범위 밖이거나 호출 실패면 'UNKNOWN'을 돌려준다(throw 금지 — 날씨는 있으면 좋은
 * 보정치이지, 못 가져왔다고 일정 생성 자체를 막을 값이 아니다).
 */
export async function fetchDayCondition(
  lat: number,
  lng: number,
  date: string,
): Promise<SkyCondition> {
  try {
    const { nx, ny } = toGrid(lat, lng);
    const query = new URLSearchParams({
      serviceKey: requireServiceKey(),
      pageNo: '1',
      numOfRows: String(NUM_OF_ROWS),
      dataType: 'JSON',
      base_date: resolveBaseDate(new Date()),
      base_time: BASE_TIME,
      nx: String(nx),
      ny: String(ny),
    });

    const res = await fetch(`${KMA_BASE_URL}?${query.toString()}`);
    if (!res.ok) return 'UNKNOWN';

    const text = await res.text();
    let parsed: KmaForecastResponse;
    try {
      parsed = JSON.parse(text) as KmaForecastResponse;
    } catch {
      // 인증 실패/쿼터 초과 시 200 + XML 에러 문서가 오는 경우가 있다(tour-api와 동일한 습성).
      return 'UNKNOWN';
    }

    const envelope = parsed.response;
    if (!envelope?.header || envelope.header.resultCode !== '00') {
      return 'UNKNOWN';
    }

    const items = envelope.body?.items;
    const itemList = typeof items === 'string' ? [] : (items?.item ?? []);
    return summarizeDayCondition(itemList, date.replace(/-/g, ''));
  } catch {
    return 'UNKNOWN';
  }
}
