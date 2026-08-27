import { toPlace } from './place.mapper';
import { PlaceRow } from './places.types';

function row(partial: Partial<PlaceRow> = {}): PlaceRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    content_id: '2871024',
    content_type_id: '39',
    cat1: 'A05',
    cat2: 'A0502',
    cat3: 'A05020100',
    addr1: '서울특별시 강남구 언주로 608',
    addr2: '',
    tel: null,
    overview: null,
    homepage: null,
    image_url: 'http://tong.visitkorea.or.kr/img.jpg',
    raw_response: { contentid: '2871024' },
    name: '가나돈까스의집',
    lat: 37.5099674377,
    lng: 127.0377755568,
    region_code: '1',
    sigungu_code: '1',
    category: 'FOOD',
    tags: ['맛집', '한식'],
    popularity: 0,
    rating: 0.5,
    event_start_date: null,
    event_end_date: null,
    created_at: '2026-08-27T00:00:00Z',
    last_synced_at: '2026-08-27T00:00:00Z',
    ...partial,
  };
}

describe('toPlace', () => {
  it('스케줄링에 필요한 도메인 필드로 변환한다', () => {
    expect(toPlace(row())).toEqual({
      id: '2871024',
      name: '가나돈까스의집',
      location: { lat: 37.5099674377, lng: 127.0377755568 },
      category: 'FOOD',
      tags: ['맛집', '한식'],
      popularity: 0,
      rating: 0.5,
    });
  });

  it('id는 uuid가 아니라 TourAPI content_id를 쓴다', () => {
    // content_id가 외부에 안정적으로 노출되는 식별자다.
    const place = toPlace(row({ id: 'uuid-value', content_id: '999' }));
    expect(place.id).toBe('999');
  });

  it('lat/lng가 뒤바뀌지 않는다', () => {
    const place = toPlace(row({ lat: 33.4, lng: 126.5 }));
    expect(place.location.lat).toBe(33.4);
    expect(place.location.lng).toBe(126.5);
  });

  it('표시용 필드(주소/이미지/전화)는 도메인 Place에 포함하지 않는다', () => {
    const place = toPlace(row());
    expect(place).not.toHaveProperty('addr1');
    expect(place).not.toHaveProperty('image_url');
    expect(place).not.toHaveProperty('tel');
    expect(place).not.toHaveProperty('raw_response');
  });

  it('빈 태그 배열도 그대로 전달한다', () => {
    expect(toPlace(row({ tags: [] })).tags).toEqual([]);
  });

  it.each(['SIGHTSEEING', 'FOOD', 'ACTIVITY'] as const)(
    'category %s 를 그대로 전달한다',
    (category) => {
      expect(toPlace(row({ category })).category).toBe(category);
    },
  );
});
