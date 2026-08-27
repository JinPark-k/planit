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

export const CAT1_TAG_MAP: Record<string, DerivableTag[]> = {
  A01: ['자연'], // 자연
  A02: ['문화'], // 인문(문화/예술/역사)
  A03: ['액티비티', '레저'], // 레포츠
  A04: [], // 쇼핑 — 이번 PR 미수집
  A05: ['맛집'], // 음식
  B02: [], // 숙박 — 미수집
  C01: [], // 추천코스 — 미수집
};

export const CAT2_TAG_MAP: Record<string, DerivableTag[]> = {
  A0101: ['자연'], // 자연관광지
  A0102: ['자연', '산책'], // 관광자원
  A0201: ['역사', '전통', '문화재'], // 역사관광지
  A0202: ['산책', '체험'], // 휴양관광지
  A0203: ['체험', '액티비티'], // 체험관광지
  A0204: ['체험', '문화'], // 산업관광지
  A0205: ['건축', '문화'], // 건축/조형물
  A0206: ['문화', '실내'], // 문화시설
  A0207: ['축제', '문화'], // 축제
  A0208: ['공연', '문화'], // 공연/행사
  A0301: ['액티비티', '레저'], // 레포츠소개
  A0302: ['액티비티', '체험', '레저'], // 육상 레포츠
  A0303: ['액티비티', '레저', '수상레저'], // 수상 레포츠
  A0304: ['액티비티', '레저'], // 항공 레포츠
  A0305: ['액티비티', '체험', '레저'], // 복합 레포츠
  A0502: ['맛집'], // 음식점
};

/**
 * cat3 단위 세분화. 가장 구체적인 코드가 이긴다(cat3 > cat2 > cat1) — 병합이 아니라 "대체".
 * 대체 방식인 이유: 병합하면 카페(A05020900)가 상위 A0502의 '맛집'을 물려받아
 * '맛집' 키워드에 모든 카페가 걸린다. 각 항목이 전체 태그 집합을 명시하게 하면
 * 명확하고 테스트 가능하며, 미등록 cat3는 cat2 기본값으로 graceful하게 떨어진다.
 *
 * 아래 코드는 categoryCode2 실호출로 확인한 값이다.
 * 주의: A0101에는 1500번이 없다(항구/포구 1400 다음이 등대 1600).
 * A0302(육상 레포츠) 등은 cat3 코드 순번을 실호출로 확인하지 않아 cat2 수준에서만 매핑한다.
 */
export const CAT3_TAG_MAP: Record<string, DerivableTag[]> = {
  // --- A0101 자연관광지 ---
  A01010100: ['자연', '산', '등산', '공원'], // 국립공원
  A01010200: ['자연', '산', '등산', '공원'], // 도립공원
  A01010300: ['자연', '산', '등산', '공원'], // 군립공원
  A01010400: ['자연', '산', '등산'], // 산
  A01010500: ['자연', '산책'], // 자연생태관광지
  A01010600: ['자연', '산', '산책'], // 자연휴양림
  A01010700: ['자연', '산책', '공원'], // 수목원
  A01010800: ['자연', '산책'], // 폭포
  A01010900: ['자연', '산책'], // 계곡
  A01011000: ['자연'], // 약수터
  A01011100: ['자연', '해변'], // 해안절경
  A01011200: ['자연', '해변'], // 해수욕장
  A01011300: ['자연', '해변'], // 섬
  A01011400: ['자연', '해변', '산책'], // 항구/포구
  A01011600: ['자연', '해변', '산책'], // 등대
  A01011700: ['자연', '산책'], // 호수
  A01011800: ['자연', '산책'], // 강
  A01011900: ['자연', '체험'], // 동굴

  // --- A0201 역사관광지 ---
  A02010100: ['역사', '전통', '문화재', '건축'], // 고궁
  A02010200: ['역사', '전통', '문화재'], // 성
  A02010300: ['역사', '전통', '문화재'], // 문
  A02010400: ['역사', '전통', '건축'], // 고택
  A02010500: ['역사', '전통'], // 생가
  A02010600: ['역사', '전통', '체험'], // 민속마을
  A02010700: ['역사', '문화재'], // 유적지/사적지
  A02010800: ['역사', '전통', '문화재'], // 사찰
  A02010900: ['역사', '전통'], // 종교성지
  A02011000: ['역사', '문화'], // 안보관광

  // --- A0206 문화시설 ---
  A02060100: ['문화', '전시', '실내'], // 박물관
  A02060200: ['문화', '전시', '실내', '역사'], // 기념관
  A02060300: ['문화', '전시', '실내'], // 전시관
  A02060400: ['문화', '실내'], // 컨벤션센터
  A02060500: ['문화', '전시', '실내'], // 미술관/화랑
  A02060600: ['문화', '공연', '실내'], // 공연장
  A02060700: ['문화', '실내'], // 문화원
  A02060800: ['문화', '실내'], // 외국문화원
  A02060900: ['문화', '실내'], // 도서관
  A02061000: ['문화', '실내'], // 대형서점
  A02061100: ['문화', '전통', '체험', '실내'], // 문화전수시설
  A02061200: ['문화', '공연', '실내'], // 영화관
  A02061300: ['문화', '실내'], // 어학당
  A02061400: ['문화'], // 학교

  // --- A0502 음식점 ---
  A05020100: ['맛집', '한식'], // 한식
  A05020200: ['맛집', '세계음식'], // 서양식
  A05020300: ['맛집', '세계음식'], // 일식
  A05020400: ['맛집', '세계음식'], // 중식
  A05020700: ['맛집', '세계음식'], // 이색음식점
  A05020900: ['카페', '디저트', '실내'], // 카페/전통찻집 — 의도적으로 '맛집' 제외
  A05021000: ['맛집'], // 클럽
};

export interface TagSource {
  contentTypeId: string | null;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
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
  const catTags =
    lookup(CAT3_TAG_MAP, src.cat3) ??
    lookup(CAT2_TAG_MAP, src.cat2) ??
    lookup(CAT1_TAG_MAP, src.cat1) ??
    [];
  const typeTags = lookup(CONTENT_TYPE_TAG_MAP, src.contentTypeId) ?? [];
  return [...new Set<string>([...typeTags, ...catTags])];
}

/** cat3 오버라이드가 없는 코드를 배치 로그로 노출하기 위한 헬퍼(매핑 튜닝용). */
export function isMappedCat3(cat3: string | null): boolean {
  return Boolean(cat3) && cat3! in CAT3_TAG_MAP;
}
