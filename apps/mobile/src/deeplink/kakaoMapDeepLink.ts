import { Linking } from 'react-native';
import { TravelMode } from '../api/types';
import { MapMarker } from '../map/types';

const MAX_WAYPOINTS = 5;

/**
 * 카카오맵 스킴의 `by` 값.
 *
 * 우리 어휘(TravelMode)와 철자가 다르다 — 공식 문서는 소문자
 * 'car' | 'publictransit' | 'foot' | 'bicycle'을 쓴다. 특히 걷기는 'walk'가
 * 아니라 'foot'이다. 앱 안에서는 백엔드와 같은 어휘 하나만 쓰고,
 * 카카오 철자는 이 경계에서만 변환한다.
 * https://apis.map.kakao.com/android_v2/docs/api-guide/urlscheme/
 */
const KAKAO_TRAVEL_MODE: Record<TravelMode, string> = {
  CAR: 'car',
  TRANSIT: 'publictransit',
  WALK: 'foot',
};

function routeQuery(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[],
  mode: TravelMode,
): string {
  const params = [
    `sp=${start.lat},${start.lng}`,
    `ep=${end.lat},${end.lng}`,
    `by=${KAKAO_TRAVEL_MODE[mode]}`,
  ];

  waypoints.slice(0, MAX_WAYPOINTS).forEach((wp, index) => {
    params.push(`vp${index + 1}=${wp.lat},${wp.lng}`);
  });

  return params.join('&');
}

/**
 * 카카오맵 길찾기 딥링크. 경유지 최대 5개.
 * kakaomap://route?sp=...&ep=...&vp1=...&by=car
 */
export function buildKakaoMapRouteUrl(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[] = [],
  mode: TravelMode = 'CAR',
): string {
  return `kakaomap://route?${routeQuery(start, end, waypoints, mode)}`;
}

/** 앱이 없을 때 쓰는 모바일 웹 길찾기. 같은 파라미터를 받는다. */
export function buildKakaoMapWebRouteUrl(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[] = [],
  mode: TravelMode = 'CAR',
): string {
  return `https://m.map.kakao.com/scheme/route?${routeQuery(start, end, waypoints, mode)}`;
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
 * 앱 스킴을 열어 보고, 처리할 앱이 없으면 모바일 웹 지도로 넘어간다.
 *
 * canOpenURL로 분기하지 않는 이유: Android 11+는 패키지 가시성 제한이 있어
 * AndroidManifest에 <queries>를 선언하지 않으면 카카오맵이 설치돼 있어도
 * false를 반환한다(iOS는 LSApplicationQueriesSchemes가 필요하다). 둘 다 지금
 * 없어서, canOpenURL을 쓰면 설치한 사용자까지 폴백으로 보내게 된다.
 * 열어 보고 실패하면 웹으로 가는 방식은 네이티브 설정 없이 양쪽에서 옳게 동작한다.
 */
async function openAppOrWeb(appUrl: string, webUrl: string): Promise<void> {
  try {
    await Linking.openURL(appUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export function openKakaoMapRoute(
  start: MapMarker,
  end: MapMarker,
  waypoints: MapMarker[] = [],
  mode: TravelMode = 'CAR',
): Promise<void> {
  return openAppOrWeb(
    buildKakaoMapRouteUrl(start, end, waypoints, mode),
    buildKakaoMapWebRouteUrl(start, end, waypoints, mode),
  );
}

export function openKakaoMapPlace(place: MapMarker): Promise<void> {
  return openAppOrWeb(
    buildKakaoMapPlaceUrl(place),
    buildKakaoMapWebPlaceUrl(place),
  );
}
