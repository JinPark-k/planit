import { PlaceCategory } from '../../core/schedule/schedule.types';

/** areaBasedList2로 수집하는 콘텐츠타입. 25(여행코스, 0건)/32(숙박)/38(쇼핑)은 미수집. */
export const AREA_BASED_CONTENT_TYPE_IDS = ['12', '14', '28', '39'] as const;

/** 축제는 areaBasedList2가 아니라 searchFestival2로만 수집한다(행사 기간 필드가 필요하므로). */
export const FESTIVAL_CONTENT_TYPE_ID = '15';

/**
 * cat 코드로 실제 도출 가능한 태그의 전체 집합.
 * core/keyword-tag의 KEYWORD_TAG_MAP은 이 안의 값만 써야 한다
 * (도출 불가능한 태그는 scorePlace의 tagMatchRatio 분모만 키워 점수를 조용히 깎는다).
 * 검증은 batch/keyword-tag-coverage.spec.ts.
 */
export const DERIVABLE_TAGS = [
  '자연',
  '해변',
  '산',
  '등산',
  '산책',
  '공원',
  '역사',
  '전통',
  '문화재',
  '건축',
  '문화',
  '전시',
  '공연',
  '축제',
  '실내',
  '액티비티',
  '체험',
  '레저',
  '수상레저',
  '맛집',
  '한식',
  '세계음식',
  '카페',
  '디저트',
] as const;
export type DerivableTag = (typeof DERIVABLE_TAGS)[number];

const CONTENT_TYPE_CATEGORY_MAP: Record<string, PlaceCategory> = {
  '12': 'SIGHTSEEING', // 관광지
  '14': 'SIGHTSEEING', // 문화시설
  '15': 'SIGHTSEEING', // 축제공연행사
  '28': 'ACTIVITY', // 레포츠
  '39': 'FOOD', // 음식점
};

/** cat 코드가 비어 있어도 콘텐츠타입만으로 확실히 보장되는 최소 태그. */
export const CONTENT_TYPE_TAG_MAP: Record<string, DerivableTag[]> = {
  '14': ['문화'],
  '15': ['축제'],
  '28': ['액티비티', '레저'],
  // '12'/'39'는 콘텐츠타입만으로 단정할 수 없어 비워둔다
  // (예: 39는 카페일 수도 있어 '맛집'을 강제하면 안 된다).
};

/**
 * TourAPI 분류체계(lclsSystm) -> 태그. 태그 도출의 1순위 근거다.
 *
 * 2026-08 실측: 제주 1517건 중 462건(30.5%)이 cat1/2/3가 전부 빈 문자열이라
 * 태그가 하나도 안 붙었다 — 새별오름·카멜리아힐·이호테우해변 같은 대표 관광지가 여기 속한다.
 * 그 462건은 전부 lclsSystm3를 갖고 있어, 이 매핑으로 공백이 메워진다.
 * areacode가 비어 있던 것과 같은 종류의 필드 누락이며, lclsSystm 쪽이 새 분류체계다.
 *
 * 코드명은 lclsSystmCode2 API에서 받은 공식 명칭 기준(총 315개 코드).
 * 어떤 소분류가 어떤 관광타입(contenttypeid)에 속하는지는 한국관광공사
 * "신분류체계정보 관광타입정보 연계 정의서"(개방데이터 활용매뉴얼 v4.4 동봉, 소분류 240개)로 대조했다.
 * 우리가 수집하는 타입(12/14/15/28/39)이 속한 중분류 40개를 모두 덮는다.
 * 3단계가 2단계를 "대체"한다(병합 아님) — 병합하면 카페(FD050100)가 상위 FD05의 태그를
 * 넘어 상위 분류의 '맛집'까지 물려받는 식의 오분류가 생긴다.
 */
export const LCLS2_TAG_MAP: Record<string, DerivableTag[]> = {
  // EV 축제/공연/행사
  EV01: ['축제'],
  EV02: ['공연', '문화'],
  EV03: ['전시', '문화'],
  // EX 체험관광
  EX01: ['체험', '전통', '문화'],
  EX02: ['체험', '문화'],
  EX03: ['체험', '액티비티'],
  EX04: ['체험', '전통', '역사'],
  EX05: ['체험', '실내'],
  EX06: ['체험', '문화'],
  EX07: ['체험', '액티비티'],
  // FD 음식
  FD01: ['맛집', '한식'],
  FD02: ['맛집', '세계음식'],
  FD03: ['맛집'],
  FD04: ['맛집'],
  FD05: ['카페', '디저트', '실내'],
  // HS 역사관광
  HS01: ['역사', '문화재', '전통'],
  HS02: ['역사', '문화재'],
  HS03: ['역사', '전통', '문화재'],
  HS04: ['역사'],
  // LS 레저스포츠
  LS01: ['액티비티', '레저'],
  LS02: ['액티비티', '레저', '수상레저'],
  LS03: ['액티비티', '레저'],
  LS04: ['액티비티', '레저'],
  // NA 자연관광
  NA01: ['자연', '산', '등산'],
  NA02: ['자연', '산책'],
  NA03: ['자연', '산책'],
  NA04: ['자연', '공원', '산책'],
  NA05: ['자연'],
  // VE 문화관광
  VE01: ['건축', '문화'],
  VE02: ['액티비티', '체험'],
  VE03: ['공원', '산책'],
  VE04: ['문화', '산책'],
  VE05: ['액티비티'],
  VE06: ['공연', '문화', '실내'],
  VE07: ['전시', '문화', '실내'],
  VE08: ['문화', '실내'],
  VE09: ['문화', '실내'],
  VE10: ['액티비티', '레저'],
  VE12: ['문화'],
  // 매핑하지 않음: AC(숙박)/C01(추천코스)/SH(쇼핑)은 수집 대상 관광타입이 아니고,
  // VE11(교통시설)은 여행지로서 의미 있는 태그가 없다.
  // AC05(캠핑)는 관광타입 28로 들어오지만 숙박이라 아예 제외한다 — EXCLUDED_LCLS2_CODES 참고.
};

