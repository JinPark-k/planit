import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export interface ChipProps {
  label: string;
  /**
   * 누르면 호출된다. 없으면 표시 전용(태그·카테고리 배지)이라
   * Pressable이 아니라 View로 그려 접근성 트리에 버튼이 생기지 않게 한다.
   */
  onPress?: () => void;
  /** 고른 상태. 배경이 primary로 찬다. */
  selected?: boolean;
  /** 상한에 걸려 지금은 고를 수 없는 상태(키워드 4개째). */
  dimmed?: boolean;
  /** 'soft'는 테두리 없이 연한 배경만. 카테고리 배지에 쓴다. */
  variant?: 'outline' | 'soft';
  /** 'sm'은 태그·배지처럼 본문에 딸린 작은 칩. */
  size?: 'md' | 'sm';
}

/**
 * 알약 모양 칩.
 *
 * 키워드 선택, 일차 탭, 태그, 카테고리 배지가 전부 같은 모양인데 화면마다 따로
 * 정의돼 값이 갈렸다(상하 패딩 9/7/5/4, 모서리 18/16/12/12). 한 곳에서 그린다.
 *
 * 모서리에 radius.pill을 쓰므로 size가 늘어도 항상 정확한 알약이 된다.
 */
export function Chip({
  label,
  onPress,
  selected = false,
  dimmed = false,
  variant = 'outline',
  size = 'md',
}: ChipProps) {
  const boxStyle = [
    styles.base,
    size === 'sm' ? styles.sizeSm : styles.sizeMd,
    variant === 'soft' ? styles.soft : styles.outline,
    selected && styles.selected,
    dimmed && styles.dimmed,
  ];
  // 크기는 size가, 강조(색·굵기)는 variant/selected가 정한다. 섞으면 작은 칩을
  // 고를 때 글자가 커지는 식으로 축이 얽힌다.
  const textStyle = [
    size === 'sm' ? styles.textSm : styles.textMd,
    (variant === 'soft' || selected) && styles.textStrong,
    variant === 'soft' && styles.textSoft,
    selected && styles.textSelected,
  ];

  const content = <Text style={textStyle}>{label}</Text>;

  if (onPress === undefined) {
    return <View style={boxStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={boxStyle}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
  },
  sizeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sizeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  soft: {
    backgroundColor: colors.primaryLight,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dimmed: {
    opacity: 0.4,
  },
  textMd: {
    ...typography.small,
    color: colors.text,
  },
  textSm: {
    ...typography.micro,
    color: colors.textMuted,
  },
  textStrong: {
    fontWeight: '600',
  },
  textSoft: {
    // primaryLight 위에 얹으므로 밝은 primary가 아니라 대비를 통과하는
    // primaryDeep을 쓴다.
    color: colors.primaryDeep,
  },
  textSelected: {
    // primary(Fresh Lime)는 밝아서 흰 텍스트가 대비를 통과하지 못한다.
    // 채우기 위에는 항상 어두운 텍스트를 얹는다.
    color: colors.text,
  },
});
