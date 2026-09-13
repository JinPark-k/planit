import { Place, PlaceCategory } from '../../core/schedule/schedule.types';
import { PlaceListRow } from './places.types';

/**
 * places 테이블 row -> 도메인 Place.
 *
 * core/의 Place는 스케줄링에 필요한 최소 필드만 갖는다.
 * 주소/이미지/전화 같은 표시용 필드는 여기서 의도적으로 버린다
 * (core가 특정 데이터 소스의 필드에 물들지 않게 하기 위함).
 * 화면에 그 값들이 필요해지면 core의 Place가 아니라 응답 DTO를 따로 만들어 붙인다.
 */
export function toPlace(row: PlaceListRow): Place {
  return {
    id: row.content_id,
    name: row.name,
    location: { lat: row.lat, lng: row.lng },
    // 호출측(findRowsByRegion)이 category IS NOT NULL로 걸러서 넘긴다.
    category: row.category as PlaceCategory,
    tags: row.tags,
    popularity: row.popularity,
    rating: row.rating,
    opensAt: toMinutes(row.event_open_time),
  };
}

/**
 * 'HH:MM' 또는 'HH:MM:SS'(Postgres time) -> 자정 기준 분.
 *
 * 축제만 값이 있다. 일반 장소는 영업시간을 수집하지 않아 비어 있고, 그때는
 * undefined를 돌려줘 시간 제약 없이 배치되게 한다.
 */
function toMinutes(time: string | null): number | undefined {
  if (!time) return undefined;
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined;
  return hour * 60 + minute;
}
