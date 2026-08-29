import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScheduleDay, ScheduleItem } from '../api/types';
import { colors } from '../theme/colors';
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
}

export function ScheduleScreen({
  days,
  regionLabel,
  onBack,
  onRestart,
  onSelectPlace,
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
        <Tab label="전체 보기" active={tab === 'ALL'} onPress={() => setTab('ALL')} />
        {days.map(day => (
          <Tab
            key={day.day}
            label={`${day.day}일차`}
            active={tab === day.day}
            onPress={() => setTab(day.day)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
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
          style={styles.restartButton}>
          <Text style={styles.restartText}>다시 만들기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    fontSize: 22,
    color: colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dayHeader: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.primary,
    marginTop: 22,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    // 카드가 흰색이라 opacity로는 눌림이 거의 안 보인다. 배경을 바꿔 준다.
    backgroundColor: colors.primaryLight,
  },
  rowText: {
    flex: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  placeName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.placeholder,
  },
  thumbPlaceholder: {
    backgroundColor: colors.placeholder,
  },
  totalCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  totalNote: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    marginTop: 40,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  restartButton: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  restartText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
