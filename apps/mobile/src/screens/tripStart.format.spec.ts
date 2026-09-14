import { ScheduleDay } from '../api/types';
import {
  buildMonthGrid,
  dayDateLabels,
  monthLabel,
  shiftMonth,
} from './tripStart.format';

describe('monthLabel', () => {
  it('연/월을 "2026년 3월" 형태로 만든다', () => {
    expect(monthLabel(2026, 3)).toBe('2026년 3월');
  });
});

describe('shiftMonth', () => {
  it('같은 해 안에서는 월만 옮긴다', () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
    expect(shiftMonth(2026, 6, -1)).toEqual({ year: 2026, month: 5 });
  });

  it('12월에서 다음달로 가면 다음 해 1월이 된다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('1월에서 이전달로 가면 전 해 12월이 된다', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('여러 달을 한 번에 옮겨도 연 경계를 맞게 넘는다', () => {
    expect(shiftMonth(2026, 3, -3)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 11, 3)).toEqual({ year: 2027, month: 2 });
  });
});

describe('buildMonthGrid', () => {
  const NO_PAST = '2020-01-01';
  const FAR_FUTURE = '2030-01-01';

  it('그 달 1일의 요일만큼 앞에 null을 채운다 (2026년 4월 1일은 수요일)', () => {
    const grid = buildMonthGrid(2026, 4, NO_PAST, FAR_FUTURE);
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toEqual({ dateKey: '2026-04-01', disabled: false });
  });

  it('일요일이 1일이면 앞에 blank가 없다 (2026년 3월 1일은 일요일)', () => {
    const grid = buildMonthGrid(2026, 3, NO_PAST, FAR_FUTURE);
    expect(grid[0]).toEqual({ dateKey: '2026-03-01', disabled: false });
  });

  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2026, 4, 30],
    [2028, 2, 29], // 윤년
  ])('%i년 %i월은 말일까지 %i개의 날짜 셀을 만든다', (year, month, expectedDays) => {
    const grid = buildMonthGrid(year, month, NO_PAST, FAR_FUTURE);
    const cells = grid.filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    expect(cells).toHaveLength(expectedDays);
    const last = cells[cells.length - 1];
    const expectedLastKey = `${year}-${String(month).padStart(2, '0')}-${String(expectedDays).padStart(2, '0')}`;
    expect(last.dateKey).toBe(expectedLastKey);
  });

  it('todayKey보다 이전 날짜는 disabled다', () => {
    const grid = buildMonthGrid(2026, 3, '2026-03-15', FAR_FUTURE);
    const cells = grid.filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    const march10 = cells.find(cell => cell.dateKey === '2026-03-10');
    const march15 = cells.find(cell => cell.dateKey === '2026-03-15');
    const march16 = cells.find(cell => cell.dateKey === '2026-03-16');
    expect(march10?.disabled).toBe(true);
    expect(march15?.disabled).toBe(false);
    expect(march16?.disabled).toBe(false);
  });

  it('maxKey보다 이후 날짜는 disabled다', () => {
    const grid = buildMonthGrid(2026, 3, NO_PAST, '2026-03-20');
    const cells = grid.filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    const march20 = cells.find(cell => cell.dateKey === '2026-03-20');
    const march21 = cells.find(cell => cell.dateKey === '2026-03-21');
    expect(march20?.disabled).toBe(false);
    expect(march21?.disabled).toBe(true);
  });
});

describe('dayDateLabels', () => {
  function place() {
    return {
      id: 'p',
      name: '장소',
      category: 'SIGHTSEEING' as const,
      tags: [],
      location: { lat: 0, lng: 0 },
    };
  }

  it('연속된 일차는 시작일로부터 순서대로 날짜를 매긴다', () => {
    const days: ScheduleDay[] = [
      { day: 1, items: [{ place: place(), startTime: '09:00', stayMinutes: 60 }] },
      { day: 2, items: [{ place: place(), startTime: '09:00', stayMinutes: 60 }] },
    ];
    expect(dayDateLabels(days, '2026-03-01')).toEqual([
      { day: 1, label: '3월 1일 (일)' },
      { day: 2, label: '3월 2일 (월)' },
    ]);
  });

  it('일차가 불연속이어도(day 필드 기준) 건너뛴 만큼 날짜가 밀리지 않는다', () => {
    // 2일차가 없고 바로 3일차 — 3일차는 인덱스(1)가 아니라 day값(3)으로
    // startDateKey + 2일이어야 한다.
    const days: ScheduleDay[] = [
      { day: 1, items: [{ place: place(), startTime: '09:00', stayMinutes: 60 }] },
      { day: 3, items: [{ place: place(), startTime: '09:00', stayMinutes: 60 }] },
    ];
    expect(dayDateLabels(days, '2026-03-01')).toEqual([
      { day: 1, label: '3월 1일 (일)' },
      { day: 3, label: '3월 3일 (화)' },
    ]);
  });
});
