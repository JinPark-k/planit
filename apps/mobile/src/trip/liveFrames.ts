import { LiveTripStop } from './liveTimeline';
import { leadInCopy, nightCopy, stayCopy, travelCopy } from './liveTrip.copy';

/**
 * 잠금화면(Android Live Updates / iOS Live Activities)에 표시할 내용을 미리 계산해
 * "이 시각부터는 이렇게 보여줘"라는 절대시각 이벤트 목록으로 펼쳐 둔 것.
 *
 * 왜 미리 펼쳐 두는가: 네이티브 쪽(Kotlin/Swift)에는 여행 도메인 지식(체류/이동
 * 판단, 일차 경계, 리드인, 진행률 계산)을 하나도 두고 싶지 않다. 네이티브는 그냥
 * `frames.last { it.at <= now }`로 지금 보여줄 프레임을 고르고,
 * `frames.first { it.at > now }`의 at으로 다음 알람/타이머 하나만 걸면 된다.
 * 로직 변경(카피 톤, 진행률 계산식 등)이 전부 이 TS 모듈 안에서 끝나고, 네이티브
 * 코드는 다시 빌드/배포할 필요가 없어야 한다는 게 이 파일의 존재 이유다.
 */
export interface LiveTripFrame {
  /** 이 프레임이 유효해지는 절대 시각(epoch ms). */
  at: number;
  kind: 'SHOW' | 'HIDE' | 'END';
  title?: string;
  body?: string;
  /** 상태바 칩처럼 자리가 좁은 곳에 쓰는 짧은 문구. */
  shortText?: string;
  /** 그 프레임이 속한 일차 전체의 진행 막대 세그먼트(체류/이동 구간 하나씩). */
  segments?: { minutes: number; filled: boolean }[];
  /** 그 일차 전체 길이(분) — progressAt의 최댓값. */
  progressMax?: number;
  /** 이 프레임 시각 기준, 그 일차 시작부터 지난 시간(분). 리드인 프레임은 음수일 수 있다. */
  progressAt?: number;
  /** 시간이 흐르는 동안 progressAt이 분당 얼마나 증가하는지. 항상 1(분당 1분). */
  progressPerMinute?: number;
}

export interface BuildFramesOptions {
  /** 다음 일차 리드인을 몇 분 전에 띄울지. 기본 60분. */
  leadInMinutes?: number;
}

const DEFAULT_LEAD_IN_MINUTES = 60;

interface DaySegment {
  kind: 'stay' | 'travel';
  minutes: number;
}

interface DayInfo {
  stops: LiveTripStop[];
  dayStart: number;
  dayEnd: number;
  totalMinutes: number;
  segments: DaySegment[];
}

function groupStopsByDay(stops: LiveTripStop[]): LiveTripStop[][] {
  const byDay = new Map<number, LiveTripStop[]>();
  for (const stop of stops) {
    const list = byDay.get(stop.day) ?? [];
    list.push(stop);
    byDay.set(stop.day, list);
  }

  return [...byDay.values()]
    .map(list => [...list].sort((a, b) => a.startAt - b.startAt))
    .sort((a, b) => a[0].startAt - b[0].startAt);
}

function buildDaySegments(stops: LiveTripStop[]): DaySegment[] {
  const segments: DaySegment[] = [];
  stops.forEach((stop, index) => {
    segments.push({ kind: 'stay', minutes: (stop.endAt - stop.startAt) / 60000 });

    const next = stops[index + 1];
    if (next && next.startAt > stop.endAt) {
      segments.push({ kind: 'travel', minutes: (next.startAt - stop.endAt) / 60000 });
    }
  });
  return segments;
}

function toDayInfo(stops: LiveTripStop[]): DayInfo {
  const dayStart = stops[0].startAt;
  const dayEnd = stops[stops.length - 1].endAt;
  return {
    stops,
    dayStart,
    dayEnd,
    totalMinutes: (dayEnd - dayStart) / 60000,
    segments: buildDaySegments(stops),
  };
}

/**
 * SHOW 프레임 하나를 만든다. currentSegmentIndex보다 앞선 세그먼트만 filled: true —
 * "이미 완전히 지난 구간"만 채워진 것으로 본다. 현재/이후 구간은 progressAt으로
 * 연속적으로 채워지는 몫이라 여기서는 filled: false로 둔다.
 */
function makeShowFrame(params: {
  at: number;
  copy: { title: string; body: string; shortText: string };
  day: DayInfo;
  currentSegmentIndex: number;
}): LiveTripFrame {
  const { at, copy, day, currentSegmentIndex } = params;
  return {
    at,
    kind: 'SHOW',
    title: copy.title,
    body: copy.body,
    shortText: copy.shortText,
    segments: day.segments.map((segment, index) => ({
      minutes: segment.minutes,
      filled: index < currentSegmentIndex,
    })),
    progressMax: day.totalMinutes,
    progressAt: (at - day.dayStart) / 60000,
    progressPerMinute: 1,
  };
}

