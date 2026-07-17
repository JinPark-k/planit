import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { buildKakaoMapHtml } from './kakaoMap.html';
import { serializeBridgeMessage } from './kakaoMapBridge';
import { KAKAO_JS_KEY } from '../config/env';
import { KakaoMapViewProps } from './types';

/**
 * 카카오맵 JS SDK를 WebView로 감싼 지도 컴포넌트.
 * 마커 표시 + (선택) 직선 경로 연결. 실제 길찾기는 deeplink/ 모듈로 위임한다.
 */
export function KakaoMapView({ markers, drawRoute = false }: KakaoMapViewProps) {
  const webViewRef = useRef<WebView>(null);

  const html = buildKakaoMapHtml(KAKAO_JS_KEY);

  const handleLoad = () => {
    const message = serializeBridgeMessage({ type: 'SET_MARKERS', markers, drawRoute });
    webViewRef.current?.postMessage(message);
  };

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html }}
      onLoadEnd={handleLoad}
      style={styles.webview}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
