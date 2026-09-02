import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';

/** 칩을 줄바꿈하며 나열하는 행. 선택 UI마다 같은 간격을 쓰도록 모아 둔다. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
