import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SavedTrip } from '../storage/savedTrips';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  trips: SavedTrip[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onSelectTrip: (trip: SavedTrip) => void;
}

export function SavedTripsScreen({
  trips,
  loading,
  error,
  onRetry,
  onSelectTrip,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 여행</Text>
        <Text style={styles.subtitle}>
          저장한 여행 루트를 언제든 다시 확인해 보세요.
        </Text>
      </View>

      {loading && trips.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>저장한 여행을 불러오는 중이에요</Text>
        </View>
      ) : error !== undefined && trips.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>여행을 불러오지 못했어요</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}>
            <Text style={styles.retryText}>다시 불러오기</Text>
          </Pressable>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.centered}>
          <Image
            source={require('../assets/tab-saved.png')}
            resizeMode="contain"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>아직 저장한 여행이 없어요</Text>
          <Text style={styles.emptyBody}>
            여행 일정을 만든 뒤{`\n`}‘여행 저장하기’를 눌러 보세요.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {error !== undefined && (
            <Text style={styles.inlineError}>{error}</Text>
          )}
          {trips.map(trip => (
            <SavedTripCard
              key={trip.id}
              trip={trip}
              onPress={() => onSelectTrip(trip)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function SavedTripCard({
  trip,
  onPress,
}: {
  trip: SavedTrip;
  onPress: () => void;
}) {
  const places = trip.days.flatMap(day => day.items.map(item => item.place.name));
  const preview = places.slice(0, 3).join(' · ');
  const remaining = Math.max(0, places.length - 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.regionLabel} 저장 여행 열기`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{trip.regionLabel} 여행</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{trip.days.length}일</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.routeLine}>
        <View style={styles.routeDot} />
        <View style={styles.routeDash} />
        <View style={styles.routeDot} />
        <View style={styles.routeDash} />
        <View style={[styles.routeDot, styles.routeDotEnd]} />
      </View>

      <Text style={styles.placePreview} numberOfLines={2}>
        {preview || '저장된 장소가 없습니다'}
        {remaining > 0 ? ` 외 ${remaining}곳` : ''}
      </Text>
      <Text style={styles.savedAt}>
        {formatSavedAt(trip.savedAt)} · 총 {places.length}곳
      </Text>
    </Pressable>
  );
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '저장한 여행';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day} 저장`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.display,
    color: colors.accent,
  },
  subtitle: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.small,
    color: colors.textMuted,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    ...typography.small,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  retryText: {
    ...typography.smallStrong,
    // 라임 채우기 위 라벨(Lime-Fill 규칙).
    color: colors.surface,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  inlineError: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warnLight,
    ...typography.small,
    color: colors.text,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.accentLight,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
  },
  dayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  dayBadgeText: {
    ...typography.microStrong,
    color: colors.primaryDeep,
  },
  chevron: {
    fontSize: 28,
    lineHeight: 28,
    color: colors.accent,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  routeDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  routeDotEnd: {
    backgroundColor: colors.primary,
  },
  routeDash: {
    width: 30,
    height: 2,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.accent,
    opacity: 0.35,
  },
  placePreview: {
    ...typography.bodyStrong,
    lineHeight: 21,
    color: colors.text,
  },
  savedAt: {
    marginTop: spacing.sm,
    ...typography.micro,
    color: colors.textMuted,
  },
});
