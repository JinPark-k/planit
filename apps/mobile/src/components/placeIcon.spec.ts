import { PLACE_ICONS, placeIconKind } from './placeIcon';

describe('placeIconKind', () => {
  it('FOOD는 기본으로 food 아이콘', () => {
    expect(placeIconKind({ category: 'FOOD', tags: [] })).toBe('food');
  });

  it('ACTIVITY는 기본으로 activity 아이콘', () => {
    expect(placeIconKind({ category: 'ACTIVITY', tags: [] })).toBe(
      'activity',
    );
  });

  it('SIGHTSEEING은 기본으로 sightseeing 아이콘', () => {
    expect(placeIconKind({ category: 'SIGHTSEEING', tags: [] })).toBe(
      'sightseeing',
    );
  });

  it('카페 태그가 카테고리를 이긴다', () => {
    expect(
      placeIconKind({ category: 'FOOD', tags: ['맛집', '카페'] }),
    ).toBe('cafe');
  });

  it('축제 태그가 카페 태그도 이긴다', () => {
    expect(
      placeIconKind({ category: 'FOOD', tags: ['카페', '축제'] }),
    ).toBe('festival');
  });

  it('축제가 SIGHTSEEING으로 내려와도 축제 아이콘이다 (백엔드가 콘텐츠타입 15를 SIGHTSEEING으로 매핑)', () => {
    expect(
      placeIconKind({ category: 'SIGHTSEEING', tags: ['축제'] }),
    ).toBe('festival');
  });

  it('모르는 태그는 카테고리 판정을 바꾸지 않는다', () => {
    const withoutTags = placeIconKind({ category: 'FOOD', tags: [] });
    const withUnknownTag = placeIconKind({
      category: 'FOOD',
      tags: ['실내'],
    });
    expect(withUnknownTag).toBe(withoutTags);
  });

  it('PLACE_ICONS가 모든 kind를 덮는다', () => {
    const kinds: Array<keyof typeof PLACE_ICONS> = [
      'festival',
      'cafe',
      'food',
      'activity',
      'sightseeing',
    ];
    kinds.forEach(kind => {
      expect(PLACE_ICONS[kind]).toBeDefined();
    });
  });
});
