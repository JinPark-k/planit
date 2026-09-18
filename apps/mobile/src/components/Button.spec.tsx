import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Button, ButtonProps } from './Button';

function render(props: Partial<ButtonProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Button label="일정 만들기" onPress={() => {}} {...props} />,
    );
  });
  return tree;
}

/**
 * 내부 Pressable 노드. 타입으로는 못 찾고(memo(forwardRef)), onPress만으로
 * 고르면 Button 컴포넌트 자신이 먼저 잡힌다 — 접근성 props까지 들고 있는
 * 노드로 좁힌다.
 */
function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole === 'button',
  );
}

describe('Button', () => {
  it('라벨을 그리고 누르면 onPress가 불린다', () => {
    const onPress = jest.fn();
    const tree = render({ onPress });

    expect(tree.root.findByType(Text).props.children).toBe('일정 만들기');
    ReactTestRenderer.act(() => pressable(tree).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled면 누르기가 막힌다', () => {
    const tree = render({ disabled: true });
    expect(pressable(tree).props.disabled).toBe(true);
    expect(pressable(tree).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  // 로딩 중에 또 눌리면 같은 요청이 두 번 나간다. disabled를 따로 주지 않아도
  // loading만으로 막혀야 한다.
  it('loading이면 라벨 대신 스피너를 그리고 누르기도 막힌다', () => {
    const tree = render({ loading: true });

    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
    expect(pressable(tree).props.disabled).toBe(true);
  });

  it('accessibilityLabel을 안 주면 라벨을 그대로 읽는다', () => {
    expect(pressable(render()).props.accessibilityLabel).toBe('일정 만들기');
    expect(
      pressable(render({ accessibilityLabel: '여행 저장하기' })).props
        .accessibilityLabel,
    ).toBe('여행 저장하기');
  });

  it('variant에 따라 라벨 색이 갈린다', () => {
    const labelColor = (tree: ReactTestRenderer.ReactTestRenderer) => {
      const style = tree.root.findByType(Text).props.style as unknown[];
      return Object.assign(
        {},
        ...style.filter(s => s && typeof s === 'object'),
      ) as { color?: string };
    };

    const primary = labelColor(render()).color;
    const secondary = labelColor(render({ variant: 'secondary' })).color;
    expect(primary).not.toBe(secondary);

    // 비활성 라벨은 활성과 달라야 한다 — primary는 채우기가 연라벤더로 바뀌어
    // 흰 라벨이 사라지고, secondary는 배경이 그대로라 뮤트로 낮춰야 한다.
    expect(labelColor(render({ disabled: true })).color).not.toBe(primary);
    expect(
      labelColor(render({ variant: 'secondary', disabled: true })).color,
    ).not.toBe(secondary);
  });
});
