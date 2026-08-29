import { RegionCode } from '../api/types';

/**
 * 지역 표시명은 백엔드에 없다(REGION_CODES는 코드만 가진다).
 * 지원 지역이 3개뿐이라 앱에 둔다 — 늘어나면 /regions 같은 API로 옮긴다.
 */
export const REGION_OPTIONS: { code: RegionCode; label: string }[] = [
  { code: 'SEOUL', label: '서울' },
  { code: 'BUSAN', label: '부산' },
  { code: 'JEJU', label: '제주' },
];
