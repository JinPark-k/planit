import { RegionCode } from '../api/types';

/**
 * 지역 표시명은 백엔드에 없다(REGION_CODES는 코드만 가진다).
 * 아직 앱에 두지만, 지역이 더 늘어나면 /regions 같은 API로 옮긴다.
 */
export const REGION_OPTIONS: { code: RegionCode; label: string }[] = [
  { code: 'SEOUL', label: '서울' },
  { code: 'GANGWON', label: '강원' },
  { code: 'GYEONGBUK', label: '경북' },
  { code: 'JEONNAM_GWANGJU', label: '전남광주' },
  { code: 'BUSAN', label: '부산' },
  { code: 'JEJU', label: '제주' },
];
