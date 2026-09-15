import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLiveTrip } from '../hooks/useLiveTrip';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { SavedTripsScreen } from '../screens/SavedTripsScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { TripStartScreen } from '../screens/TripStartScreen';
import { listSavedTrips } from '../storage/savedTrips';
import type { SavedTrip } from '../storage/savedTrips';
import { colors } from '../theme';
import { toDateKey } from '../trip/tripDate';
import { SavedTripsStackParamList } from './types';

const Stack = createNativeStackNavigator<SavedTripsStackParamList>();

type Props<T extends keyof SavedTripsStackParamList> = NativeStackScreenProps<
  SavedTripsStackParamList,
  T
>;

function SavedTripsHomeRoute({ navigation }: Props<'SavedTripsHome'>) {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    listSavedTrips()
      .then(setTrips)
      .catch((reason: unknown) => {
        setTrips([]);
        setError(
          reason instanceof Error
            ? reason.message
            : '저장한 여행을 불러오지 못했습니다.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SavedTripsScreen
      trips={trips}
      loading={loading}
      error={error}
      onRetry={load}
      onSelectTrip={trip => navigation.navigate('SavedSchedule', { trip })}
    />
  );
}

function SavedScheduleRoute({ route, navigation }: Props<'SavedSchedule'>) {
  const { trip } = route.params;
  const { activeTrip, frame, endTrip } = useLiveTrip();
  const isActive = activeTrip?.tripId === trip.id;

  // isActive인 동안은 항상 배너+종료 버튼 조합이 유지돼야 한다 — 사용자가 이미
  // 여행을 시작했다는 사실 자체가 "진행 중"이지, 지금 이 순간에 보여줄 프레임이
  // 있는지와는 별개다. 프레임이 없는 건 출발일이 아직 오지 않은 경우뿐이다
  // (야간 구간은 HIDE 프레임이 문구를 들고 있다).
  const liveFrame = isActive
    ? {
        title: frame?.title ?? trip.regionLabel,
        body: frame?.body ?? '아직 여행 시작 전이에요.',
      }
    : undefined;

  return (
    <ScheduleScreen
      days={trip.days}
      regionLabel={trip.regionLabel}
      onBack={() => navigation.goBack()}
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
      liveFrame={liveFrame}
      onEndTrip={isActive ? endTrip : undefined}
      onStartTrip={
        isActive ? undefined : () => navigation.navigate('TripStart', { trip })
      }
    />
  );
}

function TripStartRoute({ route, navigation }: Props<'TripStart'>) {
  const { trip } = route.params;
  const { capability, starting, error, startTrip } = useLiveTrip();
  const [value, setValue] = useState(() => toDateKey(new Date()));

  const handleConfirm = () => {
    startTrip(trip, value).then(success => {
      if (success) navigation.goBack();
    });
  };

  return (
    <TripStartScreen
      days={trip.days}
      regionLabel={trip.regionLabel}
      value={value}
      onChange={setValue}
      onConfirm={handleConfirm}
      onBack={() => navigation.goBack()}
      capability={capability}
      starting={starting}
      error={error}
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

export function SavedTripsStack() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SavedTripsHome" component={SavedTripsHomeRoute} />
        <Stack.Screen name="SavedSchedule" component={SavedScheduleRoute} />
        <Stack.Screen name="TripStart" component={TripStartRoute} />
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
