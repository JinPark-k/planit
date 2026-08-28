import { PlaceRow } from '../../../infra/supabase/places.types';
import { toPlaceResponse } from './place-response.dto';

function row(partial: Partial<PlaceRow> = {}): PlaceRow {
  return {
    id: 'uuid-1',
    content_id: '2871024',
    content_type_id: '39',
    cat1: 'A05',
    cat2: 'A0502',
    cat3: 'A05020100',
    addr1: '제주특별자치도 제주시 탑동로 119',
    addr2: '(삼도이동)',
    tel: '064-000-0000',
    overview: null,
    homepage: null,
    image_url: 'http://tong.visitkorea.or.kr/img.jpg',
    raw_response: null,
    name: '제주에가면',
    lat: 33.5136,
    lng: 126.5218,
    region_code: '39',
    sigungu_code: '4',
    category: 'FOOD',
    tags: ['맛집', '한식'],
    popularity: 0,
    rating: 0.5,
    event_start_date: null,
    event_end_date: null,
    created_at: '2026-08-28T00:00:00Z',
    last_synced_at: '2026-08-28T00:00:00Z',
    ...partial,
  };
}

describe('toPlaceResponse', () => {
  it('도메인 Place가 버리는 표시용 필드(주소/이미지/전화)를 포함한다', () => {
    // core의 Place에는 이 필드들이 없어서 화면을 못 그린다. 이 매퍼가 존재하는 이유다.
    const dto = toPlaceResponse(row());
    expect(dto.address).toBe('제주특별자치도 제주시 탑동로 119 (삼도이동)');
    expect(dto.imageUrl).toBe('http://tong.visitkorea.or.kr/img.jpg');
    expect(dto.tel).toBe('064-000-0000');
  });

  it('id는 uuid가 아니라 TourAPI content_id를 쓴다', () => {
    expect(toPlaceResponse(row({ id: 'uuid-x', content_id: '999' })).id).toBe(
      '999',
    );
  });

  it('lat/lng가 뒤바뀌지 않는다', () => {
    const dto = toPlaceResponse(row({ lat: 33.4, lng: 126.5 }));
    expect(dto.location).toEqual({ lat: 33.4, lng: 126.5 });
  });

  it('addr2가 비어 있으면 addr1만 쓴다', () => {
    expect(toPlaceResponse(row({ addr2: '' })).address).toBe(
      '제주특별자치도 제주시 탑동로 119',
    );
  });

  it('빈 문자열/공백은 값 없음으로 취급한다 (TourAPI가 미기입을 ""로 준다)', () => {
    const dto = toPlaceResponse(
      row({ addr1: '', addr2: '   ', tel: '', image_url: '' }),
    );
    expect(dto.address).toBeUndefined();
    expect(dto.tel).toBeUndefined();
    expect(dto.imageUrl).toBeUndefined();
  });

  it('null 필드도 값 없음으로 취급한다', () => {
    const dto = toPlaceResponse(row({ tel: null, image_url: null }));
    expect(dto.tel).toBeUndefined();
    expect(dto.imageUrl).toBeUndefined();
  });

  it('내부 전용 필드(스코어 입력값/원본 응답)는 노출하지 않는다', () => {
    const dto = toPlaceResponse(row());
    expect(dto).not.toHaveProperty('popularity');
    expect(dto).not.toHaveProperty('rating');
    expect(dto).not.toHaveProperty('raw_response');
    expect(dto).not.toHaveProperty('region_code');
  });
});
