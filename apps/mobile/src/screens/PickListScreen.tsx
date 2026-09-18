import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchRecommendations } from '../api/recommend';
import { Place, PlaceCategory } from '../api/types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';
import { CategoryPicker } from '../components/CategoryPicker';
import { Chip } from '../components/Chip';
import { PlaceImage } from '../components/PlaceImage';
import { CATEGORY_LABELS } from '../constants/categories';
import { REGION_OPTIONS } from '../constants/regions';
import { usePickSession } from '../navigation/pickSession';
import { colors, radius, spacing, typography } from '../theme';
import { RegionCode } from '../api/types';
import { pickCountLabel, pickGuide } from './pickList.format';

export interface PickListSubmit {
  region: RegionCode;
  placeIds: string[];
  dayCount: number;
  keywords: string[];
}

interface Props {
  onBack: () => void;
  onSubmit: (request: PickListSubmit) => void;
  submitting?: boolean;
  submitError?: string;
}

/**
 * 골라 담기 2단계 — 목록에서 담는다(목업 03).
 *
 * 조건(일수·지역·키워드)은 앞 화면에서 정하고 여기서는 바꾸지 않는다.
 * 종류만 남긴 이유는 목록을 훑는 중에 오가는 필터이기 때문이다 —
 * 맛집을 담다가 관광으로 옮겨 담는 것이 이 화면의 주된 사용법이다.
 */
export function PickListScreen({
  onBack,
  onSubmit,
  submitting,
  submitError,
}: Props) {
  const { dayCount, region, keywords, picked, togglePick } = usePickSession();
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);


  const load = useCallback(
    (isRefresh = false) => {
      if (region === null) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setListError(null);
      fetchRecommendations(region, keywords, category)
        .then(paged => setPlaces(paged.items))
        .catch((cause: unknown) => {
          setListError(
            cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다',
          );
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [region, keywords, category],
  );

  // 지역·키워드·카테고리가 바뀌면 다시 조회한다. 조회 버튼을 따로 두지 않는
  // 이유는 고르는 화면이라 결과가 바로 보이는 편이 낫기 때문이다.
  useEffect(load, [load]);

  const guide = useMemo(
    () => pickGuide(dayCount, picked.length),
    [dayCount, picked.length],
  );

  const canSubmit = region !== null && picked.length > 0 && !submitting;

  const regionLabel =
    REGION_OPTIONS.find(option => option.code === region)?.label ?? '';
  const summary =
    keywords.length > 0 ? `${regionLabel} · ${keywords.join(', ')}` : regionLabel;

  return (
    <View style={styles.container}>
      <ScreenHeader title={summary} onBack={onBack} backLabel="조건 바꾸기" />

      <View style={styles.categoryRow}>
        <CategoryPicker value={category} onChange={setCategory} />
      </View>

      <FlatList
        data={places}
        keyExtractor={place => place.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        // 새 데이터를 보려는 게 아니라 실패 복구용이다 — 백엔드에 TTL 10분
        // 캐시가 있고(places.service.ts) 원 데이터도 하루 한 번 배치로만
        // 바뀌어서 당겨도 대개 같은 결과가 온다. 여기 넣는 진짜 이유는 지금
        // 조회 실패 시 에러 문구 한 줄만 뜨고 재시도 통로가 아예 없기
        // 때문이다.
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primaryDeep}
          />
        }
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.guideCard,
                guide.overRecommended && styles.guideCardWarn,
              ]}>
              <Text
                style={[
                  styles.guideCount,
                  guide.overRecommended && styles.guideTextWarn,
                ]}>
                {pickCountLabel(dayCount, picked.length)}
              </Text>
              <Text
                style={[
                  styles.guideMessage,
                  guide.overRecommended && styles.guideTextWarn,
                ]}>
                {guide.message}
              </Text>
            </View>

            {loading && (
              // 흰 배경 위 전경색이라 밝은 primary가 아니라 대비를 통과하는
              // primaryDeep을 쓴다.
              <ActivityIndicator
                color={colors.primaryDeep}
                style={styles.spinner}
              />
            )}
            {listError !== null && (
              <Text style={styles.errorText}>{listError}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          loading || listError !== null ? null : (
            <Text style={styles.emptyText}>
              {region === null
                ? '지역을 먼저 골라 주세요.'
                : '조건에 맞는 장소를 찾지 못했습니다. 종류를 바꾸거나 앞 화면에서 키워드를 줄여 보세요.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <PlaceRow
            place={item}
            picked={picked.some(pickedPlace => pickedPlace.id === item.id)}
            onPress={() => togglePick(item)}
          />
        )}
      />

      <View style={styles.footer}>
        {submitError !== undefined && (
          <Text style={styles.errorText}>{submitError}</Text>
        )}
        <Button
          label={
            picked.length > 0
              ? `일정 만들기 (${picked.length}곳)`
              : '일정 만들기'
          }
          onPress={() => {
            if (region === null) return;
            onSubmit({
              region,
              placeIds: picked.map(place => place.id),
              dayCount,
              keywords,
            });
          }}
          disabled={!canSubmit}
          loading={submitting}
        />
      </View>
    </View>
  );
}

/** 목록 한 줄. 카드 전체가 담기 토글이다 — 고르는 화면이라 탭 한 번이 가장 빠르다. */
function PlaceRow({
  place,
  picked,
  onPress,
}: {
  place: Place;
  picked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked }}
      accessibilityLabel={`${place.name} ${picked ? '담기 취소' : '담기'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        picked && styles.rowPicked,
        pressed && styles.rowPressed,
      ]}>
      <PlaceImage place={place} style={styles.thumb} size="thumb" />

      <View style={styles.rowText}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        {place.address !== undefined && (
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
        )}
        <View style={styles.tagRow}>
          <Chip
            label={CATEGORY_LABELS[place.category]}
            variant="soft"
            size="sm"
          />
          {place.tags.slice(0, 2).map(tag => (
            <Chip key={tag} label={`#${tag}`} size="sm" />
          ))}
        </View>
      </View>

      <View style={[styles.check, picked && styles.checkPicked]}>
        <Text style={[styles.checkMark, picked && styles.checkMarkPicked]}>
          {picked ? '✓' : '+'}
        </Text>
      </View>
    </Pressable>
  );
}

