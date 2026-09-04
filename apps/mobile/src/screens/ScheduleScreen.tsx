import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExcludedPlace, ScheduleDay, ScheduleItem } from '../api/types';
import { Chip } from '../components/Chip';
import { colors, iconSize, radius, spacing, typography } from '../theme';
import {
  DayTab,
  filterByTab,
  formatMinutes,
  scheduleTitle,
  toScheduleRows,
  totalMinutes,
} from './schedule.format';

interface Props {
  days: ScheduleDay[];
  regionLabel: string;
  onBack: () => void;
  onRestart: () => void;
  /** 장소를 누르면 상세로. day는 상세 화면의 "n일차 · HH:MM 도착"에 쓴다. */
  onSelectPlace: (item: ScheduleItem, day: number) => void;
  /**
   * 담았지만 일정에 넣지 못한 장소. 골라 담기 흐름에서만 넘어온다.
   *
   * 서버가 하루 마감(21:00)을 넘는 장소를 빼는데, 사용자가 고른 것을 조용히
   * 버리면 안 된다. 자동 생성 흐름에서는 사용자가 고른 게 아니라 알리지 않는다.
   */
  excludedPlaces?: ExcludedPlace[];
}

export function ScheduleScreen({
  days,
  regionLabel,
  onBack,
  onRestart,
  onSelectPlace,
  excludedPlaces,
}: Props) {
  const [tab, setTab] = useState<DayTab>('ALL');

  const visibleDays = useMemo(() => filterByTab(days, tab), [days, tab]);
  const rows = useMemo(() => toScheduleRows(visibleDays), [visibleDays]);
  // 합계는 지금 보고 있는 범위 기준이다(1일차 탭이면 1일차 합계).
  const total = useMemo(() => totalMinutes(visibleDays), [visibleDays]);

  const hasAnyItem = days.some(day => day.items.length > 0);

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
        <Text style={styles.headerTitle}>
          {scheduleTitle(regionLabel, days.length)}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // flexGrow를 막지 않으면 세로로 눌려 탭 글자가 잘린다.
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}>
        <Chip
          label="전체 보기"
          selected={tab === 'ALL'}
          onPress={() => setTab('ALL')}
        />
        {days.map(day => (
          <Chip
            key={day.day}
            label={`${day.day}일차`}
            selected={tab === day.day}
            onPress={() => setTab(day.day)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {excludedPlaces !== undefined && excludedPlaces.length > 0 && (
          <View style={styles.excludedCard}>
            <Text style={styles.excludedTitle}>
              담은 곳 중 {excludedPlaces.length}곳은 일정에 넣지 못했어요
            </Text>
            <Text style={styles.excludedBody}>
              {excludedPlaces
                .map(excluded => excluded.place?.name ?? excluded.placeId)
                .join(', ')}
            </Text>
            <Text style={styles.excludedNote}>
              하루에 들를 수 있는 양을 넘었습니다. 일수를 늘리거나 담은 곳을
              줄여 보세요.
            </Text>
          </View>
        )}

        {!hasAnyItem ? (
          <Text style={styles.emptyText}>
            조건에 맞는 장소를 찾지 못했습니다. 키워드를 줄이거나 다른 지역으로
            다시 시도해 보세요.
          </Text>
        ) : (
          rows.map(row =>
            row.kind === 'dayHeader' ? (
              <Text key={row.key} style={styles.dayHeader}>
                {row.day}일차
              </Text>
            ) : (
              <TimelineRow
                key={row.key}
                item={row.item}
                isLast={row.isLastOfDay}
                onPress={() => onSelectPlace(row.item, row.day)}
              />
            ),
          )
        )}

        {hasAnyItem && (
          <View style={styles.totalCard}>
            <Text style={styles.totalText}>
              총 소요 시간 {formatMinutes(total)}
            </Text>
            <Text style={styles.totalNote}>이동 포함 · 추정치</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          style={({ pressed }) => [
            styles.restartButton,
            pressed && styles.restartButtonPressed,
          ]}>
          <Text style={styles.restartText}>다시 만들기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TimelineRow({
  item,
  isLast,
  onPress,
}: {
  item: ScheduleItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const travel = item.travelFromPreviousMinutes;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.place.name} 상세 보기`}
        onPress={onPress}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}>
        <View style={styles.rowText}>
          <Text style={styles.time}>{item.startTime}</Text>
          <Text style={styles.placeName} numberOfLines={2}>
            {item.place.name}
          </Text>
          <Text style={styles.meta}>
            {travel !== undefined && `이동 약 ${formatMinutes(travel)} · `}
            체류 {formatMinutes(item.stayMinutes)}
          </Text>
        </View>

        {item.place.imageUrl !== undefined ? (
          <Image
            source={{ uri: item.place.imageUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </Pressable>
    </View>
  );
}

const RAIL_WIDTH = 24;
const DOT_SIZE = 10;
/**
 * 점을 카드 안 시각 텍스트("09:00")와 같은 줄에 놓기 위한 위쪽 여백.
 *
 * 시각 중앙까지의 높이 = 카드 테두리 1 + 패딩 12 + 13px 한 줄의 절반(약 8) ≈ 21.
 * 점 중앙을 거기에 맞추려면 점 크기의 절반을 뺀다: 21 - 5 = 16.
 */
const DOT_OFFSET = spacing.lg;

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
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  excludedCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warnLight,
  },
  excludedTitle: {
    ...typography.smallStrong,
    color: colors.warn,
  },
  excludedBody: {
    marginTop: spacing.xs,
    ...typography.micro,
    lineHeight: 18,
    color: colors.text,
  },
  excludedNote: {
    marginTop: spacing.xs,
    ...typography.micro,
    color: colors.textMuted,
  },
  dayHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    ...typography.label,
    // 일차 구분은 타임라인(Trail Line)의 일부라 accent(퍼플)를 쓴다.
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.pill,
    // Trail Line 자체 — 브랜드상 이 점과 선이 "trail"이다.
    backgroundColor: colors.accent,
    marginTop: DOT_OFFSET,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.accent,
    // 스크롤 목록을 따라 길게 이어지므로 원색 그대로는 화면을 압도한다.
    // 옅게 낮춰 Trail Line이되 조용히 있게 한다.
    opacity: 0.35,
    marginTop: spacing.xxs,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    // 카드가 흰색이라 opacity로는 눌림이 거의 안 보인다. 배경을 바꿔 준다.
    // 이 카드도 타임라인의 일부라 라임이 아니라 accentLight를 쓴다.
    backgroundColor: colors.accentLight,
  },
  rowText: {
    flex: 1,
  },
  time: {
    ...typography.label,
    color: colors.accent,
  },
  placeName: {
    marginTop: spacing.xxs,
    ...typography.bodyStrong,
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    ...typography.micro,
    color: colors.textMuted,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
  },
  thumbPlaceholder: {
    backgroundColor: colors.placeholder,
  },
  totalCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    // 이동 포함 총 소요 시간 — 경로 정보라 accent(퍼플)를 쓴다.
    backgroundColor: colors.accentLight,
  },
  totalText: {
    ...typography.smallStrong,
    color: colors.accent,
  },
  totalNote: {
    marginTop: spacing.xxs,
    ...typography.micro,
    color: colors.textMuted,
  },
  emptyText: {
    marginTop: spacing.xxxl,
    ...typography.small,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  restartButton: {
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // 이 화면의 주 버튼(다시 만들기)이라 CTA 패턴대로 primary(라임)를 쓴다.
    backgroundColor: colors.primary,
  },
  restartButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  restartText: {
    ...typography.button,
    // primary가 밝은 라임이라 흰 텍스트는 대비를 통과하지 못한다.
    color: colors.text,
  },
});
