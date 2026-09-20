import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fromDateKey } from '../trip/tripDate';
import { Card } from './Card';
import { colors, iconSize, radius, spacing, typography } from '../theme';
import { buildMonthGrid, monthLabel, shiftMonth } from '../screens/tripStart.format';

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  /** 선택된 날짜(dateKey). */
  value: string;
  onChange: (dateKey: string) => void;
  /** 고를 수 있는 범위. 이 범위는 이 컴포넌트가 아니라 호출부(TripStartScreen)가 정한다. */
  minDateKey: string;
  maxDateKey: string;
}

/**
 * 새 의존성 없이 Pressable 그리드로 그린 월 달력.
 *
 * 선택 가능 범위(오늘~90일 등 정책)는 여기서 정하지 않는다 — minDateKey/maxDateKey를
 * 그대로 받아 disabled 여부만 계산한다. 범위 정책이 바뀌어도 이 컴포넌트는 안 바뀐다.
 */
export function StartDatePicker({ value, onChange, minDateKey, maxDateKey }: Props) {
  const initial = fromDateKey(value);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1);

  const grid = buildMonthGrid(year, month, minDateKey, maxDateKey);

  const goPrevMonth = () => {
    const next = shiftMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  };

  const goNextMonth = () => {
    const next = shiftMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          onPress={goPrevMonth}
          style={styles.navButton}>
          <Text style={styles.navIcon}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel(year, month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          onPress={goNextMonth}
          style={styles.navButton}>
          <Text style={styles.navIcon}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADERS.map(label => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((cell, index) =>
          cell === null ? (
            <View key={`blank-${index}`} style={styles.cell} />
          ) : (
            <View key={cell.dateKey} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cell.dateKey}
                accessibilityState={{
                  disabled: cell.disabled,
                  selected: cell.dateKey === value,
                }}
                disabled={cell.disabled}
                onPress={() => onChange(cell.dateKey)}
                style={[
                  styles.dayButton,
                  cell.dateKey === value && styles.dayButtonSelected,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    cell.disabled && styles.dayTextDisabled,
                    cell.dateKey === value && styles.dayTextSelected,
                  ]}>
                  {Number(cell.dateKey.slice(-2))}
                </Text>
              </Pressable>
            </View>
          ),
        )}
      </View>
    </Card>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: iconSize.md,
    color: colors.text,
  },
  monthLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  weekdayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    ...typography.micro,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: CELL_SIZE - spacing.xs,
    height: CELL_SIZE - spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.accent,
  },
  dayText: {
    ...typography.small,
    color: colors.text,
  },
  dayTextDisabled: {
    color: colors.disabled,
  },
  dayTextSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
});
