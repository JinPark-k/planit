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
import { CATEGORY_LABELS } from '../constants/categories';
import { colors } from '../theme/colors';
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
            <View style={[styles.heroImage, styles.heroEmpty]}>
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
              <Text style={styles.categoryText}>
                {CATEGORY_LABELS[place.category]}
              </Text>
            </View>
          </View>

          {place.tags.length > 0 && (
            <View style={styles.tagRow}>
              {place.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {visit !== undefined && (
            <View style={styles.visitCard}>
              <Text style={styles.visitText}>{formatVisit(visit)}</Text>
              <Text style={styles.visitNote}>이동시간·체류시간은 추정치</Text>
            </View>
          )}

          {place.address !== undefined && (
            <Section label="위치">
              <Text style={styles.sectionValue}>{place.address}</Text>
            </Section>
          )}

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
    paddingBottom: 32,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.placeholder,
  },
  heroEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // 사진 위에 얹히므로 밝은 사진에서도 보이도록 배경을 깐다.
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backIcon: {
    fontSize: 20,
    color: colors.text,
  },
  body: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  categoryBadge: {
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  visitCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  visitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  visitNote: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  sectionValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
