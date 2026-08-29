import {
  CONTENT_TYPE_TAG_MAP,
  DERIVABLE_TAGS,
  isExcludedLcls2,
  isUnmappedLcls,
  LCLS2_TAG_MAP,
  LCLS3_TAG_MAP,
  resolveCategory,
  resolveTags,
  TagSource,
} from './tour-api-mapping';

function src(partial: Partial<TagSource>): TagSource {
  return {
    contentTypeId: null,
    lclsSystm2: null,
    lclsSystm3: null,
    ...partial,
  };
}

describe('resolveCategory', () => {
  it('수집 대상 콘텐츠타입을 내부 카테고리로 매핑한다', () => {
    expect(resolveCategory('12')).toBe('SIGHTSEEING');
    expect(resolveCategory('14')).toBe('SIGHTSEEING');
    expect(resolveCategory('15')).toBe('SIGHTSEEING');
    expect(resolveCategory('28')).toBe('ACTIVITY');
    expect(resolveCategory('39')).toBe('FOOD');
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
  it('lclsSystm3가 lclsSystm2를 대체한다 (병합이 아님)', () => {
    // 해변(NA020900)은 NA02 기본값 ['자연','산책']이 아니라 ['자연','해변']이어야 한다.
    const tags = resolveTags(
      src({ contentTypeId: '12', lclsSystm2: 'NA02', lclsSystm3: 'NA020900' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['자연', '해변']));
    expect(tags).not.toContain('산책');
  });

  it('등록되지 않은 lclsSystm3는 lclsSystm2로 폴백한다', () => {
    const tags = resolveTags(
      src({ contentTypeId: '12', lclsSystm2: 'NA01', lclsSystm3: 'NA019999' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['자연', '산']));
  });

  it('lclsSystm3가 빈 문자열이어도 lclsSystm2로 폴백한다 (빈 문자열 회귀 가드)', () => {
    // ''는 falsy지만 null이 아니라 ?? 체인만으로는 안 걸러진다.
    const tags = resolveTags(
      src({ contentTypeId: '12', lclsSystm2: 'NA01', lclsSystm3: '' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['자연', '산']));
  });

  it('분류체계 코드가 없으면 콘텐츠타입 최소 태그만 남는다', () => {
    expect(resolveTags(src({ contentTypeId: '15' }))).toEqual(['축제']);
    expect(resolveTags(src({ contentTypeId: '28' }))).toEqual(
      expect.arrayContaining(['액티비티', '레저']),
    );
    // 12/39는 콘텐츠타입만으로 단정할 수 없어 비워둔다.
    expect(resolveTags(src({ contentTypeId: '12' }))).toEqual([]);
  });
});

describe('resolveTags 음식점 세분화', () => {
  it('카페는 맛집 태그를 갖지 않는다', () => {
    const tags = resolveTags(
      src({ contentTypeId: '39', lclsSystm2: 'FD05', lclsSystm3: 'FD050100' }),
    );
    expect(tags).toContain('카페');
    expect(tags).toContain('디저트');
    expect(tags).not.toContain('맛집');
  });

  it('한식은 맛집과 한식 태그를 모두 갖는다', () => {
    const tags = resolveTags(
      src({ contentTypeId: '39', lclsSystm2: 'FD01', lclsSystm3: 'FD010100' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['맛집', '한식']));
  });
});

describe('resolveTags 출력 형태', () => {
  it('결과에 중복 태그가 없다', () => {
    // 문화시설 콘텐츠타입('문화')과 VE07('문화' 포함)이 겹치는 케이스
    const tags = resolveTags(
      src({ contentTypeId: '14', lclsSystm2: 'VE07', lclsSystm3: 'VE070100' }),
    );
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('문화');
  });
});

describe('실제 응답 회귀 케이스', () => {
  it('새별오름처럼 분류체계만 있는 레코드도 태그가 붙는다', () => {
    // contentid=572973의 실제 응답: cat1~3가 없고 lclsSystm만 채워져 있다.
    // 이 경우 태그가 하나도 안 붙던 것이 원래 버그였다.
    const tags = resolveTags(
      src({ contentTypeId: '12', lclsSystm2: 'NA01', lclsSystm3: 'NA010100' }),
    );
    expect(tags).toEqual(expect.arrayContaining(['자연', '산', '등산']));
  });

  it('캠핑(AC05)은 태그 매핑 대상이 아니다', () => {
    // 숙박이라 수집 단계에서 제외한다(isExcludedLcls2). 매핑을 남겨두면
    // 제외 로직이 빠졌을 때 조용히 ACTIVITY로 배치되므로 의도적으로 비운다.
    expect(LCLS2_TAG_MAP.AC05).toBeUndefined();
    expect(isExcludedLcls2('AC05')).toBe(true);
    expect(isExcludedLcls2('LS01')).toBe(false);
    expect(isExcludedLcls2(null)).toBe(false);
  });
});

describe('매핑 테이블 무결성 가드', () => {
  const allMaps = [CONTENT_TYPE_TAG_MAP, LCLS2_TAG_MAP, LCLS3_TAG_MAP];

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

  it('lclsSystm2 키는 대문자 2자 + 숫자 2자다', () => {
    for (const code of Object.keys(LCLS2_TAG_MAP)) {
      expect(code).toMatch(/^[A-Z]{2}\d{2}$/);
    }
  });

  it('lclsSystm3 키는 대문자 2자 + 숫자 6자이고 상위 중분류가 존재한다', () => {
    // 상위가 없으면 오타이거나 중분류 매핑을 빠뜨린 것이다(긴 테이블 오타 탐지).
    for (const code of Object.keys(LCLS3_TAG_MAP)) {
      expect(code).toMatch(/^[A-Z]{2}\d{6}$/);
      expect({ code, parent: code.slice(0, 4) in LCLS2_TAG_MAP }).toEqual({
        code,
        parent: true,
      });
    }
  });

  it('제외 대상 분류에는 태그 매핑이 없다', () => {
    for (const code of Object.keys(LCLS2_TAG_MAP)) {
      expect(isExcludedLcls2(code)).toBe(false);
    }
  });
});

describe('isUnmappedLcls', () => {
  it('중분류 기본값이 있으면 미매핑이 아니다', () => {
    // 소분류 오버라이드가 없어도 중분류가 태그를 주면 문제가 아니다.
    expect(isUnmappedLcls('FD01', 'FD010100')).toBe(false);
    expect(isUnmappedLcls('NA02', 'NA020900')).toBe(false);
    expect(isUnmappedLcls('NA01', 'NA019999')).toBe(false);
  });

  it('중분류까지 매핑이 없으면 미매핑이다', () => {
    expect(isUnmappedLcls('VE11', 'VE110100')).toBe(true); // 교통시설(의도적 미매핑)
    expect(isUnmappedLcls('ZZ99', 'ZZ990000')).toBe(true);
    expect(isUnmappedLcls(null, null)).toBe(true);
  });
});
