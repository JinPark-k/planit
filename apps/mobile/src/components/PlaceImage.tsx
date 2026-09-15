import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Place } from '../api/types';
import { colors, iconSize, spacing, typography } from '../theme';
import { PLACE_ICONS, placeIconKind } from './placeIcon';

export interface PlaceImageProps {
  place: Pick<Place, 'imageUrl' | 'category' | 'tags'>;
  /** 상자의 기하는 호출부가 준다. */
  style?: StyleProp<ViewStyle>;
  /** 사진이 없을 때만 더해지는 스타일. */
  emptyStyle?: StyleProp<ViewStyle>;
  /** 사진이 없을 때 적을 문구. 상세 화면만 쓴다. */
  emptyLabel?: string;
  /** 빈 자리 아이콘 크기. 목록 썸네일은 thumb, 상세/히어로는 hero. */
  size?: 'thumb' | 'hero';
}

/**
 * 빈 자리 아이콘 크기·획 두께는 상자 크기가 아니라 size로만 정한다 — 상자의
 * 기하(크기/radius/비율)는 호출부가 갖는다는 위 원칙과 같은 선이다.
 *
 * 획 두께를 둘로 나누는 이유: lucide 기본값(24px 기준 stroke 2)을 그대로
 * 48px 아이콘에 쓰면 24px일 때보다 상대적으로 굵어 보인다. hero는 1.75로
 * 낮춰 thumb과 비슷한 시각적 굵기를 맞춘다.
 */
const ICON = {
  thumb: { px: iconSize.lg, stroke: 2 },
  hero: { px: iconSize.xl, stroke: 1.75 },
} as const;

/**
 * 장소 썸네일/히어로 이미지.
 *
 * 크기를 size prop으로 흡수한 Chip과 달리, 여기 호출부 다섯 곳은 64 정사각 /
 * 160 풀폭 / 180+radius / 4:3 가변으로 역할이 실제로 다르다. size='home'|'festival'
 * 같은 식으로 만들면 컴포넌트가 화면 이름을 알게 되고 화면이 늘 때마다 variant가
 * 늘어난다. 컴포넌트가 소유하는 건 빈 자리의 생김새(배경색·정렬·문구 스타일)뿐이고,
 * 상자의 기하(크기/radius/비율)는 호출부가 style로 준다.
 */
export function PlaceImage({
  place,
  style,
  emptyStyle,
  emptyLabel,
  size = 'thumb',
}: PlaceImageProps) {
  if (place.imageUrl !== undefined) {
    return (
      <Image
        source={{ uri: place.imageUrl }}
        // 호출부가 넘기는 style은 전부 View 기준(ViewStyle)이다. Image가
        // 요구하는 ImageStyle과 거의 같지만 overflow 값 범위만 더 좁아서
        // 타입만 안 맞을 뿐 실제로 쓰는 속성(width/height/radius 등)은 겹친다.
        style={style as StyleProp<ImageStyle>}
        resizeMode="cover"
      />
    );
  }

  // 상세 화면은 사진이 있으면 4:3, 없으면 height 160으로 줄어든다(회색 덩어리가
  // 화면 절반을 먹고 본문이 밀리는 걸 막던 기존 결정). 호출부는 렌더 전에 사진
  // 유무를 모르므로 이 스타일을 style에 조건부로 섞어 넣을 수 없다 — "비어있을
  // 때만" 적용되도록 컴포넌트 내부에서 더한다.
  const Icon = PLACE_ICONS[placeIconKind(place)];
  const { px, stroke } = ICON[size];

  return (
    <View
      style={[style, styles.empty, emptyStyle]}
      // 아이콘은 장식이다. 목록 행은 바깥 Pressable이 이미 장소 이름으로
      // accessibilityLabel을 갖고 있어서, 안쪽 아이콘까지 읽히면 같은 장소를
      // 스크린리더가 두 번 말한다. emptyLabel("사진 없음")은 반대로 실제
      // 정보라 숨기면 안 되므로, 문구가 없을 때만 트리에서 숨긴다.
      accessibilityElementsHidden={emptyLabel === undefined}
      importantForAccessibility={
        emptyLabel === undefined ? 'no-hide-descendants' : 'auto'
      }>
      <Icon color={colors.accent} size={px} strokeWidth={stroke} />
      {emptyLabel !== undefined && (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
