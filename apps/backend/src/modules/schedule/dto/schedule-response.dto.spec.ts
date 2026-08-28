import { ScheduleDay } from '../../../core';
import { PlaceRow } from '../../../infra/supabase/places.types';
import { toScheduleResponse } from './schedule-response.dto';

function row(contentId: string, name: string): PlaceRow {
  return {
    id: `uuid-${contentId}`,
    content_id: contentId,
    content_type_id: '12',
    cat1: null,
    cat2: null,
    cat3: null,
    addr1: `주소-${name}`,
    addr2: null,
    tel: null,
    overview: null,
    homepage: null,
    image_url: `http://img/${contentId}.jpg`,
    raw_response: null,
    name,
    lat: 33.5,
    lng: 126.5,
    region_code: '39',
    sigungu_code: null,
    category: 'SIGHTSEEING',
    tags: ['자연'],
    popularity: 0,
    rating: 0.5,
    event_start_date: null,
    event_end_date: null,
    created_at: '2026-08-28T00:00:00Z',
    last_synced_at: '2026-08-28T00:00:00Z',
  };
}

function day(): ScheduleDay {
  return {
    day: 1,
    items: [
      {
        place: {
          id: '1',
          name: '용두암',
          location: { lat: 33.5, lng: 126.5 },
          category: 'SIGHTSEEING',
          tags: ['자연'],
          popularity: 0,
          rating: 0.5,
        },
        startTime: '09:00',
      },
      {
        place: {
          id: '2',
          name: '제주항',
          location: { lat: 33.51, lng: 126.52 },
          category: 'SIGHTSEEING',
          tags: ['자연'],
          popularity: 0,
          rating: 0.5,
        },
        startTime: '10:39',
        travelFromPreviousMinutes: 9,
      },
    ],
  };
}

describe('toScheduleResponse', () => {
  const rowById = new Map([
    ['1', row('1', '용두암')],
    ['2', row('2', '제주항')],
  ]);

  it('시각과 이동시간을 그대로 전달한다', () => {
    const [result] = toScheduleResponse([day()], rowById);
    expect(result.day).toBe(1);
    expect(result.items.map((i) => i.startTime)).toEqual(['09:00', '10:39']);
    expect(result.items[0].travelFromPreviousMinutes).toBeUndefined();
    expect(result.items[1].travelFromPreviousMinutes).toBe(9);
  });

  it('core의 Place에 없는 표시 필드를 row에서 다시 붙인다', () => {
    const [result] = toScheduleResponse([day()], rowById);
    expect(result.items[0].place.imageUrl).toBe('http://img/1.jpg');
    expect(result.items[0].place.address).toBe('주소-용두암');
  });

  it('row를 못 찾은 아이템은 제외한다 (undefined가 응답에 섞이지 않도록)', () => {
    const partial = new Map([['1', row('1', '용두암')]]);
    const [result] = toScheduleResponse([day()], partial);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].place.id).toBe('1');
  });

  it('빈 일차도 형태를 유지한다', () => {
    const result = toScheduleResponse([{ day: 2, items: [] }], rowById);
    expect(result).toEqual([{ day: 2, items: [] }]);
  });
});
