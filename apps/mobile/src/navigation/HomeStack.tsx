import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { generateScheduleFromPlaces } from '../api/scheduleFromPlaces';
import { Festival } from '../api/types';
import { REGION_OPTIONS } from '../constants/regions';
import { FestivalPlanScreen } from '../screens/FestivalPlanScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { festivalPeriod } from '../screens/festival.format';
import { colors } from '../theme';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

type Props<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>;

function HomeRoute({ navigation }: Props<'FestivalHome'>) {
  return (
    <HomeScreen
      onSelectFestival={festival =>
        navigation.navigate('FestivalPlan', { festival })
      }
    />
  );
}

function FestivalPlanRoute({ route, navigation }: Props<'FestivalPlan'>) {
  const { festival } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = (dayCount: number) => {
    setSubmitting(true);
    setSubmitError(undefined);

    // 담기 흐름과 같은 API다. 축제 하나만 담은 것과 같고, 서버가 그 축제를
    // 반드시 넣은 뒤 남는 시간을 같은 지역에서 채운다.
    generateScheduleFromPlaces({
      region: festival.region,
      placeIds: [festival.id],
      dayCount,
    })
      .then(({ days, excludedPlaces }) => {
        navigation.navigate('Schedule', {
          days,
          regionLabel: regionLabelOf(festival),
          excludedPlaces,
          anchor: {
            placeId: festival.id,
            label: `${festivalPeriod(festival)} 개최`,
          },
        });
      })
      .catch((error: unknown) => {
        setSubmitError(
          error instanceof Error
            ? error.message
            : '일정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <FestivalPlanScreen
      festival={festival}
      onBack={() => navigation.goBack()}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  );
}

function ScheduleRoute({ route, navigation }: Props<'Schedule'>) {
  const { days, regionLabel, excludedPlaces, anchor } = route.params;
  return (
    <ScheduleScreen
      days={days}
      regionLabel={regionLabel}
      excludedPlaces={excludedPlaces}
      anchor={anchor}
      onBack={() => navigation.goBack()}
      // "다시 만들기"는 처음부터라는 뜻이라 축제 목록으로 보낸다.
      onRestart={() => navigation.popToTop()}
      onSelectPlace={(item, day) =>
        navigation.navigate('PlaceDetail', {
          place: item.place,
          visit: { day, startTime: item.startTime, stayMinutes: item.stayMinutes },
        })
      }
    />
  );
}

function PlaceDetailRoute({ route, navigation }: Props<'PlaceDetail'>) {
  const { place, visit } = route.params;
  return (
    <PlaceDetailScreen
      place={place}
      visit={visit}
      onBack={() => navigation.goBack()}
    />
  );
}

function regionLabelOf(festival: Festival): string {
  return (
    REGION_OPTIONS.find(option => option.code === festival.region)?.label ??
    festival.region
  );
}

export function HomeStack() {
  return (
    // 다른 탭과 같은 이유로 상태바 영역만 비켜 준다(하단은 탭 바가 처리한다).
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FestivalHome" component={HomeRoute} />
        <Stack.Screen name="FestivalPlan" component={FestivalPlanRoute} />
        <Stack.Screen name="Schedule" component={ScheduleRoute} />
        <Stack.Screen name="PlaceDetail" component={PlaceDetailRoute} />
      </Stack.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
