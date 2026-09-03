import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchKeywords } from '../api/keywords';
import { colors, radius, spacing, typography } from '../theme';
import { Chip } from './Chip';
import { ChipRow } from './ChipRow';

/** 한 번에 고를 수 있는 키워드 수. 서버는 20개까지 받지만 화면에서는 좁힌다. */
export const MAX_KEYWORDS = 3;

/**
 * 키워드 목록을 서버에서 받아 최대 MAX_KEYWORDS개까지 고르게 한다.
 *
 * 화면 두 곳(일정 자동 생성, 골라 담기)이 같은 선택을 필요로 한다. 조회·로딩·실패
 * 재시도·상한 처리가 모두 들어 있어서, 복사하면 한쪽만 고쳐지는 상황이 생긴다.
 */
export function KeywordPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchKeywords()
      .then(setKeywords)
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error ? cause.message : '키워드를 불러오지 못했습니다',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const toggle = (keyword: string) => {
    if (selected.includes(keyword)) {
      onChange(selected.filter(k => k !== keyword));
      return;
    }
    // 상한에 걸리면 조용히 무시한다. 무엇을 버릴지는 사용자가 정할 일이다.
    if (selected.length >= MAX_KEYWORDS) return;
    onChange([...selected, keyword]);
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.spinner} />;
  }

  if (error !== null) {
    return (
      <View>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={load}
          style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ChipRow>
      {keywords.map(keyword => {
        const isSelected = selected.includes(keyword);
        return (
          <Chip
            key={keyword}
            label={keyword}
            selected={isSelected}
            // 상한에 도달하면 이미 고른 것만 해제할 수 있게 둔다.
            dimmed={!isSelected && selected.length >= MAX_KEYWORDS}
            onPress={() => toggle(keyword)}
          />
        );
      })}
    </ChipRow>
  );
}

const styles = StyleSheet.create({
  spinner: {
    alignSelf: 'flex-start',
  },
  errorText: {
    marginTop: spacing.md,
    ...typography.caption,
    color: colors.warn,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: {
    ...typography.smallStrong,
    color: colors.primary,
  },
});
