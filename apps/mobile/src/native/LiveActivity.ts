import { NativeModules, Platform } from 'react-native';
import { ScheduleLiveStatus } from './types';

// TODO: ios/Mobile/LiveActivity/LiveActivityModule.swift 구현 + Widget Extension 타겟 추가 필요.
const { LiveActivityModule } = NativeModules;

export async function startLiveActivity(status: ScheduleLiveStatus): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  return LiveActivityModule.start(status);
}

export async function updateLiveActivity(status: ScheduleLiveStatus): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  return LiveActivityModule.update(status);
}

export async function endLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  return LiveActivityModule.end();
}
