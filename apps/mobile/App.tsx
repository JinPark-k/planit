/**
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { generateSchedule } from './src/api/schedule';
import { GenerateScheduleRequest, ScheduleDay } from './src/api/types';
import { REGION_OPTIONS } from './src/constants/regions';
import { PlanFormScreen } from './src/screens/PlanFormScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { colors } from './src/theme/colors';

interface ScheduleResult {
  days: ScheduleDay[];
  regionLabel: string;
}

/**
 * 화면이 둘뿐이라 네비게이션 라이브러리 없이 상태로 전환한다.
 * react-navigation은 react-native-screens 같은 네이티브 의존성을 더 붙여
 * 빌드 라운드를 한 번 더 돌아야 한다. 화면이 늘면 여기만 교체하면 된다.
 */
function App() {
  const [result, setResult] = useState<ScheduleResult | null>(null);
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
            <ScheduleScreen
              days={result.days}
              regionLabel={result.regionLabel}
              onBack={() => setResult(null)}
              onRestart={() => setResult(null)}
            />
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
