import Config from 'react-native-config';

// TODO: apps/mobile/.env를 생성하고 react-native-config로 주입한다.
export const KAKAO_JS_KEY: string = Config.KAKAO_JS_KEY ?? '';
export const API_BASE_URL: string = Config.API_BASE_URL ?? 'http://localhost:3000';
