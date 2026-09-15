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

  // 상세는 style에 aspectRatio 4/3, emptyStyle에 height 160을 준다. 둘을 겹치면
  // Yoga가 aspectRatio를 버리지 않아 폭이 213으로 고정되고 빈 자리가 화면 절반만
  // 찬다(실제로 그렇게 그려졌다). 그래서 갈아치운다 — 이 동작을 여기서 고정한다.
  it('빈 상태에서 emptyStyle이 style을 갈아치운다', () => {
    const tree = render({
      place: { imageUrl: undefined, ...NEUTRAL_PLACE },
      style: { width: '100%', aspectRatio: 4 / 3 },
      emptyStyle: { width: '100%', height: 160 },
    });
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.height).toBe(160);
    expect(flat.aspectRatio).toBeUndefined();
    expect(flat.width).toBe('100%');
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
    expect(empty.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('내려받기에 실패하면 사진을 내리고 아이콘을 남긴다', () => {
    const tree = render({
      place: { ...NEUTRAL_PLACE, imageUrl: 'https://example.invalid/a.jpg' },
    });
    ReactTestRenderer.act(() => {
      tree.root.findByType(Image).props.onError();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findAllByType(PLACE_ICONS.food)).toHaveLength(1);
  });

  // failedUri를 boolean으로 두면 여기서 깨진다. 목록은 같은 자리의 인스턴스에
  // 다른 장소가 흘러들기 때문에, 앞 장소의 실패가 남으면 멀쩡한 사진이 안 나온다.
  it('다른 장소로 바뀌면 앞 장소의 실패가 따라오지 않는다', () => {
    const tree = render({
      place: { ...NEUTRAL_PLACE, imageUrl: 'https://example.invalid/a.jpg' },
    });
    ReactTestRenderer.act(() => {
      tree.root.findByType(Image).props.onError();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);

    ReactTestRenderer.act(() => {
      tree.update(
        <PlaceImage
          place={{
            ...NEUTRAL_PLACE,
            imageUrl: 'https://example.invalid/b.jpg',
          }}
        />,
      );
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });
});
