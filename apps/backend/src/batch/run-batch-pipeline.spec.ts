import { chunk, todayInKst } from './run-batch-pipeline';

describe('chunk', () => {
  it('정확히 나눠떨어지면 균등하게 나눈다', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('나머지가 있으면 마지막 청크가 짧다', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('청크 크기보다 작으면 하나의 청크', () => {
    expect(chunk([1], 300)).toEqual([[1]]);
  });

  it('빈 입력은 빈 배열', () => {
    expect(chunk([], 300)).toEqual([]);
  });
});

describe('todayInKst', () => {
  it('UTC 기준으로는 전날이어도 KST 기준 날짜를 반환한다', () => {
    // 2026-08-26T15:30Z == 2026-08-27 00:30 KST
    expect(todayInKst(new Date('2026-08-26T15:30:00Z'))).toBe('20260827');
  });

  it('KST로 같은 날인 시각은 그대로 반환한다', () => {
    expect(todayInKst(new Date('2026-08-27T01:00:00Z'))).toBe('20260827');
  });
});
