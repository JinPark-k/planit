import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { HomeStack } from './HomeStack';
import { SavedTripsStack } from './SavedTripsStack';
import { SearchStack } from './SearchStack';
import { stackToPopToTop } from './tabReset';
import { TripStack } from './TripStack';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS = {
  home: require('../assets/tab-home-plane.png'),
  pick: require('../assets/tab-pick.png'),
  auto: require('../assets/tab-auto.png'),
  saved: require('../assets/tab-saved.png'),
} satisfies Record<string, ImageSourcePropType>;

/**
 * 스플래시의 크레용 질감을 이어받은 PLANIT 전용 탭 아이콘이다.
 * 선택된 탭은 원래 보라·라임 색을 보여 주고, 나머지는 한 가지 회색으로 낮춘다.
 */
function tabIcon(source: ImageSourcePropType) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return (
      <Image
        source={source}
        resizeMode="contain"
        style={[styles.tabIcon, !focused && styles.tabIconInactive]}
      />
    );
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
 * 홈은 그 둘과 결이 다르다. 조건을 입력하는 대신 지금 열리는 축제를 보여주고
 * 거기서 여행을 시작한다. 제안서가 말한 "축제를 앵커로 삼는" 진입점이라
 * 첫 탭에 둔다.
 *
 * 내 여행은 인증 없이 기기에 보관한 일정을 다시 보여 준다.
 */
export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
      // 탭을 떠났다 돌아온 사람은 보던 화면을 원하고, 같은 탭을 다시 누른
      // 사람은 "처음으로"를 원한다 — 재탭이 그 둘을 가르는 신호다.
      // 각 Tab.Screen에 listeners를 따로 붙이지 않고 여기 하나로 모은다.
      // 탭이 늘 때 하나씩 빠뜨리는 실수를 피하기 위해서다.
      screenListeners={({ navigation }) => ({
        tabPress: event => {
          if (!navigation.isFocused()) return;

          // route.state는 RouteProp이라 타입에 없다. navigation.getState()로
          // 탭 네비게이터의 현재 state를 직접 읽는다.
          const tabState = navigation.getState();
          const stackKey = stackToPopToTop(
            tabState.routes[tabState.index].state,
          );
          if (stackKey === undefined) return;

          // 탭 네비게이터가 쥔 navigation에 그냥 dispatch하면 액션이 부모로만
          // 올라간다. target에 자식 스택의 key를 실어야 그 스택으로 내려간다.
          navigation.dispatch({ ...StackActions.popToTop(), target: stackKey });

          // 실제로 popToTop을 dispatch했을 때만 preventDefault한다. v7의
          // useScrollToTop은 !e.defaultPrevented를 보고 스크롤 여부를
          // 정하므로, 여기서 무조건 막지 않아야 나중에 "맨 위에서 스크롤
          // 리셋"을 이 파일을 건드리지 않고 붙일 수 있다.
          event.preventDefault();
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: '홈', tabBarIcon: tabIcon(TAB_ICONS.home) }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ title: '골라 담기', tabBarIcon: tabIcon(TAB_ICONS.pick) }}
      />
      <Tab.Screen
        name="Trip"
        component={TripStack}
        options={{ title: '자동 생성', tabBarIcon: tabIcon(TAB_ICONS.auto) }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedTripsStack}
        options={{ title: '내 여행', tabBarIcon: tabIcon(TAB_ICONS.saved) }}
      />
    </Tab.Navigator>
  );
}

/**
 * 탭 바 높이.
 *
 * react-navigation 기본값은 49dp인데, 아이콘 24 + 라벨 16이 들어가면 위아래
 * 여백이 거의 남지 않아 글자가 바닥에 붙어 보인다(실측: 라벨 하단이 탭 바
 * 하단과 같은 y). Material 권장이 56~80dp라 그 안쪽으로 올린다.
 */
const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  tabIcon: {
    width: 30,
    height: 30,
  },
  tabIconInactive: {
    tintColor: colors.textMuted,
    opacity: 0.55,
  },
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
