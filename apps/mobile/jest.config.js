module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // RN 프리셋 기본값은 react-native와 @react-native(-community)만 Babel로 변환한다.
  // @react-navigation과 react-native-screens는 ESM(lib/module/*.js)으로 배포돼서
  // 그대로 두면 jest가 import 구문에서 파싱에 실패한다.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-freeze)/)',
  ],
};
