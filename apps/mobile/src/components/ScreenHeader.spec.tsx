import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ScreenHeader, ScreenHeaderProps } from './ScreenHeader';

function render(props: Partial<ScreenHeaderProps> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScreenHeader title="제주 3일 일정" onBack={() => {}} {...props} />,
    );
  });
  return tree;
}

/** 뒤로 버튼(Pressable). 타입으로는 못 찾아서 접근성 props로 좁힌다. */
function backButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole === 'button',
  );
}

describe('ScreenHeader', () => {
  it('제목을 그리고 뒤로를 누르면 onBack이 불린다', () => {
    const onBack = jest.fn();
    const tree = render({ onBack });

    const texts = tree.root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toContain('제주 3일 일정');

    ReactTestRenderer.act(() => backButton(tree).props.onPress());
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('backLabel 기본값은 뒤로이고, 주면 그걸 읽는다', () => {
    expect(backButton(render()).props.accessibilityLabel).toBe('뒤로');
    expect(
      backButton(render({ backLabel: '조건 바꾸기' })).props.accessibilityLabel,
    ).toBe('조건 바꾸기');
  });

  // 지역 이름이 길어지면 헤더가 두 줄로 늘어나 아래 내용이 밀린다.
  it('제목은 길어도 한 줄로 자른다', () => {
    const tree = render({ title: '아주 긴 지역 이름으로 만든 여행 일정 제목' });
    const title = tree.root
      .findAllByType(Text)
      .find(
        t =>
          typeof t.props.children === 'string' && t.props.children.length > 10,
      );
    expect(title?.props.numberOfLines).toBe(1);
  });
});
