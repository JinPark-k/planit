import { localityRank, localityTier } from './locality';

describe('localityTier', () => {
  it('도 지역의 군을 지방으로 본다', () => {
    expect(localityTier('충청남도 예산군 예산읍')).toBe('RURAL');
    expect(localityTier('전북특별자치도 무주군')).toBe('RURAL');
  });

  it('도 지역의 시는 그 다음이다', () => {
    expect(localityTier('강원특별자치도 원주시')).toBe('CITY');
    expect(localityTier('경기도 수원시 팔달구')).toBe('CITY');
  });

  it('특별시·광역시는 대도시다', () => {
    expect(localityTier('서울특별시 종로구')).toBe('METRO');
    expect(localityTier('부산광역시 해운대구')).toBe('METRO');
  });

  it('잘린 시도 표기도 대도시로 읽는다', () => {
    // 실데이터에 "서울특별"처럼 잘린 값이 섞여 있다. endsWith('특별시')로
    // 판별하면 서울 축제가 지방으로 분류돼 목록 맨 앞으로 올라온다.
    expect(localityTier('서울특별 중구 세종대로')).toBe('METRO');
  });

  it('광역시 안의 군은 지방이 아니다', () => {
    // 행정 단위는 군이지만 지역 소멸 담론의 대상이 아니다. 그대로 두면
    // 대도시 축제가 목록 맨 앞을 차지한다.
    expect(localityTier('대구광역시 달성군')).toBe('METRO');
    expect(localityTier('부산광역시 기장군')).toBe('METRO');
  });

  it('통합 시도는 대도시가 아니다', () => {
    // 전남과 광주가 통합된 시도다. 이름에 광주가 들어가지만 도 단위로 다룬다.
    expect(localityTier('전남광주통합특별시 나주시')).toBe('CITY');
    expect(localityTier('전남광주통합특별시 곡성군')).toBe('RURAL');
  });

  it('주소를 읽지 못하면 중간값으로 둔다', () => {
    // 알 수 없는 것을 목록 맨 앞에 올릴 이유가 없다.
    expect(localityTier(null)).toBe('CITY');
    expect(localityTier('')).toBe('CITY');
    expect(localityTier('주소한덩어리')).toBe('CITY');
  });
});

describe('localityRank', () => {
  it('지방이 대도시보다 앞선다', () => {
    expect(localityRank('충청남도 예산군')).toBeLessThan(
      localityRank('서울특별시 종로구'),
    );
  });
});
