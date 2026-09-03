import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * 라벨이 붙은 구획.
 *
 * PlanFormScreen과 골라 담기 화면이 같은 선택 UI를 쓰므로 여기로 옮겼다.
 * (PlaceDetailScreen에도 Section이 있지만 그건 "위치/문의" 같은 필드 라벨이라
 *  역할이 다르고 글자 크기도 작다. 이름만 같을 뿐 합치면 안 된다.)
 */
export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
