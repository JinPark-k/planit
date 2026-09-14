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
 * 다음 일차 시작을 앞두고 미리 띄우는 리드인 카피.
 *
 * "내일"이라고 고정한 것은 연속된 일차(N일차 다음 N+1일차) 전환을 가정한 것이다.
 * 스케줄표에 일차가 건너뛰는 경우(예: 1일차 다음 3일차)는 실제로는 잘 없지만,
 * 생기더라도 "내일"이 문맥상 크게 어색하지 않아 지금은 분기를 두지 않는다.
 */
export function leadInCopy(params: { firstPlaceName: string; firstStartAt: number }): FrameCopy {
  const { firstPlaceName, firstStartAt } = params;
  return {
    title: '내일 여행 시작',
    body: `${formatHHMM(firstStartAt)} ${firstPlaceName}부터`,
    shortText: '내일 여행',
  };
}
