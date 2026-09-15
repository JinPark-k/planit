/**
 * 잠금화면 프레임(liveFrames.ts)에 들어갈 한국어 문구를 만드는 순수 함수 모음.
 *
 * 프레임 조립(시간 계산, 세그먼트/진행률)과 문구를 분리해 둔 이유는 문구만 따로
 * 다듬을 수 있게 하기 위해서다 — 카피 톤을 바꾸는 데 시간 계산 로직을 다시 읽을
 * 필요가 없어야 한다.
 */

const CHIP_MAX_LENGTH = 8;

/** 상태바 칩은 자리가 좁아서 8자를 넘는 장소명은 말줄임한다. */
export function truncateForChip(name: string, maxLength: number = CHIP_MAX_LENGTH): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, maxLength)}…`;
}

function formatHHMM(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 받침 유무로 '로'/'으로' 조사를 고른다.
 *
 * 종성이 없거나(받침 없음) 종성이 'ㄹ'이면 '로', 그 외 받침이 있으면 '으로'.
 * 한글 완성형 코드포인트는 (코드 - 0xAC00)를 28로 나눈 나머지가 종성 인덱스이고,
 * 0은 받침 없음, 8은 'ㄹ'이다. 장소명이 한글이 아니면(영문/숫자 등) 그냥 '로'를 쓴다.
 */
function withDirectionParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangulSyllable) {
    return `${name}로`;
  }
  const jongseongIndex = (last - 0xac00) % 28;
  const hasNoBatchimOrRieul = jongseongIndex === 0 || jongseongIndex === 8;
  return hasNoBatchimOrRieul ? `${name}로` : `${name}으로`;
}

export interface FrameCopy {
  title: string;
  body: string;
  shortText: string;
}

/** 어느 장소에 체류 중일 때. next가 없으면 그 일차의 마지막 장소라는 뜻이다. */
export function stayCopy(params: {
  placeName: string;
  endAt: number;
  next?: { placeName: string; startAt: number };
}): FrameCopy {
  const { placeName, endAt, next } = params;
  const body = next
    ? `${formatHHMM(endAt)}까지 · 다음 ${formatHHMM(next.startAt)} ${next.placeName}`
    : '오늘 일정 마지막';

  return {
    title: placeName,
    body,
    shortText: truncateForChip(placeName),
  };
}

/** 장소 사이를 이동 중일 때. */
export function travelCopy(params: { nextPlaceName: string; nextStartAt: number }): FrameCopy {
  const { nextPlaceName, nextStartAt } = params;
  return {
    title: `${withDirectionParticle(nextPlaceName)} 이동 중`,
    body: `${formatHHMM(nextStartAt)} 도착 예정`,
    shortText: `${truncateForChip(nextPlaceName)} 이동`,
  };
}

/**
 * 일차가 끝나고 다음 일차 리드인까지의 야간 구간 문구.
 *
 * HIDE 프레임에도 문구가 필요한 이유는 플랫폼마다 HIDE의 해석이 다르기 때문이다.
 * Android는 이 구간에 알림을 실제로 내리므로 이 문구를 쓰지 않지만, 앱 안 배너와
 * iOS Live Activity는 표시를 유지한다(iOS는 Activity.request가 포그라운드에서만
 * 성공해서, 한 번 내리면 다음 날 아침에 다시 띄울 방법이 없다).
 *
 * 실제로 밤 구간을 띄워 보니 "여행이 진행 중이에요" 같은 문구는 아무 정보가 없었다.
 * 지금 알아야 할 건 "오늘은 끝났고 내일 몇 시에 어디부터인지"다.
 */
export function nightCopy(params: {
  nextFirstPlaceName: string;
  nextFirstStartAt: number;
}): FrameCopy {
  const { nextFirstPlaceName, nextFirstStartAt } = params;
  return {
    title: '오늘 일정이 끝났어요',
    body: `내일 ${formatHHMM(nextFirstStartAt)} ${nextFirstPlaceName}부터`,
    shortText: '오늘 일정 끝',
  };
}

/**
 * 다음 일차 시작을 앞두고 미리 띄우는 리드인 카피.
 *
 * "내일"이라고 쓰지 않는다. 리드인은 그 일차 첫 일정의 한 시간 전에 뜨므로
 * 화면에 보이는 시점은 **언제나 그 일정과 같은 날 아침**이다. 시뮬레이터로
 * 07:33에 띄워 보니 "내일 여행 시작 / 09:00 추자도부터"가 나왔는데, 그 09:00은
 * 오늘이다. 밤 사이 문구(nightCopy)의 "내일"은 전날 저녁에 보이므로 맞지만
 * 여기는 아니다. 날짜를 말하지 않으면 두 경우 모두 옳다.
 */
export function leadInCopy(params: { firstPlaceName: string; firstStartAt: number }): FrameCopy {
  const { firstPlaceName, firstStartAt } = params;
  return {
    title: '곧 여행 시작',
    body: `${formatHHMM(firstStartAt)} ${firstPlaceName}부터`,
    shortText: '곧 시작',
  };
}
