import type { NavigationState, PartialState } from '@react-navigation/native';

/**
 * 탭을 다시 누르면 그 탭의 스택을 첫 화면으로 되돌린다.
 *
 * unmountOnBlur로도 비슷해 보이지만 쓰지 않는다. 탭을 떠날 때마다 스크린이
 * 통째로 언마운트돼서 (1) Stack.Navigator 바깥의 PickSessionProvider까지
 * 날아가 담은 장소가 사라지고 (2) 탭 이동만으로도 초기화돼 "돌아오면 보던
 * 화면"이라는 정책 자체가 깨진다.
 *
 * 나중에 "맨 위에서 한 번 더 누르면 목록 최상단으로 스크롤"을 붙이려면:
 * useScrollToTop은 화면 안에서 ref와 함께 써야 하는데, 그러면 첫 화면들이
 * NavigationContainer 없이는 렌더도 안 돼 "화면 컴포넌트는 네비게이션을
 * 모른다"는 계약(TripStack.tsx 주석)이 깨진다. 붙일 때는 훅을 화면이 아니라
 * Route 래퍼에 두고 화면엔 listRef 옵셔널 prop만 넘긴다.
 */

/**
 * 탭 리스너가 쥔 navigation은 탭 네비게이터의 것이라 그냥 dispatch하면
 * 액션이 부모로만 올라간다. 자식 스택으로 내려보내려면 액션에 그 스택의
 * state key를 target으로 실어야 한다 — `@react-navigation/core`의
 * useOnAction이 target이 문자열일 때만 자식 리스너 루프를 연다.
 */
export function stackToPopToTop(
  routeState: NavigationState | PartialState<NavigationState> | undefined,
): string | undefined {
  // 아직 한 번도 열지 않은 탭이라 자식 state가 없다.
  if (routeState == null) return undefined;

  // rehydrate 전이라 key/index를 믿을 수 없다. 이 체크가
  // NavigationState | PartialState 유니온 판별도 겸해서, 이후
  // key/index/type이 non-optional로 좁혀진다. 캐스팅 쓰지 말 것.
  if (routeState.stale !== false) return undefined;

  // 스택이 아닌 것에 POP_TO_TOP을 보내면 라우터가 무시한다.
  if (routeState.type !== 'stack') return undefined;

  // 이미 맨 위. 여기서 쏘면 StackRouter가 null을 돌려주고 개발 빌드가
  // "The action 'POP_TO_TOP' was not handled by any navigator."를
  // 콘솔에 찍는다.
  if (routeState.index === 0) return undefined;

  return routeState.key;
}
