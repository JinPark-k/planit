import { KEYWORD_TAG_MAP } from '../core/keyword-tag/keyword-tag-map';
import { DERIVABLE_TAGS } from '../infra/tour-api/tour-api-mapping';

/**
 * core/의 키워드 태그와 infra/tour-api의 도출 가능 태그가 어긋나지 않도록 잠근다.
 *
 * 이 스펙을 core/keyword-tag/가 아니라 batch/에 두는 이유:
 * core/ 안의 스펙이 infra/를 import하면 테스트 코드라도 apps/backend/CLAUDE.md의
 * 레이어 경계(core는 데이터 소스 비의존)를 위반하기 때문이다.
 */
describe('KEYWORD_TAG_MAP <-> DERIVABLE_TAGS 정합성', () => {
  const vocabulary = new Set<string>(DERIVABLE_TAGS);

  it('모든 키워드 태그가 수집 단계에서 도출 가능한 태그다', () => {
    for (const [keyword, tags] of Object.entries(KEYWORD_TAG_MAP)) {
      for (const tag of tags) {
        // 도출 불가능한 태그는 tagMatchRatio 분모만 키워 점수를 조용히 깎는다.
        expect({ keyword, tag, derivable: vocabulary.has(tag) }).toEqual({
          keyword,
          tag,
          derivable: true,
        });
      }
    }
  });

  it('모든 도출 가능 태그가 최소 한 키워드에서 참조된다 (고아 태그 탐지)', () => {
    const referenced = new Set(Object.values(KEYWORD_TAG_MAP).flat());
    for (const tag of DERIVABLE_TAGS) {
      expect({ tag, referenced: referenced.has(tag) }).toEqual({
        tag,
        referenced: true,
      });
    }
  });

  it('각 키워드는 2~3개의 중복 없는 태그를 갖는다', () => {
    for (const [keyword, tags] of Object.entries(KEYWORD_TAG_MAP)) {
      expect({ keyword, count: tags.length >= 2 && tags.length <= 3 }).toEqual({
        keyword,
        count: true,
      });
      expect({ keyword, unique: new Set(tags).size === tags.length }).toEqual({
        keyword,
        unique: true,
      });
    }
  });
});
