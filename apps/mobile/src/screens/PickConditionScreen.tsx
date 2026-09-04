import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayCountPicker } from '../components/DayCountPicker';
import { KeywordPicker, MAX_KEYWORDS } from '../components/KeywordPicker';
import { RegionPicker } from '../components/RegionPicker';
import { Section } from '../components/Section';
import { usePickSession } from '../navigation/pickSession';
import { colors, radius, spacing, typography } from '../theme';

/**
 * 골라 담기 1단계 — 무엇을 볼지 정한다.
 *
 * 목록과 한 화면에 있었을 때는 일수 5개 + 지역 3개 + 키워드 18개가 헤더를
 * 차지해서 장소가 첫 화면에 한 곳도 보이지 않았다. 고르는 화면인데 고를 것이
 * 안 보이는 셈이라 조건만 떼어 앞에 세웠다.
 *
 * 종류(카테고리)는 여기 두지 않는다. 그건 목록을 훑는 중에 바꾸는 필터라
 * 목록 화면에 있어야 한다.
 */
export function PickConditionScreen({ onNext }: { onNext: () => void }) {
  const { dayCount, setDayCount, region, setRegion, keywords, setKeywords } =
    usePickSession();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>골라 담기</Text>
        <Text style={styles.subtitle}>
          가고 싶은 곳을 담으면 그 장소들로 일정을 만들어 드려요.
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
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: region === null }}
          disabled={region === null}
          onPress={onNext}
          style={[styles.button, region === null && styles.buttonDisabled]}>
          <Text style={styles.buttonText}>
            {region === null ? '지역을 골라 주세요' : '장소 보기'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginTop: spacing.lg,
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  button: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonText: {
    ...typography.button,
    color: colors.surface,
  },
});
