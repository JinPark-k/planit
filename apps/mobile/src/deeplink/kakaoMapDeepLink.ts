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

/**
 * 카카오맵 "좌표 보기" 딥링크. 지정한 좌표에 마커를 찍고 지도를 연다.
 * kakaomap://look?p=위도,경도
 */
export function buildKakaoMapPlaceUrl(place: MapMarker): string {
  return `kakaomap://look?p=${place.lat},${place.lng}`;
}

/**
 * 앱이 없을 때 쓰는 모바일 웹 지도. 카카오가 같은 기능의 웹 스킴을 제공한다.
 * 스토어로 보내는 것보다 낫다 — 설치 없이 바로 위치를 볼 수 있다.
 */
export function buildKakaoMapWebPlaceUrl(place: MapMarker): string {
  return `https://m.map.kakao.com/scheme/look?p=${place.lat},${place.lng}`;
}

/**
 * 카카오맵 앱으로 장소를 연다. 앱이 없으면 모바일 웹 지도로 넘어간다.
 *
 * canOpenURL을 쓰지 않는 이유: Android 11+는 패키지 가시성 제한이 있어
 * AndroidManifest에 <queries>를 선언하지 않으면 앱이 설치돼 있어도 false를
 * 반환한다. iOS도 LSApplicationQueriesSchemes 등록이 필요하다. 그러면 설치된
 * 사용자까지 폴백으로 보내게 된다. 그냥 열어 보고 실패하면 웹으로 가는 편이
 * 네이티브 설정 없이 양쪽에서 옳게 동작한다.
 */
export async function openKakaoMapPlace(place: MapMarker): Promise<void> {
  try {
    await Linking.openURL(buildKakaoMapPlaceUrl(place));
  } catch {
    // 앱 미설치 등으로 스킴을 처리할 수 없는 경우.
    await Linking.openURL(buildKakaoMapWebPlaceUrl(place));
  }
}
