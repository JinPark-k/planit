import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchRecommendations } from '../api/recommend';
import { Place, PlaceCategory, RegionCode } from '../api/types';
import { CategoryPicker } from '../components/CategoryPicker';
import { Chip } from '../components/Chip';
import { DayCountPicker } from '../components/DayCountPicker';
import { KeywordPicker, MAX_KEYWORDS } from '../components/KeywordPicker';
import { RegionPicker } from '../components/RegionPicker';
import { Section } from '../components/Section';
import { CATEGORY_LABELS } from '../constants/categories';
import { colors, radius, spacing, typography } from '../theme';
import { pickCountLabel, pickGuide } from './pickList.format';

const DEFAULT_DAY_COUNT = 2;

export interface PickListSubmit {
  region: RegionCode;
  placeIds: string[];
  dayCount: number;
  keywords: string[];
}

interface Props {
  onSubmit: (request: PickListSubmit) => void;
  submitting?: boolean;
  submitError?: string;
}

/**
 * 골라 담기(목업 03).
 *
 * 지역과 키워드로 장소를 조회해 목록에서 담고, 담은 목록으로 일정을 만든다.
 * 자동 생성 탭과 달리 장소를 사용자가 직접 고른다.
 */
export function PickListScreen({ onSubmit, submitting, submitError }: Props) {
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const [region, setRegion] = useState<RegionCode | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  /**
   * 담은 장소를 id가 아니라 장소째로 들고 있는다.
   *
   * 조회 결과에서 id를 찾는 방식이면 목록이 바뀔 때마다 담은 것이 사라진다.
   * 키워드를 하나 더 얹거나 카테고리를 좁히는 건 "지금 보는 범위"를 바꾸는
   * 것이지 담은 것을 버리겠다는 뜻이 아니다.
   */
  const [picked, setPicked] = useState<Place[]>([]);

  const load = useCallback(() => {
    if (region === null) return;
    setLoading(true);
    setListError(null);
    fetchRecommendations(region, keywords, category)
      .then(paged => setPlaces(paged.items))
      .catch((cause: unknown) => {
        setListError(
          cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다',
        );
      })
      .finally(() => setLoading(false));
  }, [region, keywords, category]);

  // 지역·키워드·카테고리가 바뀌면 다시 조회한다. 조회 버튼을 따로 두지 않는
  // 이유는 고르는 화면이라 결과가 바로 보이는 편이 낫기 때문이다.
  useEffect(load, [load]);

  // 지역이 바뀔 때만 담은 것을 비운다. 다른 지역의 장소는 이 일정에 넣을 수 없다.
  const changeRegion = (next: RegionCode) => {
    if (next === region) return;
    setRegion(next);
    setPicked([]);
  };

  const toggle = (place: Place) => {
    setPicked(previous =>
      previous.some(item => item.id === place.id)
        ? previous.filter(item => item.id !== place.id)
        : [...previous, place],
    );
  };

  const guide = useMemo(
    () => pickGuide(dayCount, picked.length),
    [dayCount, picked.length],
  );

  const canSubmit = region !== null && picked.length > 0 && !submitting;

  return (
    <View style={styles.container}>
      <FlatList
        data={places}
        keyExtractor={place => place.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>골라 담기</Text>
            <Text style={styles.subtitle}>
              가고 싶은 곳을 담으면 그 장소들로 일정을 만들어 드려요.
            </Text>

            <Section label="일수">
              <DayCountPicker value={dayCount} onChange={setDayCount} />
            </Section>

            <Section label="지역">
              <RegionPicker value={region} onChange={changeRegion} />
            </Section>

            <Section label={`키워드 (${keywords.length}/${MAX_KEYWORDS})`}>
              <KeywordPicker selected={keywords} onChange={setKeywords} />
            </Section>

            <Section label="종류">
              <CategoryPicker value={category} onChange={setCategory} />
            </Section>

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
              <ActivityIndicator color={colors.primary} style={styles.spinner} />
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
                : '조건에 맞는 장소를 찾지 못했습니다. 키워드를 줄이거나 종류를 바꿔 보세요.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <PlaceRow
            place={item}
            picked={picked.some(pickedPlace => pickedPlace.id === item.id)}
            onPress={() => toggle(item)}
          />
        )}
      />

      <View style={styles.footer}>
        {submitError !== undefined && (
          <Text style={styles.errorText}>{submitError}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={() => {
            if (region === null) return;
            onSubmit({
              region,
              placeIds: picked.map(place => place.id),
              dayCount,
              keywords,
            });
          }}
          style={[
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
          ]}>
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>
              {picked.length > 0
                ? `일정 만들기 (${picked.length}곳)`
                : '일정 만들기'}
            </Text>
          )}
        </Pressable>
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
      {place.imageUrl !== undefined ? (
        <Image
          source={{ uri: place.imageUrl }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumb} />
      )}

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
  guideCard: {
    marginTop: spacing.xxl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  guideCardWarn: {
    backgroundColor: colors.warnLight,
  },
  guideCount: {
    ...typography.smallStrong,
    color: colors.primary,
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
    backgroundColor: colors.placeholder,
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
  submitButton: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitText: {
    ...typography.button,
    color: colors.surface,
  },
});
