import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScheduleDay } from '../api/types';
import { listSavedTrips, saveTrip } from './savedTrips';

const sampleDays: ScheduleDay[] = [
  {
    day: 1,
    items: [
      {
        place: {
          id: 'festival-1',
          name: '한강 축제',
          category: 'SIGHTSEEING',
          tags: ['축제'],
          location: { lat: 37.5, lng: 127 },
        },
        startTime: '10:00',
        stayMinutes: 90,
      },
    ],
  },
];

describe('savedTrips', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('일정의 모든 장소 정보를 기기에 저장하고 다시 불러온다', async () => {
    const saved = await saveTrip({ regionLabel: '서울', days: sampleDays });

    const trips = await listSavedTrips();

    expect(trips).toHaveLength(1);
    expect(trips[0]).toEqual(saved);
    expect(trips[0].days[0].items[0].place.name).toBe('한강 축제');
  });

  it('깨진 저장 데이터가 있어도 빈 목록으로 복구한다', async () => {
    await AsyncStorage.setItem('@planit/saved-trips:v1', '{broken');

    await expect(listSavedTrips()).resolves.toEqual([]);
  });
});
