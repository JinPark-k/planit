import { Place, ScheduleDay, ScheduleItem } from '../api/types';
import {
  filterByTab,
  formatMinutes,
  scheduleTitle,
  toScheduleRows,
  totalMinutes,
} from './schedule.format';

function place(id: string): Place {
  return {
    id,
    name: `장소-${id}`,
    category: 'SIGHTSEEING',
    tags: ['자연'],
    location: { lat: 33.5, lng: 126.5 },
  };
}

function item(
  id: string,
  startTime: string,
  stayMinutes: number,
  travelFromPreviousMinutes?: number,
): ScheduleItem {
  return { place: place(id), startTime, stayMinutes, travelFromPreviousMinutes };
}

function days(): ScheduleDay[] {
  return [
    {
      day: 1,
      items: [item('a', '09:00', 90), item('b', '10:39', 60, 9)],
    },
    {
      day: 2,
      items: [item('c', '09:00', 120)],
    },
  ];
}

describe('formatMinutes', () => {
  it.each([
    [0, '0분'],
    [45, '45분'],
    [60, '1시간'],
    [90, '1시간 30분'],
    [450, '7시간 30분'],
  ])('%i분 -> %s', (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });

  it('음수는 0분으로 취급한다', () => {
    expect(formatMinutes(-10)).toBe('0분');
  });
});

describe('totalMinutes', () => {
  it('체류시간과 이동시간을 모두 더한다', () => {
    // 1일차 90 + 60 + 이동 9 = 159, 2일차 120 -> 279
    expect(totalMinutes(days())).toBe(279);
  });

  it('첫 장소의 이동시간(undefined)을 0으로 다룬다', () => {
    expect(totalMinutes([{ day: 1, items: [item('a', '09:00', 90)] }])).toBe(90);
  });

  it('빈 일정은 0이다', () => {
    expect(totalMinutes([{ day: 1, items: [] }])).toBe(0);
  });
});

describe('filterByTab', () => {
  it("'ALL'이면 전부 반환한다", () => {
    expect(filterByTab(days(), 'ALL')).toHaveLength(2);
  });

  it('일차 번호를 주면 그 일차만 반환한다', () => {
    const result = filterByTab(days(), 2);
    expect(result.map(d => d.day)).toEqual([2]);
  });
});

describe('toScheduleRows', () => {
  it('여러 일차를 보여줄 땐 일차 헤더를 끼운다', () => {
    const rows = toScheduleRows(days());
    expect(rows.map(r => r.kind)).toEqual([
      'dayHeader',
      'item',
      'item',
      'dayHeader',
      'item',
    ]);
  });

  it('일차가 하나면 헤더를 넣지 않는다 (탭에 이미 쓰여 있다)', () => {
    const rows = toScheduleRows(filterByTab(days(), 1));
    expect(rows.every(r => r.kind === 'item')).toBe(true);
  });

  it('일차의 마지막 아이템만 isLastOfDay가 true다', () => {
    const rows = toScheduleRows(days()).filter(r => r.kind === 'item');
    expect(rows.map(r => r.kind === 'item' && r.isLastOfDay)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('같은 장소가 다른 일차에 나와도 key가 겹치지 않는다', () => {
    const repeated: ScheduleDay[] = [
      { day: 1, items: [item('a', '09:00', 90)] },
      { day: 2, items: [item('a', '09:00', 90)] },
    ];
    const keys = toScheduleRows(repeated).map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('scheduleTitle', () => {
  it('지역 표시명과 일수를 조합한다', () => {
    expect(scheduleTitle('제주', 3)).toBe('제주 3일 일정');
  });
});
