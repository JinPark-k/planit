import React from 'react';
import { StyleSheet } from 'react-native';
import { Luggage, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchHomeScreen } from '../screens/SearchHomeScreen';
import { colors, typography } from '../theme';
import { TripStack } from './TripStack';
import { RootTabParamList, SearchStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const SearchStackNavigator = createNativeStackNavigator<SearchStackParamList>();

function SearchStack() {
  return (
    <SafeAreaView style={styles.stackContainer} edges={['top']}>
      <SearchStackNavigator.Navigator screenOptions={{ headerShown: false }}>
        <SearchStackNavigator.Screen
          name="SearchHome"
          component={SearchHomeScreen}
        />
      </SearchStackNavigator.Navigator>
    </SafeAreaView>
  );
}

/**
 * 탭 아이콘.
 *
 * 처음엔 의존성을 아끼려고 이모지(🔍, 🗓)를 썼는데, 컬러 이모지가 탭바에 박히면
 * 10년 전 앱처럼 보인다. 요즘 앱은 얇은 단색 라인 아이콘을 쓴다.
 * lucide는 그 계열의 사실상 표준이고, 순수 JS라 react-native-svg 하나만 네이티브다.
 */
type LucideIcon = typeof Search;

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color }: { color: string }) {
    return <Icon color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  };
}

/**
 * 하단 탭.
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ title: '검색', tabBarIcon: tabIcon(Search) }}
      />
      <Tab.Screen
        name="Trip"
        component={TripStack}
        options={{ title: '여행', tabBarIcon: tabIcon(Luggage) }}
      />
    </Tab.Navigator>
  );
}

const ICON_SIZE = 24;
/** 2는 굵어 보이고 1.5가 요즘 라인 아이콘의 기본값이다. */
const ICON_STROKE = 1.75;

const styles = StyleSheet.create({
  stackContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: {
    ...typography.micro,
  },
});
