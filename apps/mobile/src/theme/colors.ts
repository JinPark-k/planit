/**
 * PLANIT 브랜드 팔레트 — 라임(발견/시작) + 퍼플(경로/타임라인).
 *
 * 라임은 밝은 채도라 흰 배경 위 전경색(링크·아이콘·활성 탭)으로 쓰면
 * WCAG 대비를 통과하지 못한다(라이트니스가 높을수록 사람 눈에는 더 밝게
 * 지각되는데, 채도를 유지한 채 어둡게만 낮추면 대비는 확보되지만 "라임"이
 * 아니라 칙칙한 카키가 된다). 그래서 라임은 두 갈래로 나눈다:
 *   - primary(Fresh Lime): 채우기 전용. 위에 항상 어두운 텍스트(text)를 얹는다.
 *   - primaryDeep(Trailhead Green): 흰 배경 위 전경색 전용(링크, 활성 탭).
 * 퍼플(accent)은 채도를 유지한 채로도 흰 텍스트 대비가 넉넉히 나와서
 * 라임처럼 나눌 필요가 없다 — 채우기와 전경 모두 accent 하나로 충분하다.
 */
export const colors = {
  primary: '#73C322',
  primaryPressed: '#66A71B',
  primaryLight: '#F0F9E7',
  primaryDeep: '#367010',
  accent: '#6B33CC',
  accentPressed: '#452183',
  accentLight: '#F0EBF9',
  warn: '#F2A65A',
  /** warn의 연한 배경. 경고 문구 카드에 쓴다(primaryLight와 같은 역할). */
  warnLight: '#FDF1E3',
  text: '#1B1F27',
  textMuted: '#6B7280',
  border: '#E3E6EC',
  surface: '#FFFFFF',
  background: '#F6F7FB',
  placeholder: '#DDE1E8',
  disabled: '#B8BCC4',
} as const;