const CHECK_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  // 종류는 목록과 함께 스크롤되지 않고 위에 고정된다. 훑는 중에 오가는
  // 필터라 손이 닿는 자리에 있어야 한다.
  categoryRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  guideCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  guideCardWarn: {
    backgroundColor: colors.warnLight,
  },
  guideCount: {
    ...typography.smallStrong,
    // primaryLight 위에 얹으므로 밝은 primary가 아니라 대비를 통과하는
    // primaryDeep을 쓴다.
    color: colors.primaryDeep,
  },
  guideMessage: {
    marginTop: spacing.xxs,
    ...typography.micro,
    lineHeight: 18,
    color: colors.textMuted,
  },
  guideTextWarn: {
    color: colors.warn,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowPicked: {
    borderColor: colors.primary,
  },
  rowPressed: {
    backgroundColor: colors.primaryLight,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  rowText: {
    flex: 1,
  },
  placeName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  address: {
    marginTop: spacing.xxs,
    ...typography.micro,
    color: colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPicked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    ...typography.smallStrong,
    color: colors.textMuted,
  },
  checkMarkPicked: {
    // 라임 채우기 위 글자는 흰색(Lime-Fill 규칙). 담김 체크도 버튼·칩과
    // 같은 처리를 따라간다.
    color: colors.surface,
  },
  emptyText: {
    marginTop: spacing.xxxl,
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    ...typography.caption,
    color: colors.warn,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
