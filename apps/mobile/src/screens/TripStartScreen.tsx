import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScheduleDay } from '../api/types';
import { StartDatePicker } from '../components/StartDatePicker';
import { LiveTripCapability } from '../native/types';
import { colors, iconSize, radius, spacing, typography } from '../theme';
import { addDays, toDateKey } from '../trip/tripDate';
import { dayDateLabels } from './tripStart.format';

/** 여행 시작 가능 범위. 너무 먼 미래까지 열어 두면 영업시간/휴무 등 실데이터가
 * 바뀔 여지가 커진다 — 90일은 "곧 갈 여행" 정도로 잡은 값이다. */
const MAX_START_DAYS_AHEAD = 90;

interface Props {
  days: ScheduleDay[];
  regionLabel: string;
  /** 선택된 dateKey. */
  value: string;
  onChange: (dateKey: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  capability: LiveTripCapability;
  starting?: boolean;
  error?: string;
}

/**
 * 안내 문구는 기기가 지금 뭘 해 줄 수 있는지로 말한다("iOS 제한으로 불가능"
 * 같은 기술 변명이 아니라). 우선순위: 지원 안 됨 > 권한 없음 > 안드로이드 > 그 외(iOS 등).
 */
function guidanceText(capability: LiveTripCapability): string {
  if (!capability.supported) {
    return '이 기기에서는 앱 안에서만 표시돼요.';
  }
  if (!capability.allowed) {
    return '알림을 허용하면 잠금화면에도 표시할 수 있어요.';
  }
  if (Platform.OS === 'android') {
    return '시간이 되면 잠금화면 표시가 자동으로 다음 장소로 넘어가요.';
  }
  return '잠금화면에 남은 시간이 실시간으로 보여요. 다음 장소로 넘기려면 잠금화면 버튼을 누르거나 앱을 열면 됩니다.';
}

export function TripStartScreen({
  days,
  regionLabel,
  value,
  onChange,
  onConfirm,
  onBack,
  capability,
  starting,
  error,
}: Props) {
  const minDateKey = useMemo(() => toDateKey(new Date()), []);
  const maxDateKey = useMemo(
    () => toDateKey(addDays(new Date(), MAX_START_DAYS_AHEAD)),
    [],
  );

  const labels = useMemo(() => dayDateLabels(days, value), [days, value]);
  const guidance = guidanceText(capability);

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
        <Text style={styles.headerTitle}>여행 시작하기</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>출발일을 골라 주세요</Text>
        <StartDatePicker
          value={value}
          onChange={onChange}
          minDateKey={minDateKey}
          maxDateKey={maxDateKey}
        />

        <Text style={[styles.sectionLabel, styles.previewLabel]}>
          {regionLabel} 일정 미리보기
        </Text>
        <View style={styles.previewCard}>
          {labels.map(({ day, label }) => (
            <View key={day} style={styles.previewRow}>
              <Text style={styles.previewDay}>{day}일차</Text>
              <Text style={styles.previewDate}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceText}>{guidance}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error !== undefined && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="여행 시작"
          accessibilityState={{ disabled: starting === true }}
          disabled={starting === true}
          onPress={onConfirm}
          style={[
            styles.confirmButton,
            starting === true && styles.confirmButtonDisabled,
          ]}>
          {starting === true ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.confirmButtonText}>여행 시작</Text>
          )}
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
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    ...typography.bodyStrong,
    color: colors.text,
  },
  previewLabel: {
    marginTop: spacing.xxl,
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewDay: {
    ...typography.label,
    color: colors.accent,
  },
  previewDate: {
    ...typography.small,
    color: colors.text,
  },
  guidanceCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  guidanceText: {
    ...typography.micro,
    lineHeight: 18,
    color: colors.primaryDeep,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  errorText: {
    marginBottom: spacing.sm,
    ...typography.caption,
    color: colors.warn,
    textAlign: 'center',
  },
  confirmButton: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.text,
  },
});
