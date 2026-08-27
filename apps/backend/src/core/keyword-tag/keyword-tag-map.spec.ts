import { resolveTagsForKeywords, KEYWORD_TAG_MAP } from './keyword-tag-map';

describe('resolveTagsForKeywords', () => {
  it('알려진 키워드는 매핑 테이블에 정의된 태그를 그대로 반환한다', () => {
    expect(resolveTagsForKeywords(['바다'])).toEqual(KEYWORD_TAG_MAP['바다']);
  });

  it('여러 키워드의 태그가 겹치면 중복 없이 합쳐진다', () => {
    // '산'과 '자연' 둘 다 '자연' 태그를 포함
    expect(KEYWORD_TAG_MAP['산']).toContain('자연');
    expect(KEYWORD_TAG_MAP['자연']).toContain('자연');

    const result = resolveTagsForKeywords(['산', '자연']);
    const natureCount = result.filter((t) => t === '자연').length;
    expect(natureCount).toBe(1);
  });

  it('매핑에 없는 키워드는 빈 배열로 취급하고 에러를 던지지 않는다', () => {
    expect(resolveTagsForKeywords(['존재하지않는키워드'])).toEqual([]);
  });

  it('빈 입력은 빈 배열을 반환한다', () => {
    expect(resolveTagsForKeywords([])).toEqual([]);
  });
});
