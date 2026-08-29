/**
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { generateSchedule } from './src/api/schedule';
import {
  GenerateScheduleRequest,
  ScheduleDay,
  ScheduleItem,
} from './src/api/types';
import { REGION_OPTIONS } from './src/constants/regions';
import { PlaceDetailScreen } from './src/screens/PlaceDetailScreen';
import { PlanFormScreen } from './src/screens/PlanFormScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { colors } from './src/theme/colors';

interface ScheduleResult {
  days: ScheduleDay[];
  regionLabel: string;
}

/** 상세로 넘어간 장소. 일차는 ScheduleItem에 없어서 같이 들고 다닌다. */
interface SelectedPlace {
  item: ScheduleItem;
  day: number;
}

/**
 * 화면이 셋뿐이라 네비게이션 라이브러리 없이 상태로 전환한다.
 * react-navigation은 react-native-screens 같은 네이티브 의존성을 더 붙여
 * 빌드 라운드를 한 번 더 돌아야 한다. 화면이 늘면 여기만 교체하면 된다.
 */
function App() {
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
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
        setResult({ days, regionLabel });
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

  // 일정 화면을 떠날 때 상세도 같이 닫는다. 남겨 두면 다음 일정에서 이전 장소가 떠 있다.
  const handleLeaveSchedule = () => {
    setSelected(null);
    setResult(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {result === null ? (
            <PlanFormScreen
              onSubmit={handleSubmit}
              submitting={submitting}
              submitError={submitError}
            />
          ) : (
            // 상세를 일정 위에 겹쳐 띄운다. 교체하면 ScheduleScreen이 언마운트돼
            // 보고 있던 탭과 스크롤 위치가 날아간다(5번째 장소를 보고 돌아오면 맨 위).
            <>
              <ScheduleScreen
                days={result.days}
                regionLabel={result.regionLabel}
                onBack={handleLeaveSchedule}
                onRestart={handleLeaveSchedule}
                onSelectPlace={(item, day) => setSelected({ item, day })}
              />
              {selected !== null && (
                <View style={StyleSheet.absoluteFill}>
                  <PlaceDetailScreen
                    place={selected.item.place}
                    visit={{
                      day: selected.day,
                      startTime: selected.item.startTime,
                      stayMinutes: selected.item.stayMinutes,
                    }}
                    onBack={() => setSelected(null)}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
