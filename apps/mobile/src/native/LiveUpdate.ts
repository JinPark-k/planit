import { NativeModules, Platform } from 'react-native';
import { ScheduleLiveStatus } from './types';

// TODO: android/.../liveupdate/LiveUpdateModule.kt 구현 필요 (Notification.ProgressStyle, Android 16+).
const { LiveUpdateModule } = NativeModules;

export async function startLiveUpdate(status: ScheduleLiveStatus): Promise<void> {
  if (Platform.OS !== 'android' || !LiveUpdateModule) return;
  return LiveUpdateModule.start(status);
}

export async function updateLiveUpdate(status: ScheduleLiveStatus): Promise<void> {
  if (Platform.OS !== 'android' || !LiveUpdateModule) return;
  return LiveUpdateModule.update(status);
}

export async function endLiveUpdate(): Promise<void> {
  if (Platform.OS !== 'android' || !LiveUpdateModule) return;
  return LiveUpdateModule.end();
}
