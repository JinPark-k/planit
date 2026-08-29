import { KEYWORD_TAG_MAP } from '../../core';
import { KeywordsController } from './keywords.controller';

describe('KeywordsController', () => {
  const controller = new KeywordsController();

  it('KEYWORD_TAG_MAP의 키를 그대로 내려준다', () => {
    expect(controller.list()).toEqual({
      keywords: Object.keys(KEYWORD_TAG_MAP),
    });
  });

  it('빈 목록이 아니고 중복이 없다', () => {
    const { keywords } = controller.list();
    expect(keywords.length).toBeGreaterThan(0);
    expect(new Set(keywords).size).toBe(keywords.length);
  });
});
