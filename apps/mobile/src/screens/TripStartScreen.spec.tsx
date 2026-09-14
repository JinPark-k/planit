import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ScheduleDay } from '../api/types';
import { LiveTripCapability } from '../native/types';
import { TripStartScreen } from './TripStartScreen';

function days(): ScheduleDay[] {
  return [
    {
      day: 1,
      items: [
        {
          place: {
            id: 'a',
            name: '이호테우해변',
            category: 'SIGHTSEEING',
            tags: ['바다'],
            location: { lat: 33.5, lng: 126.5 },
          },
          startTime: '09:00',
          stayMinutes: 90,
        },
      ],
    },
  ];
}

const FULL_CAPABILITY: LiveTripCapability = {
  supported: true,
  allowed: true,
  statusBar: true,
};

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

function renderScreen(props: Partial<React.ComponentProps<typeof TripStartScreen>>) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <TripStartScreen
        days={days()}
        regionLabel="제주"
        value="2026-09-20"
        onChange={() => {}}
        onConfirm={() => {}}
        onBack={() => {}}
        capability={FULL_CAPABILITY}
        {...props}
      />,
    );
  });
  return tree;
}

describe('TripStartScreen 안내 문구', () => {
  it('지원하지 않는 기기: 앱 안에서만 표시', () => {
    const tree = renderScreen({
      capability: { supported: false, allowed: false, statusBar: false },
    });
    expect(
      tree.root.findByProps({ children: '이 기기에서는 앱 안에서만 표시돼요.' }),
    ).toBeDefined();
  });

  it('권한 없음: 알림 허용 안내', () => {
    const tree = renderScreen({
      capability: { supported: true, allowed: false, statusBar: false },
    });
    expect(
      tree.root.findByProps({
        children: '알림을 허용하면 잠금화면에도 표시할 수 있어요.',
      }),
    ).toBeDefined();
  });

  it('안드로이드: 자동으로 다음 장소로 넘어간다는 안내', () => {
    const originalOS = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'android';
    try {
      const tree = renderScreen({ capability: FULL_CAPABILITY });
      expect(
        tree.root.findByProps({
          children: '시간이 되면 잠금화면 표시가 자동으로 다음 장소로 넘어가요.',
        }),
      ).toBeDefined();
    } finally {
      require('react-native').Platform.OS = originalOS;
    }
  });

  it('iOS 등: 잠금화면 버튼/앱으로 넘기라는 안내', () => {
    const originalOS = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'ios';
    try {
      const tree = renderScreen({ capability: FULL_CAPABILITY });
      expect(
        tree.root.findByProps({
          children:
            '잠금화면에 남은 시간이 실시간으로 보여요. 다음 장소로 넘기려면 잠금화면 버튼을 누르거나 앱을 열면 됩니다.',
        }),
      ).toBeDefined();
    } finally {
      require('react-native').Platform.OS = originalOS;
    }
  });
});

describe('TripStartScreen 상호작용', () => {
  it('날짜를 고르면 onChange가 그 dateKey로 호출된다', () => {
    const onChange = jest.fn();
    const tree = renderScreen({ value: '2026-09-20', onChange });

    const dayButton = pressableByLabel(tree, '2026-09-25');
    ReactTestRenderer.act(() => dayButton.props.onPress());

    expect(onChange).toHaveBeenCalledWith('2026-09-25');
  });

  it('여행 시작 버튼을 누르면 onConfirm이 호출된다', () => {
    const onConfirm = jest.fn();
    const tree = renderScreen({ onConfirm });

    const confirmButton = pressableByLabel(tree, '여행 시작');
    ReactTestRenderer.act(() => confirmButton.props.onPress());

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('starting이 true면 여행 시작 버튼이 비활성화된다', () => {
    const tree = renderScreen({ starting: true });
    expect(pressableByLabel(tree, '여행 시작').props.disabled).toBe(true);
  });

  it('error가 있으면 에러 문구를 보여준다', () => {
    const tree = renderScreen({ error: '이 여행은 시작할 수 없어요.' });
    expect(
      tree.root.findByProps({ children: '이 여행은 시작할 수 없어요.' }),
    ).toBeDefined();
  });
});
