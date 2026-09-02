import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { generateScheduleFromPlaces } from '../api/scheduleFromPlaces';
import { REGION_OPTIONS } from '../constants/regions';
import { PickListScreen, PickListSubmit } from '../screens/PickListScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { colors } from '../theme';
import { SearchStackParamList } from './types';

const Stack = createNativeStackNavigator<SearchStackParamList>();

type Props<T extends keyof SearchStackParamList> = NativeStackScreenProps<
  SearchStackParamList,
  T
>;

function PickListRoute({ navigation }: Props<'PickList'>) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = (request: PickListSubmit) => {
    setSubmitting(true);
    setSubmitError(undefined);
    generateScheduleFromPlaces(request)
      .then(({ days }) => {
        const regionLabel =
          REGION_OPTIONS.find(option => option.code === request.region)?.label ??
          request.region;
        navigation.navigate('Schedule', { days, regionLabel });
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
    <PickListScreen
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  );
}

function ScheduleRoute({ route, navigation }: Props<'Schedule'>) {
  const { days, regionLabel } = route.params;
  return (
    <ScheduleScreen
      days={days}
      regionLabel={regionLabel}
      onBack={() => navigation.popToTop()}
      onRestart={() => navigation.popToTop()}
      onSelectPlace={(item, day) =>
        navigation.navigate('PlaceDetail', {
          place: item.place,
          visit: {
            day,
            startTime: item.startTime,
            stayMinutes: item.stayMinutes,
          },
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

export function SearchStack() {
  return (
    // TripStack과 같은 이유로 상태바 영역만 비켜 준다(하단은 탭 바가 처리한다).
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PickList" component={PickListRoute} />
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
