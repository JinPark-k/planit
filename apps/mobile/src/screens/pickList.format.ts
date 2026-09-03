/**
 * 하루에 담기를 권하는 장소 수.
 *
 * 배포된 API에 실제로 담아 보며 잰 값이다(1일, travelMode=CAR):
 *   서울 5곳까지 안전 / 6곳부터 제외 발생
 *   부산 5곳까지 안전 / 6곳부터
 *   제주 4곳까지 안전 / 5곳부터 (이동시간이 길어 하나 적다)
 * 세 지역 모두에서 안전한 값이 4다.
 *
 * 끼니는 서버가 자동으로 채우므로(POST /schedule/from-places) 이 4곳은
 * 관광지 기준이고, 실제 일정에는 7~8개가 들어간다.
 */
export const PICKS_PER_DAY = 4;

export function recommendedPickCount(dayCount: number): number {
  return Math.max(1, dayCount) * PICKS_PER_DAY;
}

export interface PickGuide {
  /** 상단 안내 문구. */
  message: string;
  /** 담은 개수가 권장치를 넘었는지. 화면이 색을 바꾸는 데 쓴다. */
  overRecommended: boolean;
}

/**
 * 담기 개수 안내.
 *
 * 권장치를 넘으면 어조를 바꾼다. 서버가 하루 마감을 넘는 장소를 빼는데
 * (excludedPlaces) 그걸 모르고 잔뜩 담는 걸 미리 막는 것이 이 문구의 목적이다.
 */
export function pickGuide(dayCount: number, pickedCount: number): PickGuide {
  const recommended = recommendedPickCount(dayCount);

  if (pickedCount > recommended) {
    return {
      overRecommended: true,
      message: `${recommended}곳을 넘었어요. 일부는 일정에 들어가지 못할 수 있어요.`,
    };
  }

  return {
    overRecommended: false,
    message:
      `${dayCount}일 일정에는 ${recommended}곳 정도가 알맞아요. ` +
      '더 담으면 하루에 다 들르지 못해 일부가 일정에서 빠질 수 있어요.',
  };
}

/** "8곳 담음 · 12곳 추천" */
export function pickCountLabel(dayCount: number, pickedCount: number): string {
  return `${pickedCount}곳 담음 · ${recommendedPickCount(dayCount)}곳 추천`;
}
