/* eslint-env jest */
/**
 * react-native-config는 네이티브 모듈(BuildConfig/GeneratedDotEnv)에서 값을 읽고
 * 패키지 자체도 ESM이라, jest 환경에서는 import만 해도 깨진다.
 * src/config/env.ts가 모듈 로드 시점에 값을 읽으므로 빈 설정으로 목한다
 * (env.ts의 `?? 기본값` 경로를 타게 된다).
 */
jest.mock('react-native-config', () => ({ __esModule: true, default: {} }));
