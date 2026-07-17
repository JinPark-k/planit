export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface KakaoMapViewProps {
  markers: MapMarker[];
  /** true면 마커들을 순서대로 직선으로 연결해 표시한다 */
  drawRoute?: boolean;
}
