/**
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootTabs } from './src/navigation/RootTabs';
import { colors } from './src/theme';
import { SplashScreen } from './src/components/SplashScreen';

/**
 * 화면이 셋일 때는 useState로 전환했지만, 탭이 생기면서 탭별 스택과 뒤로가기를
 * 손으로 관리해야 해 react-navigation으로 옮겼다. 실제로 장소 상세를 오버레이 +
 * BackHandler로 흉내 내고 있었는데, 탭이 늘면 탭마다 같은 일을 반복하게 된다.
 */
function App() {
  const [launching, setLaunching] = useState(true);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={launching}
        importantForAccessibility={launching ? 'no-hide-descendants' : 'auto'}
      >
        <NavigationContainer>
          <RootTabs />
        </NavigationContainer>
      </View>
      {launching && <SplashScreen onFinish={() => setLaunching(false)} />}
    </SafeAreaProvider>
  );
}

export default App;
