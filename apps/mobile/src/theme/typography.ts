import type { TextStyle } from 'react-native';

/**
 * 글자 역할. 크기를 직접 고르지 않고 역할로 고른다.
 *
 * 이전에는 화면 셋에 fontSize가 9종(12·13·14·15·16·17·20·22·24) 흩어져 있었고,
 * 어느 값이 어떤 역할인지는 코드를 읽어야만 알 수 있었다. 역할로 부르면
 * 새 화면에서 "이건 어느 크기였지"를 다시 정할 필요가 없다.
 *
 * 굵기를 크기와 묶어 둔 이유: 실제로 둘은 함께 정해진다(제목은 700, 본문은 무게 없음).
 * 따로 두면 같은 크기에 굵기만 다른 조합이 화면마다 생긴다.
 */
export const typography = {
  /** 화면 제목 ("여행 일정 만들기") */
  display: { fontSize: 24, fontWeight: '700' },
  /** 콘텐츠 제목 (장소 이름) */
  title: { fontSize: 20, fontWeight: '700' },
  /** 헤더 바 제목 ("제주 3일 일정") */
  heading: { fontSize: 17, fontWeight: '700' },
  /** 주요 버튼 */
  button: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15 },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 14 },
  smallStrong: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 13 },
  /** 13px 강조: 섹션 라벨("위치"), 시각("13:44"), 선택된 탭 */
  label: { fontSize: 13, fontWeight: '700' },
  micro: { fontSize: 12 },
  microStrong: { fontSize: 12, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

/** 아이콘 글리프(←) 크기. 글자 역할과 섞이면 안 돼서 따로 둔다. */
export const iconSize = {
  md: 20,
} as const;