export function buildFrames(
  stops: LiveTripStop[],
  options?: BuildFramesOptions,
): LiveTripFrame[] {
  if (stops.length === 0) {
    return [];
  }

  const leadInMinutes = options?.leadInMinutes ?? DEFAULT_LEAD_IN_MINUTES;
  const days = groupStopsByDay(stops).map(toDayInfo);
  const frames: LiveTripFrame[] = [];

  days.forEach((day, dayIndex) => {
    day.stops.forEach((stop, stopIndex) => {
      // 체류/이동 세그먼트가 번갈아 들어가되 이동은 간격이 있을 때만 끼어들어서,
      // "몇 번째 체류인가"만으로는 세그먼트 인덱스를 알 수 없다 — 그 앞까지 실제로
      // 몇 개의 세그먼트가 만들어졌는지 앞에서부터 세어야 한다.
      const staySegmentIndex = segmentIndexOfStay(day, stopIndex);
      const next = day.stops[stopIndex + 1];

      frames.push(
        makeShowFrame({
          at: stop.startAt,
          copy: stayCopy({
            placeName: stop.placeName,
            endAt: stop.endAt,
            next: next ? { placeName: next.placeName, startAt: next.startAt } : undefined,
          }),
          day,
          currentSegmentIndex: staySegmentIndex,
        }),
      );

      if (next && next.startAt > stop.endAt) {
        const travelSegmentIndex = staySegmentIndex + 1;
        frames.push(
          makeShowFrame({
            at: stop.endAt,
            copy: travelCopy({ nextPlaceName: next.placeName, nextStartAt: next.startAt }),
            day,
            currentSegmentIndex: travelSegmentIndex,
          }),
        );
      }
    });

    const isLastDay = dayIndex === days.length - 1;
    if (isLastDay) {
      frames.push({ at: day.dayEnd, kind: 'END' });
      return;
    }

    const nextDay = days[dayIndex + 1];
    // 리드인이 이 일차가 끝나기 전으로 거슬러 올라가지 못하게 막는다. 이 clamp가
    // 없으면 leadInMinutes가 밤 길이보다 크거나(짧은 밤 + 넉넉한 리드인) 일차
    // 간격이 좁을 때 리드인 프레임이 이 일차의 마지막 SHOW보다 앞서 꽂혀,
    // frames[].at이 순증가한다는 불변식이 깨진다. 네이티브는 그 불변식에 기대
    // "at <= now인 마지막 프레임"으로 렌더하므로 깨지면 엉뚱한 장소가 표시된다.
    const leadInAt = Math.max(nextDay.dayStart - leadInMinutes * 60000, day.dayEnd);

    // 짧은 밤: 리드인 시각이 이 일차의 HIDE 시각보다 앞서거나 같으면 HIDE를 생략한다.
    // 그렇지 않으면 화면이 잠깐 꺼졌다가 곧바로 다시 켜지는 깜빡임이 생긴다.
    if (leadInAt > day.dayEnd) {
      frames.push({
        at: day.dayEnd,
        kind: 'HIDE',
        // HIDE에도 문구를 싣는다 — Android는 알림을 내리지만 앱 안 배너와 iOS는
        // 이 구간에도 표시를 유지한다(liveTrip.copy.ts의 nightCopy 주석 참고).
        ...nightCopy({
          nextFirstPlaceName: nextDay.stops[0].placeName,
          nextFirstStartAt: nextDay.dayStart,
        }),
      });
    }

    frames.push(
      makeShowFrame({
        at: leadInAt,
        copy: leadInCopy({
          firstPlaceName: nextDay.stops[0].placeName,
          firstStartAt: nextDay.dayStart,
        }),
        day: nextDay,
        // 다음 일차는 아직 시작 전이라 지난 세그먼트가 없다.
        currentSegmentIndex: -1,
      }),
    );
  });

  return frames;
}

/** day.segments 안에서 stopIndex번째 체류가 위치한 인덱스. 이동 세그먼트는 간격이 있을 때만 끼어든다. */
function segmentIndexOfStay(day: DayInfo, stopIndex: number): number {
  let index = 0;
  for (let i = 0; i < stopIndex; i++) {
    index += 1; // 그 앞 체류
    const stop = day.stops[i];
    const next = day.stops[i + 1];
    if (next && next.startAt > stop.endAt) {
      index += 1; // 그 앞 이동
    }
  }
  return index;
}

/** now 시각에 유효한 프레임. now보다 at이 작거나 같은 프레임 중 가장 마지막 것. */
export function frameAt(frames: LiveTripFrame[], now: number): LiveTripFrame | undefined {
  let result: LiveTripFrame | undefined;
  for (const frame of frames) {
    if (frame.at > now) {
      break;
    }
    result = frame;
  }
  return result;
}

/** now 이후 가장 가까운 프레임의 시각. 없으면(마지막 프레임 이후) undefined. */
export function nextFrameAt(frames: LiveTripFrame[], now: number): number | undefined {
  return frames.find(frame => frame.at > now)?.at;
}

/** 프레임의 기준값에서 now까지 시간을 선형 보간하고 [0, progressMax]로 clamp한다. */
export function interpolateProgress(frame: LiveTripFrame, now: number): number {
  const { progressAt, progressPerMinute, progressMax } = frame;
  if (progressAt === undefined || progressPerMinute === undefined || progressMax === undefined) {
    return 0;
  }

  const minutesElapsed = (now - frame.at) / 60000;
  const value = progressAt + minutesElapsed * progressPerMinute;
  return Math.min(progressMax, Math.max(0, value));
}
