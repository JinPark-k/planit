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
import { colors, typography } from '../theme';

export interface PlaceImageProps {
  place: Pick<Place, 'imageUrl'>;
  /** 상자의 기하는 호출부가 준다. */
  style?: StyleProp<ViewStyle>;
  /** 사진이 없을 때만 더해지는 스타일. */
  emptyStyle?: StyleProp<ViewStyle>;
  /** 사진이 없을 때 적을 문구. 상세 화면만 쓴다. */
  emptyLabel?: string;
}

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
  return (
    <View style={[style, styles.empty, emptyStyle]}>
      {emptyLabel !== undefined && (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
