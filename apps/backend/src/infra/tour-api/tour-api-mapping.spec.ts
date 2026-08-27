import {
  CAT1_TAG_MAP,
  CAT2_TAG_MAP,
  CAT3_TAG_MAP,
  CONTENT_TYPE_TAG_MAP,
  DERIVABLE_TAGS,
  isMappedCat3,
  resolveCategory,
  resolveTags,
  TagSource,
} from './tour-api-mapping';

function src(partial: Partial<TagSource>): TagSource {
  return {
    contentTypeId: null,
    cat1: null,
    cat2: null,
    cat3: null,
    ...partial,
  };
}

describe('resolveCategory', () => {
  it('수집 대상 콘텐츠타입을 내부 카테고리로 매핑한다', () => {
    expect(resolveCategory('12')).toBe('SIGHTSEEING');
    expect(resolveCategory('14')).toBe('SIGHTSEEING');
    expect(resolveCategory('15')).toBe('SIGHTSEEING');
    expect(resolveCategory('39')).toBe('FOOD');
    expect(resolveCategory('28')).toBe('ACTIVITY');
  });

  it('미수집 타입과 빈 값은 null을 반환한다', () => {
    expect(resolveCategory('25')).toBeNull();
    expect(resolveCategory('32')).toBeNull();
    expect(resolveCategory('38')).toBeNull();
    expect(resolveCategory('')).toBeNull();
    expect(resolveCategory(null)).toBeNull();
  });
});

describe('resolveTags 우선순위', () => {
  it('cat3가 cat2/cat1을 대체한다 (병합이 아님)', () => {
    // 해수욕장: cat2(A0101)의 ['자연']이 아니라 cat3 값이 쓰여야 한다
    const tags = resolveTags(
      src({
        contentTypeId: '12',
        cat1: 'A01',
        cat2: 'A0101',
        cat3: 'A01011200',
      }),
    );
    expect(tags).toEqual(expect.arrayContaining(['자연', '해변']));
    expect(tags).not.toContain('산');
  });

  it('등록되지 않은 cat3는 cat2로 폴백한다', () => {
    const tags = resolveTags(
      src({
        contentTypeId: '12',
        cat1: 'A01',
        cat2: 'A0101',
        cat3: 'A0101ZZZZ',
      }),
    );
    expect(tags).toEqual(['자연']);
  });

  it('등록되지 않은 cat2는 cat1으로 폴백한다', () => {
    const tags = resolveTags(
      src({ contentTypeId: '12', cat1: 'A01', cat2: 'A01ZZ' }),
    );
    expect(tags).toEqual(['자연']);
  });

  it('cat3가 빈 문자열이어도 cat2로 폴백한다 (빈 문자열 회귀 가드)', () => {
    const tags = resolveTags(
      src({ contentTypeId: '12', cat1: 'A01', cat2: 'A0101', cat3: '' }),
    );
    expect(tags).toEqual(['자연']);
  });

  it('cat 코드가 전혀 없어도 콘텐츠타입 최소 태그는 붙는다', () => {
    expect(resolveTags(src({ contentTypeId: '15' }))).toEqual(['축제']);
    expect(resolveTags(src({ contentTypeId: '28' }))).toEqual(
      expect.arrayContaining(['액티비티', '레저']),
    );
  });

  it('cat 코드도 콘텐츠타입 태그도 없으면 빈 배열이다', () => {
    expect(resolveTags(src({ contentTypeId: '12' }))).toEqual([]);
  });
});

describe('resolveTags 음식점 세분화', () => {
  it('카페는 맛집 태그를 갖지 않는다', () => {
    const tags = resolveTags(
      src({
        contentTypeId: '39',
        cat1: 'A05',
        cat2: 'A0502',
        cat3: 'A05020900',
      }),
    );
    expect(tags).toContain('카페');
    expect(tags).toContain('디저트');
    expect(tags).not.toContain('맛집');
  });

  it('한식은 맛집과 한식 태그를 모두 갖는다', () => {
    const tags = resolveTags(
      src({
        contentTypeId: '39',
        cat1: 'A05',
        cat2: 'A0502',
        cat3: 'A05020100',
      }),
    );
    expect(tags).toEqual(expect.arrayContaining(['맛집', '한식']));
  });
});

describe('resolveTags 출력 형태', () => {
  it('결과에 중복 태그가 없다', () => {
    // 문화시설 콘텐츠타입('문화')과 cat3(A02060100: 문화 포함)이 겹치는 케이스
    const tags = resolveTags(
      src({
        contentTypeId: '14',
        cat1: 'A02',
        cat2: 'A0206',
        cat3: 'A02060100',
      }),
    );
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('문화');
  });
});

describe('매핑 테이블 무결성 가드', () => {
  const allMaps = [
    CONTENT_TYPE_TAG_MAP,
    CAT1_TAG_MAP,
    CAT2_TAG_MAP,
    CAT3_TAG_MAP,
  ];

  it('모든 매핑 값이 DERIVABLE_TAGS 안에 있다', () => {
    const vocabulary = new Set<string>(DERIVABLE_TAGS);
    for (const map of allMaps) {
      for (const [code, tags] of Object.entries(map)) {
        for (const tag of tags) {
          expect({ code, tag, inVocabulary: vocabulary.has(tag) }).toEqual({
            code,
            tag,
            inVocabulary: true,
          });
        }
      }
    }
  });

  it('각 매핑 항목 안에 중복 태그가 없다', () => {
    for (const map of allMaps) {
      for (const [code, tags] of Object.entries(map)) {
        expect({ code, unique: new Set(tags).size === tags.length }).toEqual({
          code,
          unique: true,
        });
      }
    }
  });

  it('cat2 키는 5자이고 상위 cat1이 존재한다', () => {
    for (const code of Object.keys(CAT2_TAG_MAP)) {
      expect({ code, len: code.length }).toEqual({ code, len: 5 });
      expect({ code, hasParent: code.slice(0, 3) in CAT1_TAG_MAP }).toEqual({
        code,
        hasParent: true,
      });
    }
  });

  it('cat3 키는 9자이고 상위 cat2가 존재한다 (긴 테이블 오타 탐지)', () => {
    for (const code of Object.keys(CAT3_TAG_MAP)) {
      expect({ code, len: code.length }).toEqual({ code, len: 9 });
      expect({ code, hasParent: code.slice(0, 5) in CAT2_TAG_MAP }).toEqual({
        code,
        hasParent: true,
      });
    }
  });
});

describe('isMappedCat3', () => {
  it('등록된 코드만 true를 반환한다', () => {
    expect(isMappedCat3('A01011200')).toBe(true);
    expect(isMappedCat3('A0101ZZZZ')).toBe(false);
    expect(isMappedCat3('')).toBe(false);
    expect(isMappedCat3(null)).toBe(false);
  });
});
