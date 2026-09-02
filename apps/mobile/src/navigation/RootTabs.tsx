import React from 'react';
import { StyleSheet, Text } from 'react-native';
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
 * 탭 아이콘. 아이콘 라이브러리를 더 붙이지 않으려고 글리프를 쓴다.
 * 앱에서 이미 ←, › 같은 글리프를 쓰고 있어 결이 어긋나지 않는다.
 */
function tabIcon(glyph: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={[styles.icon, { color }]}>{glyph}</Text>;
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
        options={{ title: '검색', tabBarIcon: tabIcon('🔍') }}
      />
      <Tab.Screen
        name="Trip"
        component={TripStack}
        options={{ title: '여행', tabBarIcon: tabIcon('🗓') }}
      />
    </Tab.Navigator>
  );
}

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
  icon: {
    fontSize: 20,
  },
});
