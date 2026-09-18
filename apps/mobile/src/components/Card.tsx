import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  /**
   * 주면 누를 수 있는 카드가 된다. 없으면 Pressable이 아니라 View로 그려
   * 접근성 트리에 버튼이 생기지 않는다(Chip과 같은 방식).
   */
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * 고르는 카드일 때 준다(골라 담기의 장소 행). 주면 접근성 트리에서 버튼이
   * 아니라 체크박스로 읽히고, 고른 동안 테두리가 라임으로 바뀐다.
   * 그냥 눌러서 이동하는 카드에는 주지 않는다.
   */
  selected?: boolean;
  /**
   * 내용이 정하는 것만 넘긴다 — 패딩, 여백, 방향, 그리고 내용별 테두리 강조
   * (고른 장소의 라임 테두리, 식사 앵커의 1.5px 테두리).
   *
   * Button과 달리 style이 이만큼 열려 있는 건, 카드가 컨트롤이 아니라
   * 그릇이라 패딩과 배치가 내용마다 진짜로 다르기 때문이다. 껍데기
   * (배경·테두리 기본값·모서리)와 누름 반응은 여기서 정한다.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * 흰 배경 + 1px 테두리로 된 카드 껍데기.
 *
 * 여섯 곳이 같은 껍데기를 각자 들고 있었다. 공통은 배경·테두리·모서리뿐이고
 * 패딩과 레이아웃은 내용마다 달라서, 그 둘만 여기서 책임진다.
 *
 * 누름 반응은 세 갈래로 갈려 있던 걸 하나로 모았다 — 테두리를 진하게
 * (홈), 라임 톤 배경(골라 담기), 퍼플 톤 배경(일정·내 여행). 퍼플 톤이
 * 다수였고, 톤 배경이 테두리 변화보다 눌린 게 잘 보인다.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  selected,
  style,
}: CardProps) {
  const selectable = selected !== undefined;

  if (onPress === undefined) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selectable ? { checked: selected } : undefined}
      onPress={onPress}
      // style을 pressed보다 먼저 두어, 호출부가 테두리를 바꾸더라도 누름
      // 반응은 항상 보이게 한다.
      style={({ pressed }) => [
        styles.card,
        selected === true && styles.selected,
        style,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    borderColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.accentLight,
  },
});
