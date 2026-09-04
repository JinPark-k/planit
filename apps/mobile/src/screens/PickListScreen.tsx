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
import { Place, RegionCode } from '../api/types';
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

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const load = useCallback(() => {
    if (region === null) return;
    setLoading(true);
    setListError(null);
    fetchRecommendations(region, keywords)
      .then(paged => setPlaces(paged.items))
      .catch((cause: unknown) => {
        setListError(
          cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다',
        );
      })
      .finally(() => setLoading(false));
  }, [region, keywords]);

  // 지역이나 키워드가 바뀌면 다시 조회한다. 조회 버튼을 따로 두지 않는 이유는
  // 고르는 화면이라 결과가 바로 보이는 편이 낫기 때문이다.
  useEffect(load, [load]);

  // 목록이 바뀌면 이제 목록에 없는 장소를 담은 채로 두지 않는다.
  useEffect(() => {
    setPickedIds(previous =>
      previous.filter(id => places.some(place => place.id === id)),
    );
  }, [places]);

  const toggle = (placeId: string) => {
    setPickedIds(previous =>
      previous.includes(placeId)
        ? previous.filter(id => id !== placeId)
        : [...previous, placeId],
    );
  };

  const guide = useMemo(
    () => pickGuide(dayCount, pickedIds.length),
    [dayCount, pickedIds.length],
  );

  const canSubmit = region !== null && pickedIds.length > 0 && !submitting;

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
              <RegionPicker value={region} onChange={setRegion} />
            </Section>

            <Section label={`키워드 (${keywords.length}/${MAX_KEYWORDS})`}>
              <KeywordPicker selected={keywords} onChange={setKeywords} />
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
                {pickCountLabel(dayCount, pickedIds.length)}
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
                : '조건에 맞는 장소를 찾지 못했습니다. 키워드를 줄여 보세요.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <PlaceRow
            place={item}
            picked={pickedIds.includes(item.id)}
            onPress={() => toggle(item.id)}
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
            onSubmit({ region, placeIds: pickedIds, dayCount, keywords });
          }}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && canSubmit && styles.submitButtonPressed,
            !canSubmit && styles.submitButtonDisabled,
          ]}>
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>
              {pickedIds.length > 0
                ? `일정 만들기 (${pickedIds.length}곳)`
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
    // primary(Fresh Lime)는 밝아서 흰 텍스트가 대비를 통과하지 못한다.
    // 채우기 위에는 항상 어두운 텍스트를 얹는다.
    color: colors.text,
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
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitText: {
    ...typography.button,
    // primary가 밝은 라임이라 흰 텍스트는 대비를 통과하지 못한다.
    color: colors.text,
  },
});
