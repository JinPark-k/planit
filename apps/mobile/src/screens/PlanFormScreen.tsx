import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchKeywords } from '../api/keywords';
import { GenerateScheduleRequest, RegionCode } from '../api/types';
import { REGION_OPTIONS } from '../constants/regions';
import { colors } from '../theme/colors';

const DAY_COUNT_OPTIONS = [1, 2, 3, 4, 5];
const DEFAULT_DAY_COUNT = 2;
export const MAX_KEYWORDS = 3;

interface Props {
  onSubmit: (request: GenerateScheduleRequest) => void;
  /** 일정 생성 요청이 진행 중인지. 버튼을 잠그는 용도. */
  submitting?: boolean;
  /** 일정 생성이 실패했을 때 이 화면에 표시할 메시지. */
  submitError?: string;
}

export function PlanFormScreen({ onSubmit, submitting, submitError }: Props) {
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const [region, setRegion] = useState<RegionCode | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  const loadKeywords = useCallback(() => {
    setLoadingKeywords(true);
    setKeywordsError(null);
    fetchKeywords()
      .then(setKeywords)
      .catch((error: unknown) => {
        setKeywordsError(
          error instanceof Error ? error.message : '키워드를 불러오지 못했습니다',
        );
      })
      .finally(() => setLoadingKeywords(false));
  }, []);

  useEffect(loadKeywords, [loadKeywords]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(previous => {
      if (previous.includes(keyword)) {
        return previous.filter(k => k !== keyword);
      }
      // 상한에 걸리면 조용히 무시한다. 무엇을 버릴지는 사용자가 정할 일이다.
      if (previous.length >= MAX_KEYWORDS) return previous;
      return [...previous, keyword];
    });
  };

  const canSubmit =
    region !== null && selectedKeywords.length > 0 && !submitting;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>여행 일정 만들기</Text>
      <Text style={styles.subtitle}>
        일수와 지역을 고르고, 관심 있는 키워드를 최대 {MAX_KEYWORDS}개까지
        선택하세요.
      </Text>

      <Section label="일수">
        <View style={styles.chipRow}>
          {DAY_COUNT_OPTIONS.map(option => (
            <Chip
              key={option}
              label={`${option}일`}
              selected={option === dayCount}
              onPress={() => setDayCount(option)}
            />
          ))}
        </View>
      </Section>

      <Section label="지역">
        <View style={styles.chipRow}>
          {REGION_OPTIONS.map(option => (
            <Chip
              key={option.code}
              label={option.label}
              selected={option.code === region}
              onPress={() => setRegion(option.code)}
            />
          ))}
        </View>
      </Section>

      <Section label={`키워드 (${selectedKeywords.length}/${MAX_KEYWORDS})`}>
        {loadingKeywords ? (
          <ActivityIndicator color={colors.primary} style={styles.inlineSpinner} />
        ) : keywordsError !== null ? (
          <View>
            <Text style={styles.errorText}>{keywordsError}</Text>
            <Pressable
              onPress={loadKeywords}
              accessibilityRole="button"
              style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {keywords.map(keyword => {
              const selected = selectedKeywords.includes(keyword);
              return (
                <Chip
                  key={keyword}
                  label={keyword}
                  selected={selected}
                  // 상한에 도달하면 이미 고른 것만 해제할 수 있게 둔다.
                  dimmed={!selected && selectedKeywords.length >= MAX_KEYWORDS}
                  onPress={() => toggleKeyword(keyword)}
                />
              );
            })}
          </View>
        )}
      </Section>

      {submitError !== undefined && (
        <Text style={styles.errorText}>{submitError}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={() =>
          region !== null &&
          onSubmit({ keywords: selectedKeywords, region, dayCount })
        }
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.submitText}>일정 만들기</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  dimmed,
  onPress,
}: {
  label: string;
  selected: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        dimmed && styles.chipDimmed,
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginTop: 28,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDimmed: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  inlineSpinner: {
    alignSelf: 'flex-start',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.warn,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 36,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
