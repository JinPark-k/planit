import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { GenerateScheduleRequest, RegionCode } from '../api/types';
import { Button } from '../components/Button';
import { DayCountPicker } from '../components/DayCountPicker';
import { KeywordPicker, MAX_KEYWORDS } from '../components/KeywordPicker';
import { RegionPicker } from '../components/RegionPicker';
import { Section } from '../components/Section';
import { colors, spacing, typography } from '../theme';

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

      <Button
        label="일정 만들기"
        onPress={() =>
          region !== null && onSubmit({ keywords, region, dayCount })
        }
        disabled={!canSubmit}
        loading={submitting}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Button은 색·높이·모서리를 스스로 정한다. 여기서는 배치만 준다.
  submit: {
    marginTop: spacing.xxxl,
  },
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
});
