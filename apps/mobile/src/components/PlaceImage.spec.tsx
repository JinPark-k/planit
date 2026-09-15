import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { iconSize } from '../theme';
import { PLACE_ICONS } from './placeIcon';
import { PlaceImage, PlaceImageProps } from './PlaceImage';

// place 타입이 Pick<Place, 'imageUrl' | 'category' | 'tags'>로 넓어지면서
// (빈 자리 아이콘을 고르려면 카테고리/태그가 필요하다), 기존 테스트가 쓰던
// imageUrl만 있는 place 객체는 더는 타입을 만족하지 못한다. 아이콘 판정과
// 무관한 기존 테스트에는 중립값(SIGHTSEEING, 태그 없음)을 채워 넣었을 뿐
// 검증 내용은 하나도 바꾸지 않았다.
const NEUTRAL_PLACE: Pick<PlaceImageProps['place'], 'category' | 'tags'> = {
  category: 'FOOD',
  tags: [],
};

function render(props: Partial<PlaceImageProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PlaceImage
        place={{ imageUrl: 'https://example.invalid/a.jpg', ...NEUTRAL_PLACE }}
        {...props}
      />,
    );
  });
  return tree;
}

describe('PlaceImage', () => {
  it('imageUrl이 있으면 Image를 그린다', () => {
    const tree = render({
      place: { imageUrl: 'https://example.invalid/a.jpg', ...NEUTRAL_PLACE },
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it('imageUrl이 없으면 Image를 그리지 않는다', () => {
    const tree = render({ place: { imageUrl: undefined, ...NEUTRAL_PLACE } });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it('emptyLabel을 주면 문구를 그린다', () => {
    const tree = render({
      place: { imageUrl: undefined, ...NEUTRAL_PLACE },
      emptyLabel: '사진 없음',
    });
    expect(tree.root.findByType(Text).props.children).toBe('사진 없음');
  });

  it('emptyLabel이 없으면 문구를 그리지 않는다', () => {
    const tree = render({ place: { imageUrl: undefined, ...NEUTRAL_PLACE } });
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
  });

  it('사진이 있으면 emptyStyle이 적용되지 않는다', () => {
    const emptyStyle = { height: 160 };
    const tree = render({
      place: { imageUrl: 'https://example.invalid/a.jpg', ...NEUTRAL_PLACE },
      emptyStyle,
    });
    const image = tree.root.findByType(Image);
    const style = image.props.style;
    const flat = Object.assign(
      {},
      ...(Array.isArray(style) ? style : [style]).filter(
        s => s && typeof s === 'object',
      ),
    );
    expect(flat.height).toBeUndefined();
  });

  // 상세 화면은 style(aspectRatio 4/3)과 emptyStyle(height 160)을 함께 넘긴다.
  // Yoga는 width와 height가 둘 다 정해지면 aspectRatio를 무시하므로 빈 자리는
  // 4:3이 아니라 160으로 그려진다 — 문서에만 있는 규칙이라 여기서 고정해 둔다.
  it('빈 상태에서 emptyStyle이 style보다 뒤에 온다', () => {
    const tree = render({
      place: { imageUrl: undefined, ...NEUTRAL_PLACE },
      style: { width: '100%', aspectRatio: 4 / 3 },
      emptyStyle: { width: '100%', height: 160 },
    });
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.height).toBe(160);
    expect(flat.aspectRatio).toBe(4 / 3);
  });

  it('카페 태그면 커피 아이콘을 그린다', () => {
    const tree = render({
      place: { imageUrl: undefined, category: 'FOOD', tags: ['카페'] },
    });
    expect(tree.root.findAllByType(PLACE_ICONS.cafe)).toHaveLength(1);
  });

  it('size가 아이콘 크기만 바꾼다', () => {
    const thumb = render({
      place: { imageUrl: undefined, ...NEUTRAL_PLACE },
      size: 'thumb',
    });
    const hero = render({
      place: { imageUrl: undefined, ...NEUTRAL_PLACE },
      size: 'hero',
    });
    const thumbIcon = thumb.root.findByType(PLACE_ICONS.food);
    const heroIcon = hero.root.findByType(PLACE_ICONS.food);
    expect(thumbIcon.props.size).toBe(iconSize.lg);
    expect(heroIcon.props.size).toBe(iconSize.xl);
  });

  it('emptyLabel이 없으면 접근성 트리에서 숨긴다', () => {
    const tree = render({ place: { imageUrl: undefined, ...NEUTRAL_PLACE } });
    const empty = tree.root.findByType(View);
    expect(empty.props.accessibilityElementsHidden).toBe(true);
    expect(empty.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });
});
