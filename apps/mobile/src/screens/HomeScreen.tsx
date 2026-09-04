import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchFestivals } from '../api/festivals';
import { Festival } from '../api/types';
import { Chip } from '../components/Chip';
import { REGION_OPTIONS } from '../constants/regions';
import { colors, radius, spacing, typography } from '../theme';
import {
  festivalPeriod,
  festivalTiming,
  isLongRunning,
  todayInKst,
} from './festival.format';

interface Props {
  /** 축제를 누르면 그 축제로 여행을 만든다. */
  onSelectFestival: (festival: Festival) => void;
}

/**
 * 홈 — 지금 열리는 축제.
 *
 * 축제를 입구로 삼는다. 키워드로 여행지를 고르는 화면에 축제를 섞으면 한 지역에
 * 몇 건 없어 빈약해지는데(제주 6건), 축제에서 출발하면 전국 274건이 재료가 되고
 * 축제가 드문 지역도 자연스럽게 노출된다.
 *
 * 지역을 고르게 하지 않는다. 어디로 갈지가 아니라 무엇이 열리는지가 먼저다.
 */
export function HomeScreen({ onSelectFestival }: Props) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayInKst(), []);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetchFestivals()
      .then(paged => setFestivals(paged.items))
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : '축제를 불러오지 못했습니다',
        );
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => load(), [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={festivals}
        keyExtractor={festival => festival.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primaryDeep}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>지금 열리는 축제</Text>
            <Text style={styles.subtitle}>
              축제를 고르면 그 지역 여행 일정을 만들어 드려요.
            </Text>
            {loading && (
              <ActivityIndicator
                color={colors.primaryDeep}
                style={styles.spinner}
              />
            )}
            {error !== null && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => load()}
                  style={styles.retryButton}>
                  <Text style={styles.retryText}>다시 시도</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading || error !== null ? null : (
            <Text style={styles.emptyText}>
              지금 예정된 축제가 없습니다. 잠시 후 다시 확인해 주세요.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <FestivalCard
            festival={item}
            today={today}
            onPress={() => onSelectFestival(item)}
          />
        )}
      />
    </View>
  );
}

function regionLabel(festival: Festival): string {
  return (
    REGION_OPTIONS.find(option => option.code === festival.region)?.label ??
    festival.region
  );
}

function FestivalCard({
  festival,
  today,
  onPress,
}: {
  festival: Festival;
  today: string;
  onPress: () => void;
}) {
  const timing = festivalTiming(festival, today);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${festival.name}, ${regionLabel(festival)}, ${festivalPeriod(festival)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {festival.imageUrl !== undefined ? (
        <Image
          source={{ uri: festival.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.image} />
      )}

      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <Chip label={regionLabel(festival)} variant="soft" size="sm" />
          {/* 상설 프로그램은 "그때만 열린다"는 성격이 없어 따로 표시한다. */}
          {isLongRunning(festival) ? (
            <Chip label="상시" size="sm" />
          ) : (
            <Text
              style={[styles.timing, festival.ongoing && styles.timingOngoing]}>
              {timing}
            </Text>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {festival.name}
        </Text>

        {/* 일정은 절대 날짜를 잡지 않는다. 사용자가 이 날짜를 보고 달력을 맞춘다. */}
        <Text style={styles.period}>{festivalPeriod(festival)}</Text>

        {festival.address !== undefined && (
          <Text style={styles.address} numberOfLines={1}>
            {festival.address}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const IMAGE_HEIGHT = 160;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
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
    marginBottom: spacing.md,
    ...typography.small,
    color: colors.textMuted,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
  card: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: colors.primaryDeep,
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: colors.placeholder,
  },
  cardBody: {
    padding: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timing: {
    ...typography.smallStrong,
    color: colors.textMuted,
  },
  timingOngoing: {
    color: colors.warn,
  },
  name: {
    ...typography.bodyStrong,
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
  emptyText: {
    marginTop: spacing.xxxl,
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.warn,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryText: {
    ...typography.smallStrong,
    color: colors.primaryDeep,
  },
});
