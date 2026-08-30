import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Chip, ChipProps } from './Chip';

function render(props: Partial<ChipProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Chip label="바다" {...props} />);
  });
  return tree;
}

/** onPress를 실제로 들고 있는 노드. Pressable은 memo(forwardRef)라 타입으로는 못 찾는다. */
function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(n => typeof n.props.onPress === 'function');
}

/** 텍스트에 최종 적용된 스타일을 하나로 합친다. */
function textStyle(tree: ReactTestRenderer.ReactTestRenderer) {
  const style = tree.root.findByType(Text).props.style as unknown[];
  return Object.assign(
    {},
    ...(Array.isArray(style) ? style : [style]).filter(
      s => s && typeof s === 'object',
    ),
  ) as { fontSize?: number; fontWeight?: string };
}

describe('Chip', () => {
  it('라벨을 그린다', () => {
    expect(render().root.findByType(Text).props.children).toBe('바다');
  });

  it('onPress가 없으면 버튼으로 노출하지 않는다', () => {
    // 태그(#자연)나 카테고리 배지는 누를 수 없다. 버튼으로 읽히면
    // 스크린리더 사용자가 눌러도 아무 일도 일어나지 않는다.
    const tree = render();
    expect(pressable(tree)).toHaveLength(0);
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'button')).toHaveLength(0);
  });

  it('onPress가 있으면 눌린다', () => {
    const onPress = jest.fn();
    const tree = render({ onPress });
    const targets = pressable(tree);
    expect(targets.length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => targets[0].props.onPress());
    expect(onPress).toHaveBeenCalled();
  });

  it('선택 상태를 접근성 트리에 싣는다', () => {
    const tree = render({ onPress: () => {}, selected: true });
    const node = tree.root.find(n => n.props.accessibilityRole === 'button');
    expect(node.props.accessibilityState).toEqual({ selected: true });
  });

  it('크기와 강조가 서로 얽히지 않는다', () => {
    // size가 글자 크기를, selected/variant가 굵기·색을 정한다.
    // 예전처럼 selected 스타일에 fontSize가 딸려 있으면 작은 칩을 고를 때
    // 글자가 커진다.
    const sm = textStyle(render({ size: 'sm' }));
    const smSelected = textStyle(render({ size: 'sm', selected: true }));

    expect(smSelected.fontSize).toBe(sm.fontSize);
    expect(smSelected.fontWeight).toBe('600');
    expect(sm.fontWeight).toBeUndefined();
  });

  it('md가 sm보다 글자가 크다', () => {
    expect(textStyle(render({ size: 'md' })).fontSize).toBeGreaterThan(
      textStyle(render({ size: 'sm' })).fontSize!,
    );
  });
});
