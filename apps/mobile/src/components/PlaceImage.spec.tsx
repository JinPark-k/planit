import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { PlaceImage, PlaceImageProps } from './PlaceImage';

function render(props: Partial<PlaceImageProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PlaceImage place={{ imageUrl: 'https://example.invalid/a.jpg' }} {...props} />,
    );
  });
  return tree;
}

describe('PlaceImage', () => {
  it('imageUrl이 있으면 Image를 그린다', () => {
    const tree = render({ place: { imageUrl: 'https://example.invalid/a.jpg' } });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it('imageUrl이 없으면 Image를 그리지 않는다', () => {
    const tree = render({ place: { imageUrl: undefined } });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it('emptyLabel을 주면 문구를 그린다', () => {
    const tree = render({ place: { imageUrl: undefined }, emptyLabel: '사진 없음' });
    expect(tree.root.findByType(Text).props.children).toBe('사진 없음');
  });

  it('emptyLabel이 없으면 문구를 그리지 않는다', () => {
    const tree = render({ place: { imageUrl: undefined } });
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
  });

  it('사진이 있으면 emptyStyle이 적용되지 않는다', () => {
    const emptyStyle = { height: 160 };
    const tree = render({
      place: { imageUrl: 'https://example.invalid/a.jpg' },
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
      place: { imageUrl: undefined },
      style: { width: '100%', aspectRatio: 4 / 3 },
      emptyStyle: { width: '100%', height: 160 },
    });
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.height).toBe(160);
    expect(flat.aspectRatio).toBe(4 / 3);
  });
});
