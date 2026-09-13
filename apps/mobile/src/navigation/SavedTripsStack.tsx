import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { SavedTripsScreen } from '../screens/SavedTripsScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { listSavedTrips } from '../storage/savedTrips';
import type { SavedTrip } from '../storage/savedTrips';
import { colors } from '../theme';
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
