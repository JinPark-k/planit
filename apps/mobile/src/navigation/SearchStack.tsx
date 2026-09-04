import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { generateScheduleFromPlaces } from '../api/scheduleFromPlaces';
import { REGION_OPTIONS } from '../constants/regions';
import { PickConditionScreen } from '../screens/PickConditionScreen';
import { PickListScreen, PickListSubmit } from '../screens/PickListScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { colors } from '../theme';
import { PickSessionProvider } from './pickSession';
import { SearchStackParamList } from './types';

const Stack = createNativeStackNavigator<SearchStackParamList>();

type Props<T extends keyof SearchStackParamList> = NativeStackScreenProps<
  SearchStackParamList,
  T
>;

function PickConditionRoute({ navigation }: Props<'PickCondition'>) {
  return <PickConditionScreen onNext={() => navigation.navigate('PickList')} />;
}

function PickListRoute({ navigation }: Props<'PickList'>) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = (request: PickListSubmit) => {
    setSubmitting(true);
    setSubmitError(undefined);
    generateScheduleFromPlaces(request)
      .then(({ days, excludedPlaces }) => {
        const regionLabel =
          REGION_OPTIONS.find(option => option.code === request.region)?.label ??
          request.region;
        navigation.navigate('Schedule', { days, regionLabel, excludedPlaces });
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
      onBack={() => navigation.goBack()}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
    />
  );
}

function ScheduleRoute({ route, navigation }: Props<'Schedule'>) {
  const { days, regionLabel, excludedPlaces } = route.params;
  return (
    <ScheduleScreen
      days={days}
      regionLabel={regionLabel}
      excludedPlaces={excludedPlaces}
      // 뒤로는 담던 목록으로 돌아간다. 화면이 하나였을 때는 popToTop이 곧
      // 목록이었지만, 조건 화면이 앞에 생기면서 목록을 건너뛰게 됐다.
      onBack={() => navigation.goBack()}
      // "다시 만들기"는 처음부터라는 뜻이라 조건 화면으로 보낸다
      // (자동 생성 탭에서 폼으로 돌아가는 것과 같다).
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
      <PickSessionProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PickCondition" component={PickConditionRoute} />
          <Stack.Screen name="PickList" component={PickListRoute} />
          <Stack.Screen name="Schedule" component={ScheduleRoute} />
          <Stack.Screen name="PlaceDetail" component={PlaceDetailRoute} />
        </Stack.Navigator>
      </PickSessionProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
