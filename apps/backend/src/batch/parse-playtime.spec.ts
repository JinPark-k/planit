import { formatMinutes, parsePlaytime } from './parse-playtime';

/** 읽기 쉬우라고 'HH:MM'으로 비교한다. */
function open(raw: string): string | null {
  const parsed = parsePlaytime(raw);
  return parsed ? formatMinutes(parsed.openMinutes) : null;
}
function close(raw: string): string | null {
  const parsed = parsePlaytime(raw);
  return parsed?.closeMinutes !== undefined
    ? formatMinutes(parsed.closeMinutes)
    : null;
}

describe('parsePlaytime', () => {
  it('단순 구간을 읽는다', () => {
    expect(open('11:00~22:00')).toBe('11:00');
    expect(close('11:00~22:00')).toBe('22:00');
  });

  it('공백과 꼬리말이 붙어도 읽는다', () => {
    // 실측: 계룡軍문화축제
    expect(open('09:00 ~ 17:00 (프로그램별 상이)')).toBe('09:00');
    expect(close('09:00 ~ 17:00 (프로그램별 상이)')).toBe('17:00');
    // 실측: 고양행주한우 숯불구이축제
    expect(open('10:00~17:00(무료시식 및 즐길거리)')).toBe('10:00');
  });

  it('회차가 나뉘면 전체를 감싸는 구간으로 본다', () => {
    // 실측: 경복궁 별빛야행. 1부와 2부를 따로 다루지 않고 18:20~21:20으로 본다.
    const raw = '1부 - 18:20~20:10 / 2부 - 19:30~21:20';
    expect(open(raw)).toBe('18:20');
    expect(close(raw)).toBe('21:20');
  });

  it('야간 행사의 저녁 시각을 그대로 읽는다', () => {
    // 이게 이 파서를 만든 이유다. 축제가 앵커라 09:00에 배치되는데,
    // 야간 행사는 그때 열지 않는다.
    expect(open('18:00~23:00')).toBe('18:00');
  });

  it('구간이 아니라 시각 나열이어도 가장 이른 시각을 쓴다', () => {
    // 실측: 광안리 드론쇼. 계절별 공연 시각이라 구간이 아니다.
    const raw = '- 하절기(3월~9월) 20:00, 22:00- 동절기(10월~2월) 19:00, 21:00';
    expect(open(raw)).toBe('19:00');
    expect(close(raw)).toBe('22:00');
  });

  it('HTML 태그와 엔티티를 걷어낸다', () => {
    expect(open('10:00&nbsp;~&nbsp;18:00<br>(우천 시 취소)')).toBe('10:00');
  });

  it('시각이 없으면 null이다', () => {
    // 실측: 광주시 남한산성문화제. 모르는 것에 제약을 걸지 않는다.
    expect(parsePlaytime('변동')).toBeNull();
    expect(parsePlaytime('상시')).toBeNull();
    expect(parsePlaytime('')).toBeNull();
    expect(parsePlaytime(null)).toBeNull();
    expect(parsePlaytime(undefined)).toBeNull();
  });

  it('시각이 하나뿐이면 폐장은 비운다', () => {
    expect(open('19:00 시작')).toBe('19:00');
    expect(close('19:00 시작')).toBeNull();
  });

  it('같은 시각만 반복되면 폐장으로 치지 않는다', () => {
    expect(open('매일 20:00, 20:00')).toBe('20:00');
    expect(close('매일 20:00, 20:00')).toBeNull();
  });

  it('시각이 아닌 숫자에 속지 않는다', () => {
    // 날짜나 전화번호가 섞여 들어와도 HH:MM 형태만 잡는다.
    expect(parsePlaytime('2026.09.13 ~ 09.15')).toBeNull();
    expect(parsePlaytime('문의 063-324-2440')).toBeNull();
  });

  it('24:00 표기를 허용한다', () => {
    expect(close('18:00~24:00')).toBe('24:00');
  });
});

describe('formatMinutes', () => {
  it('자정 기준 분을 HH:MM으로 바꾼다', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(540)).toBe('09:00');
    expect(formatMinutes(1379)).toBe('22:59');
  });
});
