import { Linking, Platform } from 'react-native';

type MapApp = 'kakaomap' | 'googlemaps';

// TODO: 실제 App Store/Play Store ID로 교체
const STORE_URLS: Record<MapApp, { ios: string; android: string }> = {
  kakaomap: {
    ios: 'https://apps.apple.com/app/id304608425',
    android: 'market://details?id=net.daum.android.map',
  },
  googlemaps: {
    ios: 'https://apps.apple.com/app/id585027354',
    android: 'market://details?id=com.google.android.apps.maps',
  },
};

export async function openStoreFallback(app: MapApp): Promise<void> {
  const urls = STORE_URLS[app];
  const url = Platform.OS === 'ios' ? urls.ios : urls.android;
  await Linking.openURL(url);
}
