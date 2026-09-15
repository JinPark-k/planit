import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ScheduleDay } from '../api/types';
import { ScheduleScreen } from './ScheduleScreen';

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
    {
      day: 2,
      items: [
        {
          place: {
            id: 'b',
            name: '카멜리아힐',
            category: 'SIGHTSEEING',
            tags: ['자연'],
            location: { lat: 33.3, lng: 126.3 },
          },
          startTime: '14:30',
          stayMinutes: 120,
          travelFromPreviousMinutes: 25,
        },
      ],
    },
  ];
}

/** PlaceDetailScreen.spec.tsx와 같은 이유로 타입이 아니라 label + onPress로 찾는다. */
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

describe('ScheduleScreen 장소 선택', () => {
  it('장소를 누르면 그 항목과 일차를 함께 넘긴다', () => {
    // 일차는 ScheduleItem에 없어서 여기서 안 실어 보내면 상세 화면이
    // "2일차 · 14:30 도착"을 만들 수 없다.
    const onSelectPlace = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onRestart={() => {}}
          onSelectPlace={onSelectPlace}
        />,
      );
    });

    const card = pressableByLabel(tree, '카멜리아힐 상세 보기');
    ReactTestRenderer.act(() => card.props.onPress());

    expect(onSelectPlace).toHaveBeenCalledTimes(1);
    const [item, day] = onSelectPlace.mock.calls[0];
    expect(day).toBe(2);
    expect(item.place.name).toBe('카멜리아힐');
    expect(item.startTime).toBe('14:30');
    expect(item.stayMinutes).toBe(120);
  });

  it('골라 담기 일정은 저장할 수 있고 저장 후 버튼이 비활성화된다', () => {
    const onSave = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onRestart={() => {}}
          onSave={onSave}
          saveState="idle"
          onSelectPlace={() => {}}
        />,
      );
    });

    const saveButton = pressableByLabel(tree, '여행 저장하기');
    ReactTestRenderer.act(() => saveButton.props.onPress());
    expect(onSave).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      tree.update(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onRestart={() => {}}
          onSave={onSave}
          saveState="saved"
          onSelectPlace={() => {}}
        />,
      );
    });

    expect(pressableByLabel(tree, '여행 저장하기').props.disabled).toBe(true);
    expect(tree.root.findByProps({ children: '저장 완료' })).toBeDefined();
  });
});

describe('ScheduleScreen 여행 시작/종료', () => {
  it('onSave/onRestart/onStartTrip/onEndTrip을 전혀 안 넘기면 footer 자체가 없다', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onSelectPlace={() => {}}
        />,
      );
    });

    for (const label of [
      '여행 저장하기',
      '다시 만들기',
      '여행 시작하기',
      '여행 종료',
    ]) {
      expect(
        tree.root.findAll(
          node =>
            node.props.accessibilityLabel === label &&
            typeof node.props.onPress === 'function',
        ),
      ).toHaveLength(0);
    }
  });

  it('onStartTrip만 넘기면 여행 시작하기 버튼이 뜨고 누르면 호출된다', () => {
    const onStartTrip = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onSelectPlace={() => {}}
          onStartTrip={onStartTrip}
        />,
      );
    });

    const startButton = pressableByLabel(tree, '여행 시작하기');
    expect(startButton.props.disabled).toBeFalsy();
    ReactTestRenderer.act(() => startButton.props.onPress());
    expect(onStartTrip).toHaveBeenCalledTimes(1);
  });

  it('담긴 장소가 하나도 없으면 여행 시작하기 버튼이 비활성화된다', () => {
    const emptyDays: ScheduleDay[] = [
      { day: 1, items: [] },
      { day: 2, items: [] },
    ];
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={emptyDays}
          regionLabel="제주"
          onBack={() => {}}
          onSelectPlace={() => {}}
          onStartTrip={() => {}}
        />,
      );
    });

    expect(pressableByLabel(tree, '여행 시작하기').props.disabled).toBe(true);
  });

  it('liveFrame과 onEndTrip을 넘기면 배너가 보이고 여행 종료 버튼을 누르면 호출된다', () => {
    const onEndTrip = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ScheduleScreen
          days={days()}
          regionLabel="제주"
          onBack={() => {}}
          onSelectPlace={() => {}}
          onEndTrip={onEndTrip}
          liveFrame={{
            title: '이호테우해변 체류 중',
            body: '10:30까지 · 다음 없음',
          }}
        />,
      );
    });

    expect(
      tree.root.findByProps({ children: '이호테우해변 체류 중' }),
    ).toBeDefined();
    expect(
      tree.root.findByProps({ children: '10:30까지 · 다음 없음' }),
    ).toBeDefined();

    const endButton = pressableByLabel(tree, '여행 종료');
    ReactTestRenderer.act(() => endButton.props.onPress());
    expect(onEndTrip).toHaveBeenCalledTimes(1);

    // 진행 중일 때는 여행 시작하기 버튼이 보이면 안 된다.
    expect(
      tree.root.findAll(
        node =>
          node.props.accessibilityLabel === '여행 시작하기' &&
          typeof node.props.onPress === 'function',
      ),
    ).toHaveLength(0);
  });
});
