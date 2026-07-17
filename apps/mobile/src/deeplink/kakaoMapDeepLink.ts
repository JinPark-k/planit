import { Linking } from 'react-native';
import { MapMarker } from '../map/types';
import { openStoreFallback } from './storeFallback';

const MAX_WAYPOINTS = 5;

/**
 * 카카오맵 길찾기 딥링크. 경유지 최대 5개.
 * kakaomap://route?sp=...&ep=...&vp1=...&by=CAR
 */
export function buildKakaoMapRouteUrl(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[] = [],
  by: 'CAR' | 'WALK' | 'PUBLICTRANSIT' = 'CAR',
): string {
  const params = [`sp=${start.lat},${start.lng}`, `ep=${end.lat},${end.lng}`, `by=${by}`];

  waypoints.slice(0, MAX_WAYPOINTS).forEach((wp, index) => {
    params.push(`vp${index + 1}=${wp.lat},${wp.lng}`);
  });

  return `kakaomap://route?${params.join('&')}`;
}

export async function openKakaoMapRoute(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[] = [],
  by: 'CAR' | 'WALK' | 'PUBLICTRANSIT' = 'CAR',
): Promise<void> {
  const url = buildKakaoMapRouteUrl(start, end, waypoints, by);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }
  await openStoreFallback('kakaomap');
}
