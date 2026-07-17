// TODO: 실제 카카오맵 JS SDK 키(KAKAO_JS_KEY)를 config/env.ts에서 주입해 완성한다.
export function buildKakaoMapHtml(kakaoJsKey: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}"></script>
    <script>
      // TODO: 마커/직선 연결 렌더링 로직 + React Native postMessage 브리지 연동
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 8,
      });

      document.addEventListener('message', function (event) {
        // Android
        handleMessageFromReactNative(event.data);
      });
      window.addEventListener('message', function (event) {
        // iOS
        handleMessageFromReactNative(event.data);
      });

      function handleMessageFromReactNative(raw) {
        // TODO: raw(JSON string)를 파싱해 markers/drawRoute 적용
      }
    </script>
  </body>
</html>
`;
}
