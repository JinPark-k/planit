import type { NavigationState, PartialState } from '@react-navigation/native';
import { stackToPopToTop } from './tabReset';

describe('stackToPopToTop', () => {
  it('아직 한 번도 열지 않은 탭(state 없음)이면 undefined를 반환한다', () => {
    expect(stackToPopToTop(undefined)).toBeUndefined();
  });

  it('rehydrate 전(stale: true) 상태면 undefined를 반환한다', () => {
    const notRehydrated: PartialState<NavigationState> = {
      stale: true,
      routes: [{ name: 'PlanForm' }],
    };

    expect(stackToPopToTop(notRehydrated)).toBeUndefined();
  });

  it('이미 스택 맨 위(index: 0)면 undefined를 반환한다', () => {
    const atTop: NavigationState = {
      key: 'stack-abc',
      index: 0,
      routeNames: ['PlanForm', 'Schedule'],
      routes: [{ key: 'PlanForm-1', name: 'PlanForm' }],
      type: 'stack',
      stale: false,
    };

    expect(stackToPopToTop(atTop)).toBeUndefined();
  });

  it('스택 안쪽 화면(index: 2)이면 스택 state의 key를 반환한다', () => {
    // routes의 각 key는 현재 포커스된 route의 key(PlaceDetail-3)와 다르게
    // 둔다. 함수가 실수로 focused route의 key를 반환하면 이 테스트가 깨진다.
    const deep: NavigationState = {
      key: 'stack-abc',
      index: 2,
      routeNames: ['PlanForm', 'Schedule', 'PlaceDetail'],
      routes: [
        { key: 'PlanForm-1', name: 'PlanForm' },
        { key: 'Schedule-2', name: 'Schedule' },
        { key: 'PlaceDetail-3', name: 'PlaceDetail' },
      ],
      type: 'stack',
      stale: false,
    };

    expect(stackToPopToTop(deep)).toBe('stack-abc');
  });

  it('최상위가 스택이 아니라 탭(type: "tab")이면 undefined를 반환한다', () => {
    // index를 1로 둔다. 0이면 앞의 index 가드가 먼저 걸려서, type 가드를
    // 지워도 이 테스트가 통과해 버린다.
    const nestedTab: NavigationState = {
      key: 'tab-xyz',
      index: 1,
      routeNames: ['Home', 'Search'],
      routes: [
        { key: 'Home-1', name: 'Home' },
        { key: 'Search-2', name: 'Search' },
      ],
      type: 'tab',
      stale: false,
    };

    expect(stackToPopToTop(nestedTab)).toBeUndefined();
  });
});
