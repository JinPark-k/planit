import React from 'react';
import { Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Card, CardProps } from './Card';

function render(props: Partial<CardProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Card {...props}>
        <Text>제주 2일 일정</Text>
      </Card>,
    );
  });
  return tree;
}

function pressableNodes(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityRole === 'string',
  );
}

/** 카드 껍데기에 최종 적용된 스타일을 하나로 합친다. */
function flatten(style: unknown): Record<string, unknown> {
  const list = Array.isArray(style) ? style : [style];
  return Object.assign(
    {},
    ...list.flatMap(s =>
      Array.isArray(s) ? [flatten(s)] : s && typeof s === 'object' ? [s] : [],
    ),
  );
}

describe('Card', () => {
  // 표시 전용 카드가 접근성 트리에서 버튼으로 읽히면 안 된다.
  it('onPress가 없으면 View로 그린다', () => {
    const tree = render();
    expect(pressableNodes(tree)).toHaveLength(0);
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0);
  });

  it('onPress가 있으면 누를 수 있고 라벨을 읽는다', () => {
    const onPress = jest.fn();
    const tree = render({ onPress, accessibilityLabel: '저장 여행 열기' });

    const [node] = pressableNodes(tree);
    expect(node.props.accessibilityLabel).toBe('저장 여행 열기');

    ReactTestRenderer.act(() => node.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('기본 껍데기(배경·테두리·모서리)를 스스로 정한다', () => {
    const flat = flatten(render().root.findByType(View).props.style);
    expect(flat.borderWidth).toBe(1);
    expect(flat.borderRadius).toBeDefined();
    expect(flat.backgroundColor).toBeDefined();
  });

  // 담는 행은 눌러서 이동하는 카드가 아니라 고르는 것이다. 접근성 트리에도
  // 그렇게 읽혀야 한다.
  it('selected를 주면 체크박스로 읽히고 테두리가 바뀐다', () => {
    const [on] = pressableNodes(render({ onPress: () => {}, selected: true }));
    expect(on.props.accessibilityRole).toBe('checkbox');
    expect(on.props.accessibilityState).toEqual({ checked: true });

    const [off] = pressableNodes(
      render({ onPress: () => {}, selected: false }),
    );
    expect(off.props.accessibilityState).toEqual({ checked: false });

    const onBorder = flatten(on.props.style({ pressed: false })).borderColor;
    const offBorder = flatten(off.props.style({ pressed: false })).borderColor;
    expect(onBorder).not.toBe(offBorder);
  });

  it('selected를 안 주면 버튼으로 읽힌다', () => {
    const [node] = pressableNodes(render({ onPress: () => {} }));
    expect(node.props.accessibilityRole).toBe('button');
    expect(node.props.accessibilityState).toBeUndefined();
  });

  // 호출부가 테두리를 바꿔도(식사 앵커) 누름 반응은 살아 있어야 한다.
  it('누르면 style보다 뒤에 누름 반응이 얹힌다', () => {
    const tree = render({
      onPress: () => {},
      style: { borderColor: '#73C322' },
    });
    const [node] = pressableNodes(tree);

    const resting = flatten(node.props.style({ pressed: false }));
    const pressed = flatten(node.props.style({ pressed: true }));

    expect(resting.borderColor).toBe('#73C322');
    expect(pressed.borderColor).toBe('#73C322');
    expect(pressed.backgroundColor).not.toBe(resting.backgroundColor);
  });
});
