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
  // WebView<unknown>으로 인스턴스화하는 이유:
  // react-native-webview가 typings로 가리키는 루트 index.d.ts의 선언이
  //   declare class WebView<P = undefined> extends Component<WebViewProps & P>
  // 인데, 기본값 undefined 때문에 props가 `WebViewProps & undefined` = never가 된다.
  // 그 상태로는 어떤 prop도 받지 못해 JSX 전체가 타입 에러가 난다(v15에서도 동일).
  // `T & unknown = T`라 unknown을 넘기면 원래 의도한 WebViewProps가 그대로 살아난다.
  const webViewRef = useRef<WebView<unknown>>(null);

  const html = buildKakaoMapHtml(KAKAO_JS_KEY);

  const handleLoad = () => {
    const message = serializeBridgeMessage({ type: 'SET_MARKERS', markers, drawRoute });
    webViewRef.current?.postMessage(message);
  };

  return (
    <WebView<unknown>
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
