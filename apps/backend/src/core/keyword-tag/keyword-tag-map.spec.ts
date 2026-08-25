import { resolveTagsForKeywords, KEYWORD_TAG_MAP } from './keyword-tag-map';

describe('resolveTagsForKeywords', () => {
  it('알려진 키워드는 매핑 테이블에 정의된 태그를 그대로 반환한다', () => {
    expect(resolveTagsForKeywords(['바다'])).toEqual(KEYWORD_TAG_MAP['바다']);
  });

  it('여러 키워드의 태그가 겹치면 중복 없이 합쳐진다', () => {
    // '바다'와 '데이트' 둘 다 '뷰맛집' 태그를 포함
    expect(KEYWORD_TAG_MAP['바다']).toContain('뷰맛집');
    expect(KEYWORD_TAG_MAP['데이트']).toContain('뷰맛집');

    const result = resolveTagsForKeywords(['바다', '데이트']);
    const viewMatjipCount = result.filter((t) => t === '뷰맛집').length;
    expect(viewMatjipCount).toBe(1);
  });

  it('매핑에 없는 키워드는 빈 배열로 취급하고 에러를 던지지 않는다', () => {
    expect(resolveTagsForKeywords(['존재하지않는키워드'])).toEqual([]);
  });

  it('빈 입력은 빈 배열을 반환한다', () => {
    expect(resolveTagsForKeywords([])).toEqual([]);
  });
});
