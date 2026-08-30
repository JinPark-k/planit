import React from 'react';
import { Linking, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Place } from '../api/types';
import { PlaceDetailScreen } from './PlaceDetailScreen';

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: '572973',
    name: '새별오름',
    category: 'SIGHTSEEING',
    tags: ['자연', '산책'],
    location: { lat: 33.36, lng: 126.35 },
    address: '제주특별자치도 제주시 애월읍 봉성리',
    imageUrl: 'https://example.invalid/a.jpg',
    ...overrides,
  };
}

/** 화면에 실제로 렌더된 문자열을 전부 모은다. */
function texts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(node =>
      React.Children.toArray(node.props.children)
        .filter(child => typeof child === 'string' || typeof child === 'number')
        .join(''),
    )
    .filter(Boolean);
}

/**
 * accessibilityLabel로 누를 수 있는 요소를 찾는다.
 *
 * findAllByType(Pressable)은 못 찾는다 — react-native가 내보내는 Pressable은
 * memo(forwardRef(...)) 래퍼라서 트리에 남는 타입과 참조가 다르다.
 * 또 Pressable 하나가 같은 label을 가진 View를 여러 개 낳으므로 onPress를 실제로
 * 들고 있는 노드만 고른다. root.find는 정확히 1개가 아니면 throw하므로,
 * 선택자가 낡으면 조용히 통과하지 않고 실패한다.
 */
function pressableByLabel(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return tree.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
}

function render(props: Partial<React.ComponentProps<typeof PlaceDetailScreen>>) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PlaceDetailScreen place={place()} onBack={() => {}} {...props} />,
    );
  });
  return tree;
}

describe('PlaceDetailScreen 지도 열기', () => {
  afterEach(() => jest.restoreAllMocks());

  it('좌표를 카카오맵 look 스킴으로 넘긴다', () => {
    // 위도/경도를 뒤바꾸면 엉뚱한 곳이 열린다. 화면에서는 눈으로 못 잡는다.
    const openURL = jest.spyOn(Linking, 'openURL');
    openURL.mockReset();
    openURL.mockResolvedValue(undefined as never);

    const tree = render({
      place: place({ location: { lat: 33.5407, lng: 126.6706 } }),
    });
    const button = tree.root.find(
      node =>
        node.props.accessibilityLabel === '새별오름 카카오맵으로 열기' &&
        typeof node.props.onPress === 'function',
    );
    ReactTestRenderer.act(() => button.props.onPress());

    expect(openURL).toHaveBeenCalledWith('kakaomap://look?p=33.5407,126.6706');
  });

  it('주소가 없어도 지도 버튼은 그린다', () => {
    // 주소는 비어 있을 수 있지만 좌표는 항상 있다.
    const tree = render({ place: place({ address: undefined }) });
    expect(texts(tree)).toContain('카카오맵으로 열기');
  });
});

describe('PlaceDetailScreen', () => {
  it('이름·카테고리 표시명·태그·주소를 보여준다', () => {
    const shown = texts(render({}));
    expect(shown).toContain('새별오름');
    expect(shown).toContain('관광'); // SIGHTSEEING의 표시명
    expect(shown).toContain('#자연');
    expect(shown).toContain('#산책');
    expect(shown).toContain('제주특별자치도 제주시 애월읍 봉성리');
  });

  it('일정에서 들어오면 방문 맥락을 보여준다', () => {
    const shown = texts(
      render({ visit: { day: 2, startTime: '14:30', stayMinutes: 90 } }),
    );
    expect(shown).toContain('2일차 · 14:30 도착 · 1시간 30분 머무름');
  });

  it('visit이 없으면 방문 맥락 카드를 그리지 않는다', () => {
    // 나중에 추천 목록 등 다른 진입점에서는 일차/시각이 없다.
    const shown = texts(render({}));
    expect(shown.some(t => t.includes('도착'))).toBe(false);
  });

  it('전화번호가 없으면 문의 섹션 자체를 그리지 않는다', () => {
    // 실측 900건 중 98.7%가 이 경우다. 빈 섹션이 남으면 안 된다.
    const shown = texts(render({}));
    expect(shown).not.toContain('문의');
  });

  it('전화번호가 있으면 눌러서 전화를 건다', () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);

    const tree = render({ place: place({ tel: '064-762-2190' }) });
    expect(texts(tree)).toContain('064-762-2190');

    const link = pressableByLabel(tree, '064-762-2190 전화 걸기');
    ReactTestRenderer.act(() => link.props.onPress());

    expect(openURL).toHaveBeenCalledWith('tel:064-762-2190');
    openURL.mockRestore();
  });

  it('이미지가 없으면 안내 문구를 대신 그린다', () => {
    // 실측 900건 중 16%가 이미지가 없어 빈 칸이 남는다.
    const shown = texts(render({ place: place({ imageUrl: undefined }) }));
    expect(shown).toContain('사진 없음');
  });

  it('뒤로 버튼을 누르면 onBack이 불린다', () => {
    const onBack = jest.fn();
    const tree = render({ onBack });
    const back = pressableByLabel(tree, '뒤로');
    ReactTestRenderer.act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalled();
  });
});
