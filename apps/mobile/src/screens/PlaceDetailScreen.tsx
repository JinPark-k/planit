import React, { useEffect } from 'react';
import {
  BackHandler,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Place } from '../api/types';
import { Chip } from '../components/Chip';
import { openKakaoMapPlace } from '../deeplink';
import { CATEGORY_LABELS } from '../constants/categories';
import { colors, iconSize, radius, spacing, typography } from '../theme';
import { formatVisit, telHref, VisitContext } from './placeDetail.format';

interface Props {
  place: Place;
  /** 일정에서 들어온 경우의 방문 맥락. 없으면 그 카드를 그리지 않는다. */
  visit?: VisitContext;
  onBack: () => void;
}

/**
 * 장소 상세(목업 04).
 *
 * 목업의 평점(★4.8)·영업시간·설명문·찜은 넣지 않았다. 평점은 DB에서 rating이 전 행
 * default 0.5, popularity가 0이라 계산하는 코드 자체가 없고(표시하면 모든 장소가 같은
 * 별점이 된다), 설명문(overview)/홈페이지는 TourAPI detailCommon2를 배치에 붙여야
 * 채워지는데 아직 미연동이라 전 행 NULL이다. 영업시간은 루트 CLAUDE.md에서 향후 과제로
 * 명시돼 있다. 있지도 않은 값을 자리만 잡아 두면 빈 섹션이 남으므로, 데이터가 생길 때
 * 섹션을 추가한다.
 */
export function PlaceDetailScreen({ place, visit, onBack }: Props) {
  // 안드로이드 하드웨어 뒤로가기로도 닫힌다. 이 화면은 일정 화면 위에 겹쳐 뜨므로
  // 처리하지 않으면 상세가 열린 채로 앱이 종료된다.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true; // 기본 동작(앱 종료)을 막는다
      },
    );
    return () => subscription.remove();
  }, [onBack]);

  const dialUrl = place.tel ? telHref(place.tel) : undefined;

  const handleOpenMap = () => {
    openKakaoMapPlace({
      id: place.id,
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng,
    }).catch(() => {
      // 앱도 웹도 열지 못한 경우. 사용자가 취할 조치가 없어 화면을 방해하지 않는다.
    });
  };

  const handleCall = () => {
    if (dialUrl === undefined) return;
    Linking.openURL(dialUrl).catch(() => {
      // 다이얼러가 없는 기기(태블릿/에뮬레이터)에서는 열리지 않는다.
      // 걸 수 없다는 것 외에 사용자가 취할 조치가 없으므로 화면을 방해하지 않고 넘어간다.
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {place.imageUrl !== undefined ? (
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            // 실측 900건 중 16%가 이미지가 없다. 빈 공간 대신 이유를 적어 준다.
            <View style={styles.heroEmpty}>
              <Text style={styles.heroEmptyText}>사진 없음</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onBack}
            style={styles.backButton}
            hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{place.name}</Text>
            <View style={styles.categoryBadge}>
              <Chip
                label={CATEGORY_LABELS[place.category]}
                variant="soft"
                size="sm"
              />
            </View>
          </View>

          {place.tags.length > 0 && (
            <View style={styles.tagRow}>
              {place.tags.map(tag => (
                <Chip key={tag} label={`#${tag}`} size="sm" />
              ))}
            </View>
          )}

          {visit !== undefined && (
            <View style={styles.visitCard}>
              <Text style={styles.visitText}>{formatVisit(visit)}</Text>
              <Text style={styles.visitNote}>이동시간·체류시간은 추정치</Text>
            </View>
          )}

          <Section label="위치">
            {place.address !== undefined && (
              <Text style={styles.sectionValue}>{place.address}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${place.name} 카카오맵으로 열기`}
              onPress={handleOpenMap}
              style={({ pressed }) => [
                styles.mapButton,
                pressed && styles.mapButtonPressed,
              ]}>
              <Text style={styles.mapButtonText}>카카오맵으로 열기</Text>
              <Text style={styles.mapButtonChevron}>›</Text>
            </Pressable>
          </Section>

          {place.tel !== undefined && (
            <Section label="문의">
              {dialUrl !== undefined ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${place.tel} 전화 걸기`}
                  onPress={handleCall}>
                  <Text style={[styles.sectionValue, styles.link]}>
                    {place.tel}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.sectionValue}>{place.tel}</Text>
              )}
            </Section>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    backgroundColor: colors.placeholder,
  },
  heroImage: {
    width: '100%',
    // 목업 04는 화면 절반을 사진이 차지한다. 고정 높이로 잡으면 기기별로 비율이 달라진다.
    aspectRatio: 4 / 3,
  },
  heroEmpty: {
    width: '100%',
    // 사진이 있을 때의 4:3을 그대로 쓰면 회색 덩어리가 화면 절반을 먹고
    // 이름·태그·주소가 스크롤 아래로 밀린다. 자리만 표시하고 본문을 끌어올린다.
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.placeholder,
  },
  heroEmptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // 사진 위에 얹히므로 밝은 사진에서도 보이도록 배경을 깐다.
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backIcon: {
    fontSize: iconSize.md,
    color: colors.text,
  },
  body: {
    padding: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    ...typography.title,
    color: colors.text,
  },
  categoryBadge: {
    // 이름 첫 줄에 시각적으로 맞추는 오프셋. 모양 자체는 Chip이 갖는다.
    marginTop: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  visitCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  visitText: {
    ...typography.smallStrong,
    color: colors.primary,
  },
  visitNote: {
    marginTop: spacing.xxs,
    ...typography.micro,
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  sectionValue: {
    marginTop: spacing.sm,
    ...typography.body,
    lineHeight: 22,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  mapButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  mapButtonPressed: {
    opacity: 0.7,
  },
  mapButtonText: {
    ...typography.smallStrong,
    color: colors.primary,
  },
  mapButtonChevron: {
    ...typography.button,
    color: colors.primary,
  },
});
