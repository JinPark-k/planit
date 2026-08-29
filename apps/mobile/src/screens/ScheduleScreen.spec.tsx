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
});
