import { Linking } from 'react-native';
import {
  buildKakaoMapPlaceUrl,
  buildKakaoMapRouteUrl,
  buildKakaoMapWebPlaceUrl,
  buildKakaoMapWebRouteUrl,
  openKakaoMapPlace,
  openKakaoMapRoute,
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

const 성산일출봉: MapMarker = {
  id: '2',
  name: '성산일출봉',
  lat: 33.4581,
  lng: 126.9425,
};

describe('buildKakaoMapRouteUrl', () => {
  it('이동수단을 카카오 철자로 변환한다', () => {
    // 우리 어휘는 CAR/TRANSIT/WALK인데 카카오는 car/publictransit/foot이다.
    // 특히 걷기는 'walk'가 아니라 'foot'이라, 그대로 넘기면 무시된다.
    const by = (mode: 'CAR' | 'TRANSIT' | 'WALK') =>
      buildKakaoMapRouteUrl(카페동백, 성산일출봉, [], mode).split('by=')[1];

    expect(by('CAR')).toBe('car');
    expect(by('TRANSIT')).toBe('publictransit');
    expect(by('WALK')).toBe('foot');
  });

  it('출발지·도착지를 위도,경도 순으로 싣는다', () => {
    const url = buildKakaoMapRouteUrl(카페동백, 성산일출봉);
    expect(url).toBe(
      'kakaomap://route?sp=33.5407,126.6706&ep=33.4581,126.9425&by=car',
    );
  });

  it('경유지는 vp1부터 번호를 붙인다', () => {
    const url = buildKakaoMapRouteUrl(카페동백, 성산일출봉, [성산일출봉]);
    expect(url).toContain('vp1=33.4581,126.9425');
  });

  it('경유지가 5개를 넘으면 버린다', () => {
    // 카카오 스킴이 vp5까지만 받는다.
    const many = Array.from({ length: 8 }, () => 성산일출봉);
    const url = buildKakaoMapRouteUrl(카페동백, 성산일출봉, many);
    expect(url).toContain('vp5=');
    expect(url).not.toContain('vp6=');
  });
});

describe('openKakaoMapRoute', () => {
  afterEach(() => jest.restoreAllMocks());

  it('앱이 없으면 스토어가 아니라 웹 길찾기로 넘어간다', () => {
    // 이전에는 canOpenURL로 분기해 스토어로 보냈다. Android 11+에서는
    // <queries> 선언이 없으면 설치돼 있어도 false라, 설치한 사용자까지
    // 스토어로 보내고 있었다.
    expect(buildKakaoMapWebRouteUrl(카페동백, 성산일출봉)).toBe(
      'https://m.map.kakao.com/scheme/route?sp=33.5407,126.6706&ep=33.4581,126.9425&by=car',
    );
  });

  it('앱 스킴을 먼저 시도하고 실패하면 웹으로 간다', async () => {
    const openURL = spyOpenURL()
      .mockRejectedValueOnce(new Error('no handler'))
      .mockResolvedValue(undefined as never);

    await openKakaoMapRoute(카페동백, 성산일출봉);

    expect(openURL.mock.calls[0][0]).toContain('kakaomap://route?');
    expect(openURL.mock.calls[1][0]).toContain('m.map.kakao.com/scheme/route?');
  });
});
