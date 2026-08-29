import { formatVisit, telHref } from './placeDetail.format';

describe('formatVisit', () => {
  it('일차·도착시각·체류시간을 한 줄로 만든다', () => {
    expect(formatVisit({ day: 2, startTime: '14:30', stayMinutes: 90 })).toBe(
      '2일차 · 14:30 도착 · 1시간 30분 머무름',
    );
  });

  it('1시간 미만이면 분만 쓴다', () => {
    expect(formatVisit({ day: 1, startTime: '09:00', stayMinutes: 45 })).toBe(
      '1일차 · 09:00 도착 · 45분 머무름',
    );
  });
});

describe('telHref', () => {
  it('실제 데이터에 있는 형태를 그대로 건다', () => {
    // 2026-08 실측값 그대로.
    expect(telHref('051-715-6884')).toBe('tel:051-715-6884');
    expect(telHref('1522-2295')).toBe('tel:1522-2295');
    expect(telHref('010-3880-4966')).toBe('tel:010-3880-4966');
  });

  it('번호가 여러 개면 첫 번호만 건다', () => {
    // 이어 붙인 채로 숫자만 남기면 '064-762-2190064-762-2191'이 되어 걸리지 않는다.
    expect(telHref('064-762-2190, 064-762-2191')).toBe('tel:064-762-2190');
    expect(telHref('02-123-4567 / 02-123-4568')).toBe('tel:02-123-4567');
  });

  it('안내문이 섞여 있어도 숫자만 남긴다', () => {
    expect(telHref('제주시청 064-728-2114')).toBe('tel:064-728-2114');
  });

  it('걸 수 있는 숫자가 없으면 undefined', () => {
    // 링크를 만들면 눌렀을 때 아무 일도 일어나지 않으므로 아예 안 건다.
    expect(telHref('문의 바랍니다')).toBeUndefined();
    expect(telHref('-')).toBeUndefined();
    expect(telHref('')).toBeUndefined();
  });
});
