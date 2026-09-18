import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radius, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /**
   * 'primary'는 라임 채우기(화면의 주 행동), 'secondary'는 퍼플 외곽선.
   * 한 화면에 primary는 하나만 둔다.
   */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 라벨 대신 스피너를 그린다. 누르기도 함께 막힌다. */
  loading?: boolean;
  /** 라벨과 읽히는 이름이 달라야 할 때만 준다. */
  accessibilityLabel?: string;
  /** 배치용(flex, margin)으로만 쓴다. 색·높이·모서리는 이 컴포넌트가 정한다. */
  style?: StyleProp<ViewStyle>;
}

/**
 * 화면 폭을 채우는 주 버튼.
 *
 * 7개 화면이 각자 Pressable + 로컬 StyleSheet로 같은 버튼을 만들다 보니 값이
 * 갈려 있었다 — 높이 50/52, 비활성이 채우기 교체 vs opacity, 누름 상태가
 * 있는 화면과 없는 화면. 여기로 모으고 다수 쪽으로 수렴시켰다.
 *
 * 화면 안에 자리잡는 작은 버튼(리스트 비었을 때의 "다시 불러오기" 같은)은
 * 모양이 달라서 아직 여기 들어와 있지 않다.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  // 로딩 중에 또 누르면 같은 요청이 두 번 나간다. 눌림 자체를 막는다.
  const inactive = disabled || loading;
  const isPrimary = variant === 'primary';

  const spinnerColor = isPrimary ? colors.surface : colors.accent;

  // 비활성 라벨은 variant마다 다르다. primary는 채우기가 연라벤더로 바뀌는데
  // 그 위에서 흰 라벨이 1.85:1로 사라지므로 잉크로 돌린다. secondary는 배경이
  // 흰색 그대로라 뮤트로 낮춰야 비활성으로 읽힌다.
  const labelVariant = isPrimary
    ? inactive
      ? styles.labelPrimaryInactive
      : styles.labelPrimary
    : inactive
    ? styles.labelSecondaryInactive
    : styles.labelSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed &&
          !inactive &&
          (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        inactive &&
          (isPrimary ? styles.primaryInactive : styles.secondaryInactive),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.label, labelVariant]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryInactive: {
    backgroundColor: colors.disabled,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  secondaryPressed: {
    backgroundColor: colors.accentLight,
  },
  secondaryInactive: {
    borderColor: colors.disabled,
  },
  label: {
    ...typography.button,
  },
  labelPrimary: {
    // 라임 채우기 위 라벨은 흰색(DESIGN.md의 Lime-Fill 규칙).
    color: colors.surface,
  },
  labelSecondary: {
    color: colors.accent,
  },
  labelPrimaryInactive: {
    color: colors.text,
  },
  labelSecondaryInactive: {
    color: colors.textMuted,
  },
});
