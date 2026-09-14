import { addDays, atLocalTime, fromDateKey, parseHHMM, toDateKey } from './tripDate';

describe('parseHHMM', () => {
  it("'09:30'을 시/분으로 나눈다", () => {
    expect(parseHHMM('09:30')).toEqual({ hours: 9, minutes: 30 });
  });

  it("앞자리 0이 없어도 된다 ('9:3')", () => {
    expect(parseHHMM('9:3')).toEqual({ hours: 9, minutes: 3 });
  });

  it.each(['', '9', '09:', ':30', '9-30', '24:00', '9:60', 'ab:cd'])(
    '잘못된 형식 "%s"이면 예외를 던진다',
    value => {
      expect(() => parseHHMM(value)).toThrow();
    },
  );
});

describe('toDateKey / fromDateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 만든다', () => {
    expect(toDateKey(new Date(2026, 2, 9, 23, 59))).toBe('2026-03-09');
  });

  it('한 자리 월/일도 0을 채운다', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fromDateKey는 그 날짜의 로컬 00:00을 준다', () => {
    const date = fromDateKey('2026-03-09');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });

  it('toDateKey(fromDateKey(key)) 왕복이 원래 키로 돌아온다', () => {
    const key = '2026-12-31';
    expect(toDateKey(fromDateKey(key))).toBe(key);
  });
});

describe('addDays', () => {
  it('일반적인 날짜에 며칠을 더한다', () => {
    const result = addDays(new Date(2026, 2, 1), 3);
    expect(toDateKey(result)).toBe('2026-03-04');
  });

  it('연말 경계를 넘는다 (2026-12-31 + 1일 -> 2027-01-01)', () => {
    const result = addDays(new Date(2026, 11, 31), 1);
    expect(toDateKey(result)).toBe('2027-01-01');
  });

  it('윤년 2월 29일을 넘는다 (2028-02-28 + 1일 -> 2028-02-29)', () => {
    const result = addDays(new Date(2028, 1, 28), 1);
    expect(toDateKey(result)).toBe('2028-02-29');
  });

  it('윤년 다음날도 월 경계를 넘는다 (2028-02-29 + 1일 -> 2028-03-01)', () => {
    const result = addDays(new Date(2028, 1, 29), 1);
    expect(toDateKey(result)).toBe('2028-03-01');
  });

  it('음수를 더하면 과거로 간다', () => {
    const result = addDays(new Date(2026, 2, 1), -1);
    expect(toDateKey(result)).toBe('2026-02-28');
  });

  it('시/분은 그대로 보존한다', () => {
    const result = addDays(new Date(2026, 2, 1, 9, 30), 1);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('atLocalTime', () => {
  it('그 날짜의 해당 시각을 만든다', () => {
    const result = atLocalTime(new Date(2026, 2, 9), '14:05');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(9);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(5);
  });

  it('date의 시/분은 무시하고 hhmm으로 덮어쓴다', () => {
    const result = atLocalTime(new Date(2026, 2, 9, 23, 59), '00:00');
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});
