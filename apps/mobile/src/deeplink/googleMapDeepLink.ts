import { Linking } from 'react-native';
import { MapMarker } from '../map/types';
import { openStoreFallback } from './storeFallback';

/**
 * 구글맵 길찾기 딥링크.
 * https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
 */
export function buildGoogleMapDeepLink(
  origin: MapMarker,
  destination: MapMarker,
  waypoints: MapMarker[] = [],
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
  });

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function openGoogleMapRoute(
  origin: MapMarker,
  destination: MapMarker,
  waypoints: MapMarker[] = [],
): Promise<void> {
  const url = buildGoogleMapDeepLink(origin, destination, waypoints);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }
  await openStoreFallback('googlemaps');
}
