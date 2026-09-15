// 서브패스로만 import한다: `import { Coffee } from 'lucide-react-native'`처럼
// 배럴로 받으면 번들에 dist/esm/icons 전체(15MB, 3,588개 아이콘)가 딸려 온다.
// Metro는 기본 설정에서 tree-shaking을 하지 않아 실제로 쓰는 5개만 남기지
// 못하고 그대로 다 묶는다. 타입은 값이 아니라 런타임에 사라지므로 루트에서
// import해도 번들 크기에 영향이 없다.
import type { LucideIcon } from 'lucide-react-native';
import Bike from 'lucide-react-native/icons/bike';
import Coffee from 'lucide-react-native/icons/coffee';
import Landmark from 'lucide-react-native/icons/landmark';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Utensils from 'lucide-react-native/icons/utensils';
import { Place } from '../api/types';

export type PlaceIconKind =
  | 'festival'
  | 'cafe'
  | 'food'
  | 'activity'
  | 'sightseeing';

export const PLACE_ICONS: Record<PlaceIconKind, LucideIcon> = {
  festival: PartyPopper,
  cafe: Coffee,
  food: Utensils,
  activity: Bike,
  sightseeing: Landmark,
};

/**
 * 사진 없는 장소에 그릴 아이콘 종류를 고른다.
 *
 * 우선순위가 카테고리가 아니라 태그부터인 이유:
 *
 * 1. 축제 태그가 맨 앞. 백엔드가 축제(콘텐츠타입 15)를 별도 카테고리 없이
 *    SIGHTSEEING으로 뭉뚱그리기 때문에(tour-api-mapping.ts의
 *    CONTENT_TYPE_TO_CATEGORY), 카테고리만 보면 축제 카드에 랜드마크 아이콘이
 *    뜬다. 실데이터상 축제는 사진이 100% 있어서 이 분기는 다운로드 실패
 *    같은 예외 상황에서만 쓰이지만, 그 드문 경우에도 랜드마크보다는 낫다.
 * 2. 카페 태그가 그다음. 카테고리만 보면 카페와 식당이 둘 다 FOOD라 같은
 *    포크 아이콘을 쓰게 된다. 운영 DB 기준 사진 없는 5,244건 중 카페 태그가
 *    507건이라 무시할 양이 아니다. ('디저트' 태그는 넣지 않는다 — 카페와
 *    거의 같은 집합이라 별도로 분기해도 얻는 게 없다.)
 * 3. 나머지는 카테고리로 판정한다.
 */
export function placeIconKind(
  place: Pick<Place, 'category' | 'tags'>,
): PlaceIconKind {
  if (place.tags.includes('축제')) {
    return 'festival';
  }
  if (place.tags.includes('카페')) {
    return 'cafe';
  }
  switch (place.category) {
    case 'FOOD':
      return 'food';
    case 'ACTIVITY':
      return 'activity';
    case 'SIGHTSEEING':
    default:
      return 'sightseeing';
  }
}
