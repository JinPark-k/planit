import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { generateSchedule } from '../api/schedule';
import { GenerateScheduleRequest } from '../api/types';
import { REGION_OPTIONS } from '../constants/regions';
import { PlanFormScreen } from '../screens/PlanFormScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { colors } from '../theme';
import { TripStackParamList } from './types';

const Stack = createNativeStackNavigator<TripStackParamList>();

type Props<T extends keyof TripStackParamList> = NativeStackScreenProps<
  TripStackParamList,
  T
>;

/**
 * 화면 컴포넌트는 네비게이션을 모른다. 여기서 route/navigation을 화면의 props로 옮긴다.
 *
 * 이렇게 나누면 화면을 네비게이션 없이 그대로 렌더해 테스트할 수 있다
 * (기존 스펙들이 그 방식이다).
 */
function PlanFormRoute({ navigation }: Props<'PlanForm'>) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = (request: GenerateScheduleRequest) => {
    setSubmitting(true);
    setSubmitError(undefined);
    generateSchedule(request)
      .then(days => {
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
    <PlanFormScreen
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

export function TripStack() {
  return (
    // 화면들이 각자 헤더를 그리므로 라이브러리 헤더는 끈다. 대신 상태바 영역만
    // 여기서 비켜 준다(하단은 탭 바가 처리한다).
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PlanForm" component={PlanFormRoute} />
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
