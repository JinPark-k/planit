import { Place, ScheduleDay, ScheduleItem } from '../api/types';
import { buildTimeline } from './liveTimeline';

function place(id: string, name = `장소-${id}`): Place {
  return {
    id,
    name,
    category: 'SIGHTSEEING',
    tags: [],
    location: { lat: 33.5, lng: 126.5 },
  };
}

function item(id: string, startTime: string, stayMinutes: number, name?: string): ScheduleItem {
  return { place: place(id, name), startTime, stayMinutes };
}

describe('buildTimeline', () => {
  it('1일차는 시작일 그 날짜다', () => {
    const days: ScheduleDay[] = [{ day: 1, items: [item('a', '09:00', 60)] }];
    const [stop] = buildTimeline(days, '2026-03-02');
    expect(new Date(stop.startAt)).toEqual(new Date(2026, 2, 2, 9, 0));
  });

  it('2일차는 시작일 + 1일이다', () => {
    const days: ScheduleDay[] = [{ day: 2, items: [item('a', '09:00', 60)] }];
    const [stop] = buildTimeline(days, '2026-03-02');
    expect(new Date(stop.startAt)).toEqual(new Date(2026, 2, 3, 9, 0));
  });

  it('day 번호가 불연속이어도 day 필드 기준으로 날짜를 계산한다 ([1,3])', () => {
    const days: ScheduleDay[] = [
      { day: 1, items: [item('a', '09:00', 60)] },
      { day: 3, items: [item('b', '10:00', 60)] },
    ];
    const stops = buildTimeline(days, '2026-03-02');
    const stopB = stops.find(s => s.placeId === 'b')!;
    // 시작일 + 2일 = 2026-03-04
    expect(new Date(stopB.startAt)).toEqual(new Date(2026, 2, 4, 10, 0));
  });

  it('항목이 없는 일차는 결과에 아무것도 넣지 않는다', () => {
    const days: ScheduleDay[] = [
      { day: 1, items: [] },
      { day: 2, items: [item('a', '09:00', 60)] },
    ];
    const stops = buildTimeline(days, '2026-03-02');
    expect(stops).toHaveLength(1);
    expect(stops[0].day).toBe(2);
  });

  it('자정을 넘겨 체류가 끝나면 endAt이 다음 날짜로 넘어간다', () => {
    const days: ScheduleDay[] = [{ day: 1, items: [item('a', '23:30', 90)] }];
    const [stop] = buildTimeline(days, '2026-03-02');
    expect(new Date(stop.endAt)).toEqual(new Date(2026, 2, 3, 1, 0));
  });

  it('stayMinutes가 0이면 startAt과 endAt이 같다', () => {
    const days: ScheduleDay[] = [{ day: 1, items: [item('a', '09:00', 0)] }];
    const [stop] = buildTimeline(days, '2026-03-02');
    expect(stop.startAt).toBe(stop.endAt);
  });

  it('항목이 하나뿐이어도 정상 동작한다', () => {
    const days: ScheduleDay[] = [{ day: 1, items: [item('a', '09:00', 30)] }];
    expect(buildTimeline(days, '2026-03-02')).toHaveLength(1);
  });

  it('전체가 빈 경우 빈 배열을 반환한다', () => {
    expect(buildTimeline([], '2026-03-02')).toEqual([]);
    expect(buildTimeline([{ day: 1, items: [] }], '2026-03-02')).toEqual([]);
  });

  it('결과는 항상 startAt 오름차순이다', () => {
    const days: ScheduleDay[] = [
      { day: 2, items: [item('c', '09:00', 30)] },
      { day: 1, items: [item('a', '15:00', 30), item('b', '09:00', 30)] },
    ];
    const stops = buildTimeline(days, '2026-03-02');
    const ats = stops.map(s => s.startAt);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(stops.map(s => s.placeId)).toEqual(['b', 'a', 'c']);
  });
});
