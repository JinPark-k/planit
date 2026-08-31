import { ScheduleService, toDayStartOverrides } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { GenerateScheduleFromPlacesDto } from './dto/generate-schedule-from-places.dto';
import { PlaceListRow } from '../../infra/supabase/places.types';
import { PlacesService } from '../places/places.service';

function dto(partial: Partial<GenerateScheduleDto> = {}): GenerateScheduleDto {
  return {
    keywords: [],
    region: 'JEJU',
    dayCount: 2,
    travelMode: 'CAR',
    ...partial,
  };
}

describe('toDayStartOverrides', () => {
  // API 표면은 배열, core는 일차 번호 맵을 쓴다.
  // 숫자 키 맵은 class-validator 중첩 검증도 Swagger 스키마 표현도 안 되기 때문이다.
  it('배열을 일차 번호 맵으로 바꾼다', () => {
    const result = toDayStartOverrides(
      dto({
        dayStarts: [
          { day: 1, location: { lat: 33.4996, lng: 126.5312 }, time: '10:30' },
          { day: 2, time: '09:30' },
        ],
      }),
    );
    expect(result).toEqual({
      1: { location: { lat: 33.4996, lng: 126.5312 }, time: '10:30' },
      2: { location: undefined, time: '09:30' },
    });
  });

  it('지정 안 한 일차는 맵에 넣지 않는다 (core가 기본값을 쓰도록)', () => {
    const result = toDayStartOverrides(dto({ dayStarts: [{ day: 2 }] }));
    expect(Object.keys(result ?? {})).toEqual(['2']);
  });

  it('dayStarts가 없거나 비면 undefined를 반환한다', () => {
    expect(toDayStartOverrides(dto())).toBeUndefined();
    expect(toDayStartOverrides(dto({ dayStarts: [] }))).toBeUndefined();
  });
});

/** PLACE_LIST_COLUMNS가 뽑는 컬럼만 가진 최소 row. */
function row(
  contentId: string,
  category: 'SIGHTSEEING' | 'FOOD' | 'ACTIVITY',
  lat: number,
  lng: number,
  tags: string[] = [],
): PlaceListRow {
  return {
    content_id: contentId,
    name: `장소-${contentId}`,
    lat,
    lng,
    category,
    tags,
    popularity: 0,
    rating: 0.5,
    addr1: '제주특별자치도',
    addr2: null,
    image_url: null,
    tel: null,
  };
}

/** findRowsByRegion만 흉내 내는 PlacesService 대역. */
function serviceWith(rows: PlaceListRow[]): ScheduleService {
  const places = {
    findRowsByRegion: () => Promise.resolve(rows),
  } as unknown as PlacesService;
  return new ScheduleService(places);
}

function fromPlacesDto(
  partial: Partial<GenerateScheduleFromPlacesDto> = {},
): GenerateScheduleFromPlacesDto {
  return {
    placeIds: [],
    region: 'JEJU',
    dayCount: 1,
    travelMode: 'CAR',
    ...partial,
  };
}

function scheduledIds(result: {
  days: { items: { place: { id: string } }[] }[];
}) {
  return result.days.flatMap((day) => day.items.map((item) => item.place.id));
}

describe('ScheduleService.generateFromPlaces', () => {
  it('담은 장소가 전부 일정에 들어간다', async () => {
    const rows = [
      row('picked-1', 'SIGHTSEEING', 33.45, 126.57),
      row('picked-2', 'SIGHTSEEING', 33.452, 126.572),
      ...Array.from({ length: 10 }, (_, i) =>
        row(`filler-${i}`, 'SIGHTSEEING', 33.46 + i * 0.001, 126.58),
      ),
    ];

    const result = await serviceWith(rows).generateFromPlaces(
      fromPlacesDto({ placeIds: ['picked-1', 'picked-2'] }),
    );

    expect(scheduledIds(result)).toEqual(
      expect.arrayContaining(['picked-1', 'picked-2']),
    );
    expect(result.excludedPlaces).toEqual([]);
  });

  it('그 지역에 없는 id는 NOT_FOUND로 알린다', async () => {
    // 400으로 요청 전체를 거절하지 않는다. 리스트를 본 시점과 이 요청 사이에
    // 배치가 장소를 지웠을 수 있고, 그건 클라이언트 잘못이 아니다.
    const rows = [row('real', 'SIGHTSEEING', 33.45, 126.57)];

    const result = await serviceWith(rows).generateFromPlaces(
      fromPlacesDto({ placeIds: ['real', '없는id'] }),
    );

    expect(result.excludedPlaces).toEqual([
      { placeId: '없는id', reason: 'NOT_FOUND' },
    ]);
    expect(scheduledIds(result)).toContain('real');
  });

  it('하루에 다 못 넣으면 NO_TIME으로 알리고 장소 정보도 같이 준다', async () => {
    // 09:00~21:00에 관광지(90분)는 8곳이 한계다. 20곳을 담으면 남는다.
    const rows = Array.from({ length: 20 }, (_, i) =>
      row(`p-${i}`, 'SIGHTSEEING', 33.45 + i * 0.0005, 126.57),
    );

    const result = await serviceWith(rows).generateFromPlaces(
      fromPlacesDto({ placeIds: rows.map((r) => r.content_id), dayCount: 1 }),
    );

    expect(result.excludedPlaces.length).toBeGreaterThan(0);
    for (const excluded of result.excludedPlaces) {
      expect(excluded.reason).toBe('NO_TIME');
      // 사용자가 고른 장소이므로 이름·주소를 보여줄 수 있어야 한다.
      expect(excluded.place?.name).toBe(`장소-${excluded.placeId}`);
    }

    // 들어간 것 + 빠진 것 = 담은 것 전부. 조용히 사라지는 장소가 없어야 한다.
    const accounted = new Set([
      ...scheduledIds(result),
      ...result.excludedPlaces.map((e) => e.placeId),
    ]);
    expect(accounted.size).toBe(rows.length);
  });

  it('관광지만 담아도 끼니가 자동으로 채워진다', async () => {
    const rows = [
      row('sight', 'SIGHTSEEING', 33.45, 126.57),
      row('restaurant', 'FOOD', 33.451, 126.571),
    ];

    const result = await serviceWith(rows).generateFromPlaces(
      fromPlacesDto({ placeIds: ['sight'] }),
    );

    expect(scheduledIds(result)).toContain('sight');
    expect(scheduledIds(result)).toContain('restaurant');
  });

  it('placeIds가 비어 있어도 거절하지 않고 일정을 만든다', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row(`p-${i}`, 'SIGHTSEEING', 33.45 + i * 0.001, 126.57),
    );

    const result = await serviceWith(rows).generateFromPlaces(
      fromPlacesDto({ placeIds: [] }),
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].items.length).toBeGreaterThan(0);
    expect(result.excludedPlaces).toEqual([]);
  });
});
