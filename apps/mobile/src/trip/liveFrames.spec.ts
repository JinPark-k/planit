import { buildFrames, frameAt, interpolateProgress, LiveTripFrame, nextFrameAt } from './liveFrames';
import { LiveTripStop } from './liveTimeline';

function stop(
  day: number,
  placeId: string,
  placeName: string,
  date: [number, number, number],
  start: [number, number],
  stayMinutes: number,
): LiveTripStop {
  const [year, month, dayOfMonth] = date;
  const [hours, minutes] = start;
  const startAt = new Date(year, month, dayOfMonth, hours, minutes).getTime();
  return { placeId, placeName, day, startAt, endAt: startAt + stayMinutes * 60000 };
}

describe('buildFrames - 체류/이동 SHOW', () => {
  it('장소마다 체류 SHOW를 만든다', () => {
    const stops = [
      stop(1, 'a', '성산일출봉', [2026, 2, 2], [9, 0], 60),
      stop(1, 'b', '우도', [2026, 2, 2], [10, 30], 60),
    ];
    const frames = buildFrames(stops);
    const titles = frames.filter(f => f.kind === 'SHOW').map(f => f.title);
    expect(titles).toContain('성산일출봉');
    expect(titles).toContain('우도');
    expect(titles).toContain('우도로 이동 중');
  });

  it('간격이 있으면 이동 SHOW를 끼워 넣는다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60), // 09:00-10:00
      stop(1, 'b', 'B', [2026, 2, 2], [10, 30], 60), // 10:30 시작 -> 간격 30분
    ];
    const frames = buildFrames(stops);
    const travel = frames.find(f => f.at === stops[0].endAt);
    expect(travel?.kind).toBe('SHOW');
    expect(travel?.title).toContain('이동 중');
  });

  it('간격이 0이면 이동 프레임을 만들지 않는다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60), // 10:00에 끝남
      stop(1, 'b', 'B', [2026, 2, 2], [10, 0], 60), // 바로 10:00에 시작
    ];
    const frames = buildFrames(stops);
    expect(frames.filter(f => f.kind === 'SHOW')).toHaveLength(2);
  });
});

describe('buildFrames - segments/progress', () => {
  it('세그먼트는 그 프레임이 속한 일차 전체 기준이고, 이미 지난 구간은 filled: true다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60), // 09:00-10:00
      stop(1, 'b', 'B', [2026, 2, 2], [10, 30], 60), // 10:30-11:30 (간격 30분)
    ];
    const frames = buildFrames(stops);
    const shows = frames.filter(f => f.kind === 'SHOW');

    expect(shows[0].segments?.map(s => s.filled)).toEqual([false, false, false]);
    expect(shows[1].segments?.map(s => s.filled)).toEqual([true, false, false]);
    expect(shows[2].segments?.map(s => s.filled)).toEqual([true, true, false]);
    // 체류 60 + 이동 30 + 체류 60 = 150분
    expect(shows[0].progressMax).toBe(150);
    expect(shows[0].segments?.map(s => s.minutes)).toEqual([60, 30, 60]);
  });
});

describe('buildFrames - 일차 경계', () => {
  it('일차 마지막에 HIDE, 다음 일차 시작 전에 리드인 SHOW를 만든다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60), // day1 10:00에 끝남
      stop(2, 'b', 'B', [2026, 2, 3], [9, 0], 60), // day2 09:00 시작
    ];
    const frames = buildFrames(stops, { leadInMinutes: 60 });

    const hide = frames.find(f => f.kind === 'HIDE');
    expect(hide?.at).toBe(stops[0].endAt);

    const leadIn = frames.find(f => f.title === '내일 여행 시작');
    expect(leadIn?.at).toBe(stops[1].startAt - 60 * 60000);
  });

  it('짧은 밤(리드인 시각이 HIDE 시각과 같음)이면 HIDE를 생략한다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [22, 30], 60), // day1 23:30에 끝남
      stop(2, 'b', 'B', [2026, 2, 3], [0, 30], 60), // day2 00:30 시작, 리드인(60분 전)=23:30=dayEnd
    ];
    const frames = buildFrames(stops, { leadInMinutes: 60 });
    expect(frames.some(f => f.kind === 'HIDE')).toBe(false);
  });

  it.each<[string, [number, number], [number, number]]>([
    ['보통 야간 간격', [22, 0], [9, 0]],
    ['짧은 밤(리드인=HIDE)', [22, 30], [0, 30]],
    ['아주 짧은 밤', [23, 0], [0, 20]],
  ])('%s 케이스에서도 프레임 시각이 항상 순증가한다', (_label, endStart, nextStart) => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], endStart, 30),
      stop(2, 'b', 'B', [2026, 2, 3], nextStart, 30),
    ];
    const frames = buildFrames(stops, { leadInMinutes: 60 });
    const ats = frames.map(f => f.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
  });

  it('리드인이 밤 길이보다 길어도 이 일차가 끝나기 전으로 거슬러 가지 않는다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [22, 0], 30), // day1 22:30에 끝남
      stop(2, 'b', 'B', [2026, 2, 3], [9, 0], 60), // day2 09:00 시작
    ];
    // 리드인 24시간 = 전날 09:00 → clamp가 없으면 day1의 22:00 SHOW보다 앞서 꽂힌다.
    const frames = buildFrames(stops, { leadInMinutes: 24 * 60 });

    const ats = frames.map(f => f.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));

    const leadIn = frames.find(f => f.title === '내일 여행 시작');
    expect(leadIn?.at).toBe(stops[0].endAt);
    expect(frames.some(f => f.kind === 'HIDE')).toBe(false);
  });
});

