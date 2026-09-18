import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScheduleDay } from '../api/types';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { StartDatePicker } from '../components/StartDatePicker';
import { LiveTripCapability } from '../native/types';
import { colors, radius, spacing, typography } from '../theme';
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
  /** 상태바 표시가 꺼져 있을 때 설정으로 보낸다. Android에서만 넘어온다. */
  onOpenSettings?: () => void;
  /**
   * 안내 카드를 길게 누르면 호출된다. 케이블 없이 실기기에서 승격이 막힌
   * 이유를 확인하려고 둔 통로 — 평소에는 보이지 않는다.
   */
  onShowDiagnostics?: () => void;
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
    if (!capability.statusBar) {
      // 승격은 요청일 뿐 보장이 아니다. 기기가 "지금은 안 된다"고 답한 상태를
      // 감추면, 상태바에 안 뜨는 이유를 사용자도 우리도 알 수 없다.
      return '잠금화면에는 표시돼요. 상태바에도 띄우려면 실시간 업데이트를 켜 주세요.';
    }
    return '시간이 되면 잠금화면과 상태바 표시가 자동으로 다음 장소로 넘어가요.';
  }
  return '잠금화면에 남은 시간이 실시간으로 보여요. 다음 장소로 넘기려면 잠금화면 버튼을 누르거나 앱을 열면 됩니다.';
}

export function TripStartScreen({
  days,
  regionLabel,
  value,
  onOpenSettings,
  onShowDiagnostics,
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
      <ScreenHeader title="여행 시작하기" onBack={onBack} />

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
        <Card style={styles.previewCard}>
          {labels.map(({ day, label }) => (
            <View key={day} style={styles.previewRow}>
              <Text style={styles.previewDay}>{day}일차</Text>
              <Text style={styles.previewDate}>{label}</Text>
            </View>
          ))}
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="표시 안내"
          onLongPress={onShowDiagnostics}
          style={styles.guidanceCard}>
          <Text style={styles.guidanceText}>{guidance}</Text>
          {/*
            알림이 꺼져 있을 때도 설정으로 보낸다. 앞서는 승격이 막힌 경우에만
            버튼을 띄웠는데, 정작 더 막혀 있는 쪽(알림 자체가 꺼짐)에서 갈 곳이
            없었다 — 실기기에서 "알림을 허용하면…"만 뜨고 아무것도 누를 수
            없는 상태를 봤다.
          */}
          {onOpenSettings !== undefined &&
            capability.supported &&
            (!capability.allowed || !capability.statusBar) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="실시간 업데이트 설정 열기"
                onPress={onOpenSettings}
                style={({ pressed }) => [
                  styles.settingsLink,
                  pressed && styles.settingsLinkPressed,
                ]}>
                <Text style={styles.settingsLinkText}>설정 열기</Text>
              </Pressable>
            )}
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {error !== undefined && <Text style={styles.errorText}>{error}</Text>}
        <Button
          label="여행 시작"
          onPress={onConfirm}
          loading={starting === true}
        />
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
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    ...typography.bodyStrong,
    color: colors.accent,
  },
  previewLabel: {
    marginTop: spacing.xxl,
  },
  previewCard: {
    padding: spacing.md,
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
  settingsLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  settingsLinkPressed: {
    backgroundColor: colors.accentLight,
  },
  settingsLinkText: {
    ...typography.smallStrong,
    color: colors.accent,
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
});
