import { summarizeDayCondition, toGrid } from './kma.client';

describe('toGrid', () => {
  it('서울시청(37.5665, 126.9780) -> nx=60, ny=127 (기상청 공식 예시값)', () => {
    expect(toGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
  });

  it('제주시청(33.4996, 126.5312) -> nx=53, ny=38', () => {
    expect(toGrid(33.4996, 126.5312)).toEqual({ nx: 53, ny: 38 });
  });

  it('부산시청(35.1796, 129.0756) -> nx=98, ny=76', () => {
    expect(toGrid(35.1796, 129.0756)).toEqual({ nx: 98, ny: 76 });
  });
});

function item(
  category: string,
  fcstValue: string,
  fcstDate = '20260901',
  fcstTime = '1200',
) {
  return { category, fcstDate, fcstTime, fcstValue };
}

describe('summarizeDayCondition', () => {
  it('PTY가 0이 아닌 시간대가 하나라도 있으면 RAIN', () => {
    const items = [
      item('PTY', '0', '20260901', '0900'),
      item('PTY', '1', '20260901', '1500'), // 비
      item('SKY', '1'),
    ];
    expect(summarizeDayCondition(items, '20260901')).toBe('RAIN');
  });

  it('POP 최대값이 60 이상이면 RAIN', () => {
    const items = [
      item('PTY', '0'),
      item('POP', '30', '20260901', '0900'),
      item('POP', '70', '20260901', '1500'),
      item('SKY', '1'),
    ];
    expect(summarizeDayCondition(items, '20260901')).toBe('RAIN');
  });

  it('POP이 60 미만이고 강수형태도 없이 SKY 최빈값이 1(맑음)이면 CLEAR', () => {
    const items = [
      item('PTY', '0', '20260901', '0900'),
      item('PTY', '0', '20260901', '1200'),
      item('POP', '20', '20260901', '0900'),
      item('SKY', '1', '20260901', '0900'),
      item('SKY', '1', '20260901', '1200'),
      item('SKY', '3', '20260901', '1500'),
    ];
    expect(summarizeDayCondition(items, '20260901')).toBe('CLEAR');
  });

  it('SKY 최빈값이 흐림/구름많음이면 UNKNOWN', () => {
    const items = [
      item('PTY', '0'),
      item('POP', '10'),
      item('SKY', '4', '20260901', '0900'),
      item('SKY', '4', '20260901', '1200'),
      item('SKY', '1', '20260901', '1500'),
    ];
    expect(summarizeDayCondition(items, '20260901')).toBe('UNKNOWN');
  });

  it('해당 날짜 데이터가 없으면(예보 범위 밖) UNKNOWN', () => {
    const items = [item('SKY', '1', '20260901')];
    expect(summarizeDayCondition(items, '20260910')).toBe('UNKNOWN');
  });

  it('빈 배열이면 UNKNOWN', () => {
    expect(summarizeDayCondition([], '20260901')).toBe('UNKNOWN');
  });
});
