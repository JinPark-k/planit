import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { GenerateScheduleRequest, RegionCode } from '../api/types';
import { DayCountPicker } from '../components/DayCountPicker';
import { KeywordPicker, MAX_KEYWORDS } from '../components/KeywordPicker';
import { RegionPicker } from '../components/RegionPicker';
import { Section } from '../components/Section';
import { colors, radius, spacing, typography } from '../theme';

const DEFAULT_DAY_COUNT = 2;

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
  const [keywords, setKeywords] = useState<string[]>([]);

  const canSubmit = region !== null && keywords.length > 0 && !submitting;

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
        <DayCountPicker value={dayCount} onChange={setDayCount} />
      </Section>

      <Section label="지역">
        <RegionPicker value={region} onChange={setRegion} />
      </Section>

      <Section label={`키워드 (${keywords.length}/${MAX_KEYWORDS})`}>
        <KeywordPicker selected={keywords} onChange={setKeywords} />
      </Section>

      {submitError !== undefined && (
        <Text style={styles.errorText}>{submitError}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={() =>
          region !== null && onSubmit({ keywords, region, dayCount })
        }
        style={({ pressed }) => [
          styles.submitButton,
          pressed && canSubmit && styles.submitButtonPressed,
          !canSubmit && styles.submitButtonDisabled,
        ]}>
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text
            style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
            일정 만들기
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.display,
    color: colors.accent,
  },
  subtitle: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
  },
  errorText: {
    marginTop: spacing.md,
    ...typography.caption,
    color: colors.warn,
  },
  submitButton: {
    marginTop: spacing.xxxl,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitText: {
    ...typography.button,
    // 라임 채우기 위 라벨은 흰색으로 통일한다(아래 DESIGN.md의
    // Lime-Fill 규칙). 측정상 2.20:1로 WCAG AA에는 못 미치지만,
    // 실기기에서 보고 내린 디자인 결정이다.
    color: colors.surface,
  },
  submitTextDisabled: {
    // 비활성 채우기(disabled)는 옅은 라벤더라 활성 라임과 명도가 달라,
    // 라벨 색을 따로 잡는다. 활성 라벨을 바꿔도 여기는 따라오지 않는다.
    color: colors.text,
  },
});
