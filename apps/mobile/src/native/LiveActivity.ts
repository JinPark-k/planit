import { NativeModules, Platform } from 'react-native';
import { LiveTripCapability, LiveTripPlan } from './types';

// TODO: ios/Mobile/LiveActivity/LiveActivityModule.swift 구현 + Widget Extension 타겟 추가 필요.
const { LiveActivityModule } = NativeModules;

function isSupported(): boolean {
  return Platform.OS === 'ios' && !!LiveActivityModule;
}

export async function start(plan: LiveTripPlan): Promise<void> {
  if (!isSupported()) return;
  return LiveActivityModule.start(plan);
}

export async function refresh(): Promise<void> {
  if (!isSupported()) return;
  return LiveActivityModule.refresh();
}

export async function end(): Promise<void> {
  if (!isSupported()) return;
  return LiveActivityModule.end();
}

export async function getCapability(): Promise<LiveTripCapability> {
  if (!isSupported()) {
    return { supported: false, allowed: false, statusBar: false, reason: 'UNAVAILABLE' };
  }
  return LiveActivityModule.getCapability();
}

/** iOS에는 "승격" 개념이 없다(Live Activity 자체가 잠금화면 표면이다). no-op. */
export async function openPromotionSettings(): Promise<void> {
  return;
}

/** iOS에는 승격 개념이 없어 진단할 것도 없다. */
export async function getDiagnostics(): Promise<Record<string, unknown>> {
  return {};
}
