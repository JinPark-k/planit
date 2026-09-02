import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * 검색 탭의 첫 화면. 아직 자리만 잡아 둔 상태다.
 *
 * 목업 03(키워드 조합 검색)의 실제 구현은 다음 작업이다. 백엔드는 이미 준비돼 있다 —
 * POST /recommend가 키워드 스코어링 순 목록을, POST /schedule/from-places가
 * 담은 장소로 일정을 만들어 준다.
 */
export function SearchHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>키워드로 찾기</Text>
      <Text style={styles.body}>
        관심 키워드로 여행지를 찾아 담고, 담은 곳들로 일정을 만드는 화면이 여기
        들어옵니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    marginTop: spacing.md,
    ...typography.body,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
