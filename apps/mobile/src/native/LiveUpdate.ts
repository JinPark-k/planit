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
