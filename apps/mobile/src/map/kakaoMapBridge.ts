import { MapMarker } from './types';

export interface KakaoMapBridgeMessage {
  type: 'SET_MARKERS';
  markers: MapMarker[];
  drawRoute: boolean;
}

/** WebView.postMessage로 보낼 페이로드를 문자열로 직렬화한다. */
export function serializeBridgeMessage(message: KakaoMapBridgeMessage): string {
  return JSON.stringify(message);
}
