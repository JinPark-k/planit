import {
  REGION_BY_DB_CODE,
  REGION_CODES,
  classifyJeonnamGwangju,
  regionFromDbRow,
} from './regions';

describe('classifyJeonnamGwangju', () => {
  it('시군구명이 "구"로 끝나면 광주로 본다', () => {
    expect(
      classifyJeonnamGwangju('전남광주통합특별시 광산구 하남산단6번로 63'),
    ).toBe('GWANGJU');
  });

  it('시군구명이 "시"/"군"이면 전남으로 본다', () => {
    expect(classifyJeonnamGwangju('전남광주통합특별시 나주시 죽림길 20')).toBe(
      'JEONNAM',
    );
    expect(classifyJeonnamGwangju('전남광주통합특별시 담양군 담양읍')).toBe(
      'JEONNAM',
    );
  });

  it('시도명만으로는 구분할 수 없다 — 반드시 시군구 토큰을 봐야 한다', () => {
    // 광주 주소도 전남과 같은 통합 시도명("전남광주통합특별시")으로 나온다.
    expect(classifyJeonnamGwangju('전남광주통합특별시')).toBe('JEONNAM');
  });

  it('addr1이 없으면 전남으로 둔다', () => {
    expect(classifyJeonnamGwangju(null)).toBe('JEONNAM');
    expect(classifyJeonnamGwangju(undefined)).toBe('JEONNAM');
  });
});

describe('regionFromDbRow', () => {
  it('공유 코드(12)는 addr1로 갈라 되돌린다', () => {
    expect(
      regionFromDbRow('12', '전남광주통합특별시 광산구 하남산단6번로 63'),
    ).toBe('GWANGJU');
    expect(regionFromDbRow('12', '전남광주통합특별시 나주시 죽림길 20')).toBe(
      'JEONNAM',
    );
  });

  it('공유되지 않는 코드는 REGION_BY_DB_CODE와 같은 결과를 준다', () => {
    expect(regionFromDbRow('39', null)).toBe('JEJU');
    expect(regionFromDbRow('39', null)).toBe(REGION_BY_DB_CODE['39']);
  });

  it('REGION_BY_DB_CODE는 공유 코드를 되돌리지 못한다(직접 쓰면 안 됨)', () => {
    expect(REGION_BY_DB_CODE[REGION_CODES.JEONNAM]).toBeUndefined();
  });

  it('알 수 없는 코드는 undefined다', () => {
    expect(regionFromDbRow('unknown', null)).toBeUndefined();
  });
});