describe('buildFrames - 하루 일정', () => {
  it('HIDE 없이 SHOW들 뒤에 END만 있다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60),
      stop(1, 'b', 'B', [2026, 2, 2], [11, 0], 60),
    ];
    const frames = buildFrames(stops);
    expect(frames.some(f => f.kind === 'HIDE')).toBe(false);
    expect(frames.filter(f => f.kind === 'END')).toHaveLength(1);
    expect(frames[frames.length - 1].kind).toBe('END');
  });
});

describe('buildFrames - END', () => {
  it('END는 마지막 일차 마지막 endAt에 정확히 하나만 있고 그 뒤엔 아무 프레임도 없다', () => {
    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60),
      stop(2, 'b', 'B', [2026, 2, 3], [9, 0], 60),
    ];
    const frames = buildFrames(stops);
    const ends = frames.filter(f => f.kind === 'END');
    expect(ends).toHaveLength(1);
    expect(ends[0].at).toBe(stops[1].endAt);
    expect(frames[frames.length - 1]).toBe(ends[0]);
  });

  it('빈 stops 목록이면 프레임 없이 빈 배열이다', () => {
    expect(buildFrames([])).toEqual([]);
  });
});

describe('frameAt', () => {
  const stops = [
    stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60),
    stop(2, 'b', 'B', [2026, 2, 3], [9, 0], 60),
  ];
  const frames = buildFrames(stops);

  it('첫 프레임보다 이전 시각이면 undefined다', () => {
    expect(frameAt(frames, frames[0].at - 1)).toBeUndefined();
  });

  it('at과 정확히 일치하면 그 프레임을 반환한다', () => {
    expect(frameAt(frames, frames[2].at)).toBe(frames[2]);
  });

  it('END 이후 시각이면 END 프레임을 반환한다', () => {
    const end = frames[frames.length - 1];
    expect(frameAt(frames, end.at + 100000)).toBe(end);
  });
});

describe('nextFrameAt', () => {
  const stops = [stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 60)];
  const frames = buildFrames(stops);

  it('마지막 프레임 시각 이후엔 undefined다', () => {
    const last = frames[frames.length - 1];
    expect(nextFrameAt(frames, last.at)).toBeUndefined();
  });

  it('중간 시각이면 다음 프레임의 at을 반환한다', () => {
    expect(nextFrameAt(frames, frames[0].at)).toBe(frames[1].at);
  });
});

describe('buildFrames - 과거 시작일', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('어제 시작한 2일 일정에서 오늘 시각에 맞는 중간 프레임을 찾는다', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 3, 10, 0));

    const stops = [
      stop(1, 'a', 'A', [2026, 2, 2], [9, 0], 120), // 어제 09:00-11:00
      stop(2, 'b', 'B', [2026, 2, 3], [9, 0], 120), // 오늘 09:00-11:00
    ];
    const frames = buildFrames(stops);

    const current = frameAt(frames, Date.now());
    expect(current?.title).toBe('B');
  });
});

describe('interpolateProgress', () => {
  it('progressAt에서 시간에 비례해 증가한다', () => {
    const frame: LiveTripFrame = {
      at: 0,
      kind: 'SHOW',
      progressAt: 10,
      progressMax: 100,
      progressPerMinute: 1,
    };
    expect(interpolateProgress(frame, 5 * 60000)).toBe(15);
  });

  it('progressMax를 넘지 않도록 clamp한다', () => {
    const frame: LiveTripFrame = {
      at: 0,
      kind: 'SHOW',
      progressAt: 90,
      progressMax: 100,
      progressPerMinute: 1,
    };
    expect(interpolateProgress(frame, 60 * 60000)).toBe(100);
  });

  it('0 밑으로 내려가지 않도록 clamp한다', () => {
    const frame: LiveTripFrame = {
      at: 100 * 60000,
      kind: 'SHOW',
      progressAt: -60,
      progressMax: 100,
      progressPerMinute: 1,
    };
    expect(interpolateProgress(frame, 0)).toBe(0);
  });

  it('progress 관련 필드가 없는 프레임(HIDE/END)은 0을 반환한다', () => {
    const frame: LiveTripFrame = { at: 0, kind: 'HIDE' };
    expect(interpolateProgress(frame, 1000)).toBe(0);
  });
});
