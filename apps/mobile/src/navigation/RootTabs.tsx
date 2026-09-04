import React from 'react';
import { StyleSheet } from 'react-native';
import { MapPinPlus, Sparkles } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography } from '../theme';
import { SearchStack } from './SearchStack';
import { TripStack } from './TripStack';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
/**
 * 탭 아이콘.
 *
 * 처음엔 의존성을 아끼려고 이모지(🔍, 🗓)를 썼는데, 컬러 이모지가 탭바에 박히면
 * 10년 전 앱처럼 보인다. 요즘 앱은 얇은 단색 라인 아이콘을 쓴다.
 * lucide는 그 계열의 사실상 표준이고, 순수 JS라 react-native-svg 하나만 네이티브다.
 */
type LucideIcon = typeof MapPinPlus;

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color }: { color: string }) {
    return <Icon color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  };
}

/**
 * 하단 탭.
 *
 * 두 탭 모두 결과물은 여행 일정이다. 차이는 장소를 누가 고르는가다.
 *   골라 담기 - 사용자가 목록에서 직접 고른다 (POST /schedule/from-places)
 *   자동 생성 - 조건만 주면 서버가 고른다 (POST /schedule)
 * 그래서 "검색 / 여행"이 아니라 방식으로 이름을 붙인다. 앞 이름은 둘 다
 * 여행이고 둘 다 검색을 포함해서 구분이 되지 않았다.
 *
 * 목업은 홈·검색·여행·My 네 개지만 두 개만 둔다. 홈은 축제/날씨 API가, My는
 * 인증이 없어서 지금 만들면 눌러도 빈 화면이 나온다 — 고장처럼 보인다.
 * API가 생기면 여기에 추가한다.
 */
export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // 흰 탭 바 위 전경색(아이콘+라벨)이라 밝은 primary가 아니라
        // 대비를 통과하는 primaryDeep을 쓴다.
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ title: '골라 담기', tabBarIcon: tabIcon(MapPinPlus) }}
      />
      <Tab.Screen
        name="Trip"
        component={TripStack}
        options={{ title: '자동 생성', tabBarIcon: tabIcon(Sparkles) }}
      />
    </Tab.Navigator>
  );
}

const ICON_SIZE = 24;
/** 2는 굵어 보이고 1.5가 요즘 라인 아이콘의 기본값이다. */
const ICON_STROKE = 1.75;
/**
 * 탭 바 높이.
 *
 * react-navigation 기본값은 49dp인데, 아이콘 24 + 라벨 16이 들어가면 위아래
 * 여백이 거의 남지 않아 글자가 바닥에 붙어 보인다(실측: 라벨 하단이 탭 바
 * 하단과 같은 y). Material 권장이 56~80dp라 그 안쪽으로 올린다.
 */
const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  tabBar: {
    height: TAB_BAR_HEIGHT,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: {
    ...typography.micro,
    marginTop: spacing.xxs,
  },
});
