module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // RN 프리셋 기본값은 react-native와 @react-native(-community)만 Babel로 변환한다.
  // @react-navigation과 react-native-screens는 ESM(lib/module/*.js)으로 배포돼서
  // 그대로 두면 jest가 import 구문에서 파싱에 실패한다.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-freeze|react-native-svg)/)',
  ],
  moduleNameMapper: {
    // lucide는 .mjs로만 ESM을 내보내는데, 프리셋의 transform이 js|ts|tsx만 잡아서
    // .mjs는 변환 시도조차 되지 않는다(transformIgnorePatterns로는 해결 안 됨).
    // 같은 패키지가 CJS 빌드도 제공하므로 테스트에서는 그쪽을 쓴다.
    '^lucide-react-native$': '<rootDir>/../../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