/** 2단계 기본값이 맞지 않는 코드만 3단계에서 덮어쓴다. */
export const LCLS3_TAG_MAP: Record<string, DerivableTag[]> = {
  EV030300: ['액티비티'], // 스포츠경기
  EX070100: ['체험', '액티비티', '수상레저'], // 유람선/잠수함관광
  FD030100: ['카페', '디저트'], // 제과 — 식사류가 아니라 카페에 가깝다
  HS011100: ['역사', '건축'], // 근대건축물
  NA010200: ['자연', '산책'], // 숲
  NA010300: ['자연', '산책'], // 폭포
  NA010400: ['자연', '산책'], // 계곡
  NA010500: ['자연'], // 약수터
  NA020500: ['자연', '해변'], // 섬
  NA020700: ['자연', '해변', '산책'], // 항구/포구
  NA020800: ['자연', '해변'], // 해안절경
  NA020900: ['자연', '해변'], // 해변, 해수욕장
  NA030100: ['자연', '체험'], // 동굴
  NA040100: ['자연', '산', '등산', '공원'], // 국립공원
  NA040200: ['자연', '산', '등산', '공원'], // 도립공원
  NA040300: ['자연', '산', '등산', '공원'], // 군립공원
  NA040600: ['자연', '산', '산책'], // 자연휴양림
  NA040700: ['자연', '산책', '공원'], // 수목원ㆍ정원
  VE010800: ['자연', '해변', '산책'], // 등대
  VE040300: ['산책', '자연'], // 둘레길
};

/**
 * 관광타입은 수집 대상이지만 실제로는 숙박이라 일정에 넣을 수 없는 분류.
 *
 * AC05(캠핑: 일반야영장/오토캠핑장/카라반/글램핑장)는 공식 정의서상 관광타입 28(레포츠)이라
 * 레포츠 수집에 딸려 들어온다. 하지만 잠을 자는 곳이지 낮에 들르는 일정 항목이 아니다.
 * 그대로 두면 '별헤는밤글램핑' 같은 숙소가 ACTIVITY로 오후 시간대에 배치된다.
 * contentTypeId 32(숙박)를 수집하지 않기로 한 결정과 같은 기준으로 제외한다.
 *
 * 2026-08 실측: 제주 22건 + 부산 12건. 34건 전부 lclsSystm2로 걸러지고,
 * 구 cat 코드가 A0302x인 행 중 캠핑이 아닌 49건은 전부 LS01(육상레저스포츠)이라 오탐이 없다.
 */
export const EXCLUDED_LCLS2_CODES = new Set(['AC05']);

export function isExcludedLcls2(lclsSystm2: string | null): boolean {
  return lclsSystm2 !== null && EXCLUDED_LCLS2_CODES.has(lclsSystm2);
}

export interface TagSource {
  contentTypeId: string | null;
  lclsSystm2: string | null;
  lclsSystm3: string | null;
}

/**
 * 빈 문자열('')은 falsy지만 null이 아니므로 `??` 체인만으로는 걸러지지 않는다.
 * (`map[''] ?? next`는 undefined가 되어 폴백되지만, 코드 의도를 명시하기 위해 헬퍼로 감싼다.)
 */
function lookup(
  map: Record<string, DerivableTag[]>,
  code: string | null,
): DerivableTag[] | undefined {
  return code ? map[code] : undefined;
}

export function resolveCategory(
  contentTypeId: string | null,
): PlaceCategory | null {
  if (!contentTypeId) return null;
  return CONTENT_TYPE_CATEGORY_MAP[contentTypeId] ?? null;
}

export function resolveTags(src: TagSource): string[] {
  const classified =
    lookup(LCLS3_TAG_MAP, src.lclsSystm3) ??
    lookup(LCLS2_TAG_MAP, src.lclsSystm2) ??
    [];
  const typeTags = lookup(CONTENT_TYPE_TAG_MAP, src.contentTypeId) ?? [];
  return [...new Set<string>([...typeTags, ...classified])];
}

/**
 * 분류체계로 태그를 하나도 못 만드는 코드인지. 배치 로그로 노출해 매핑 공백을 찾는다.
 *
 * 소분류 오버라이드 유무가 아니라 "중분류 기본값까지 없는지"를 본다.
 * 예: FD010100(관광식당)은 소분류 오버라이드가 없지만 FD01이 ['맛집','한식']을 주므로
 * 문제가 아니다. 이걸 미매핑으로 세면 로그가 정상 코드로 가득 차 신호가 묻힌다.
 */
export function isUnmappedLcls(
  lclsSystm2: string | null,
  lclsSystm3: string | null,
): boolean {
  if (lclsSystm3 !== null && lclsSystm3 in LCLS3_TAG_MAP) return false;
  if (lclsSystm2 !== null && lclsSystm2 in LCLS2_TAG_MAP) return false;
  return true;
}
