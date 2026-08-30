import { Linking } from 'react-native';
import {
  buildKakaoMapPlaceUrl,
  buildKakaoMapWebPlaceUrl,
  openKakaoMapPlace,
} from './kakaoMapDeepLink';
import { MapMarker } from '../map/types';

const 카페동백: MapMarker = {
  id: '1',
  name: '카페 동백',
  lat: 33.5407,
  lng: 126.6706,
};

describe('buildKakaoMapPlaceUrl', () => {
  it('공식 문서의 look 스킴 형식으로 만든다', () => {
    // https://apis.map.kakao.com/android_v2/docs/api-guide/urlscheme/
    expect(buildKakaoMapPlaceUrl(카페동백)).toBe(
      'kakaomap://look?p=33.5407,126.6706',
    );
  });

  it('위도가 앞, 경도가 뒤다', () => {
    // TourAPI의 mapx/mapy를 뒤바꾸기 쉬운 것과 같은 실수를 여기서도 막는다.
    const url = buildKakaoMapPlaceUrl({ ...카페동백, lat: 1, lng: 2 });
    expect(url).toBe('kakaomap://look?p=1,2');
  });
});

describe('buildKakaoMapWebPlaceUrl', () => {
  it('앱 없이 열리는 모바일 웹 지도를 가리킨다', () => {
    expect(buildKakaoMapWebPlaceUrl(카페동백)).toBe(
      'https://m.map.kakao.com/scheme/look?p=33.5407,126.6706',
    );
  });

  it('https를 쓴다', () => {
    // 공식 문서는 http로 적혀 있지만 iOS ATS가 평문 http를 막는다.
    expect(buildKakaoMapWebPlaceUrl(카페동백).startsWith('https://')).toBe(true);
  });
});

/**
 * 호출 기록이 비워진 openURL 스파이.
 *
 * mockReset이 필요한 이유: RN jest 프리셋이 Linking.openURL을 이미 jest.fn으로
 * 만들어 두어서, spyOn만 하면 앞 테스트의 호출 기록이 남아 nth 단언이 밀린다.
 */
function spyOpenURL() {
  const spy = jest.spyOn(Linking, 'openURL');
  spy.mockReset();
  return spy;
}

describe('openKakaoMapPlace', () => {
  afterEach(() => jest.restoreAllMocks());

  it('앱이 있으면 앱 스킴만 연다', async () => {
    const openURL = spyOpenURL().mockResolvedValue(undefined as never);

    await openKakaoMapPlace(카페동백);

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('kakaomap://look?p=33.5407,126.6706');
  });

  it('앱이 없으면 웹 지도로 넘어간다', async () => {
    // 스토어로 보내지 않는다 — 설치 없이 바로 위치를 볼 수 있는 편이 낫다.
    const openURL = spyOpenURL()
      .mockRejectedValueOnce(new Error('no handler'))
      .mockResolvedValue(undefined as never);

    await openKakaoMapPlace(카페동백);

    expect(openURL).toHaveBeenNthCalledWith(
      1,
      'kakaomap://look?p=33.5407,126.6706',
    );
    expect(openURL).toHaveBeenNthCalledWith(
      2,
      'https://m.map.kakao.com/scheme/look?p=33.5407,126.6706',
    );
  });
});
