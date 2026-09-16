import { NativeModules, Platform } from 'react-native';
import { LiveTripCapability, LiveTripPlan } from './types';

// TODO: android/.../liveupdate/LiveUpdateModule.kt 구현 필요 (Notification.ProgressStyle, Android 16+).
const { LiveUpdateModule } = NativeModules;

function isSupported(): boolean {
  return Platform.OS === 'android' && !!LiveUpdateModule;
}

export async function start(plan: LiveTripPlan): Promise<void> {
  if (!isSupported()) return;
  return LiveUpdateModule.start(plan);
}

export async function refresh(): Promise<void> {
  if (!isSupported()) return;
  return LiveUpdateModule.refresh();
}

export async function end(): Promise<void> {
  if (!isSupported()) return;
  return LiveUpdateModule.end();
}

export async function getCapability(): Promise<LiveTripCapability> {
  if (!isSupported()) {
    return { supported: false, allowed: false, statusBar: false, reason: 'UNAVAILABLE' };
  }
  return LiveUpdateModule.getCapability();
}

/** 승격(상태바·NowBar) 설정 화면을 연다. Android 전용. */
export async function openPromotionSettings(): Promise<void> {
  if (!isSupported()) return;
  return LiveUpdateModule.openPromotionSettings();
}

/** 실기기 진단값. 케이블 없이 승격이 막힌 이유를 좁히려고 둔 것이다. */
export async function getDiagnostics(): Promise<Record<string, unknown>> {
  if (!isSupported()) return {};
  return LiveUpdateModule.getDiagnostics();
}
