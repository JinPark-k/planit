import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, iconSize, spacing, typography } from '../theme';

export interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  /**
   * 뒤로 버튼이 읽히는 이름. 기본값은 '뒤로'.
   * 돌아가는 곳이 그냥 이전 화면이 아니라 뜻이 있을 때만 준다
   * (골라 담기에서는 '조건 바꾸기').
   */
  backLabel?: string;
}

/**
 * 뒤로 버튼 + 제목으로 된 화면 상단 바.
 *
 * 네 화면이 같은 마크업과 같은 스타일 4종을 각자 들고 있었다. Button과 달리
 * 값이 갈린 곳은 없었지만, 그래서 더 옮길 이유가 됐다 — 지난번 "헤더 글자를
 * 퍼플로" 변경 때 네 파일을 똑같이 고쳐야 했다.
 *
 * 제목은 항상 한 줄로 자른다. 지역 이름이 길어졌을 때 헤더가 두 줄로 늘어나
 * 아래 내용이 밀리는 것보다 잘리는 편이 낫다.
 *
 * 장소 상세의 사진 위에 떠 있는 뒤로 버튼은 모양이 달라 여기 들어오지 않는다.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = '뒤로',
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: iconSize.md,
    color: colors.accent,
  },
  title: {
    flex: 1,
    ...typography.heading,
    color: colors.accent,
  },
});
