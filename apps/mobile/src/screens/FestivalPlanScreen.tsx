import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Festival } from '../api/types';
import { Chip } from '../components/Chip';
import { DayCountPicker } from '../components/DayCountPicker';
import { Section } from '../components/Section';
import { REGION_OPTIONS } from '../constants/regions';
import { colors, iconSize, radius, spacing, typography } from '../theme';
import {
  festivalPeriod,
  festivalTiming,
  isLongRunning,
  todayInKst,
} from './festival.format';

const DEFAULT_DAY_COUNT = 2;

interface Props {
  festival: Festival;
  onBack: () => void;
  onSubmit: (dayCount: number) => void;
  submitting?: boolean;
  submitError?: string;
}

/**
 * 축제로 여행 만들기.
 *
 * 지역도 날짜도 묻지 않는다. 지역은 축제가 열리는 곳이고, 날짜는 축제 기간이다.
 * 사용자가 정할 것은 며칠 머무는지뿐이다.
 *
 * 이것이 제안서가 말한 "축제를 앵커로 삼아 주변 관광지를 엮는" 흐름이다.
 * 뒤에서는 담기 흐름과 같은 API를 쓴다 — 축제 하나만 담은 것과 같다.
 */
export function FestivalPlanScreen({
  festival,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const today = useMemo(() => todayInKst(), []);

  const regionLabel =
    REGION_OPTIONS.find(option => option.code === festival.region)?.label ??
    festival.region;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={onBack}
          style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          축제로 여행 만들기
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {festival.imageUrl !== undefined ? (
          <Image
            source={{ uri: festival.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.image} />
        )}

        <View style={styles.badgeRow}>
          <Chip label={regionLabel} variant="soft" size="sm" />
          {isLongRunning(festival) ? (
            <Chip label="상시" size="sm" />
          ) : (
            <Text
              style={[styles.timing, festival.ongoing && styles.timingOngoing]}>
              {festivalTiming(festival, today)}
            </Text>
          )}
        </View>

        <Text style={styles.name}>{festival.name}</Text>
        <Text style={styles.period}>{festivalPeriod(festival)}</Text>
        {festival.address !== undefined && (
          <Text style={styles.address}>{festival.address}</Text>
        )}

        <Section label="며칠 여행하시나요?">
          <DayCountPicker value={dayCount} onChange={setDayCount} />
        </Section>

        {/*
          날짜를 묻지 않는 이유를 화면에서도 밝힌다. 일정이 "1일차/2일차"로만
          나오는 걸 보고 사용자가 당황하지 않도록, 축제 날짜에 맞춰 다녀오면
          된다는 것을 미리 알려 준다.
        */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>일정은 며칠차로 안내해 드려요</Text>
          <Text style={styles.noteBody}>
            축제가 열리는 날에 맞춰 출발일을 정하시면 됩니다. 일정에서 축제가
            몇 일차인지 표시해 드릴게요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {submitError !== undefined && (
          <Text style={styles.errorText}>{submitError}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting === true }}
          disabled={submitting === true}
          onPress={() => onSubmit(dayCount)}
          style={[styles.submitButton, submitting === true && styles.disabled]}>
          {submitting === true ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>이 축제로 일정 만들기</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const IMAGE_HEIGHT = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    color: colors.text,
  },
  headerTitle: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.placeholder,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timing: {
    ...typography.smallStrong,
    color: colors.textMuted,
  },
  timingOngoing: {
    color: colors.warn,
  },
  name: {
    marginTop: spacing.sm,
    ...typography.heading,
    color: colors.text,
  },
  period: {
    marginTop: spacing.xxs,
    ...typography.small,
    color: colors.primaryDeep,
  },
  address: {
    marginTop: spacing.xxs,
    ...typography.micro,
    color: colors.textMuted,
  },
  noteCard: {
    marginTop: spacing.xxl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  noteTitle: {
    ...typography.smallStrong,
    color: colors.primaryDeep,
  },
  noteBody: {
    marginTop: spacing.xxs,
    ...typography.micro,
    lineHeight: 18,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  submitButton: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  disabled: {
    backgroundColor: colors.disabled,
  },
  submitText: {
    ...typography.button,
    color: colors.surface,
  },
  errorText: {
    marginBottom: spacing.sm,
    ...typography.caption,
    color: colors.warn,
  },
});
