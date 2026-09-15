import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScheduleDay } from '../api/types';
import { ActiveTrip, clearActiveTrip, getActiveTrip, setActiveTrip } from './activeTrip';

const sampleDays: ScheduleDay[] = [
  {
    day: 1,
    items: [
      {
        place: {
          id: 'p1',
          name: '성산일출봉',
          category: 'SIGHTSEEING',
          tags: ['자연'],
          location: { lat: 33.5, lng: 126.9 },
        },
        startTime: '09:00',
        stayMinutes: 60,
      },
    ],
  },
];

function sampleTrip(): ActiveTrip {
  return {
    tripId: 'trip-1',
    startDateKey: '2026-03-02',
    regionLabel: '제주',
    days: sampleDays,
    startedAt: '2026-03-01T12:00:00.000Z',
  };
}

describe('activeTrip', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('저장한 여행을 그대로 복구한다', async () => {
    await setActiveTrip(sampleTrip());

    const active = await getActiveTrip();
    expect(active).toEqual(sampleTrip());
  });

  it('저장 시점 스냅샷이라 원본 days 배열을 나중에 바꿔도 저장된 값은 그대로다', async () => {
    const trip = sampleTrip();
    await setActiveTrip(trip);

    // 원본을 저장 이후에 변형해 본다 — 저장된 값이 참조를 공유하지 않아야 한다.
    trip.days[0].items[0].stayMinutes = 999;

    const active = await getActiveTrip();
    expect(active?.days[0].items[0].stayMinutes).toBe(60);
  });

  it('새로 시작하면 이전 값을 덮어쓴다', async () => {
    await setActiveTrip(sampleTrip());
    await setActiveTrip({ ...sampleTrip(), tripId: 'trip-2' });

    const active = await getActiveTrip();
    expect(active?.tripId).toBe('trip-2');
  });

  it('저장된 값이 없으면 null이다', async () => {
    expect(await getActiveTrip()).toBeNull();
  });

  it('깨진 JSON이면 null로 복구한다', async () => {
    await AsyncStorage.setItem('@planit/active-trip:v1', '{broken');
    expect(await getActiveTrip()).toBeNull();
  });

  it('필수 필드가 빠진 값이면 null로 복구한다', async () => {
    await AsyncStorage.setItem(
      '@planit/active-trip:v1',
      JSON.stringify({ tripId: 'trip-1' }),
    );
    expect(await getActiveTrip()).toBeNull();
  });

  it('clearActiveTrip 이후엔 조회되지 않는다', async () => {
    await setActiveTrip(sampleTrip());
    await clearActiveTrip();
    expect(await getActiveTrip()).toBeNull();
  });
});
