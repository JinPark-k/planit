import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  createNavigationContainerRef,
  NavigationContainer,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { stackToPopToTop } from './tabReset';

/**
 * stackToPopToTop은 "어느 key로 보낼지"만 정한다. 그 key를 target에 실어야
 * 액션이 자식 스택까지 내려간다는 것은 순수 함수가 답하지 못한다.
 *
 * 그 한 칸을 여기서 닫는다. 중요한 건 **탭 네비게이터의 navigation으로**
 * 쏘는 것이다 — screenListeners가 받는 게 그 객체다. 컨테이너 ref로 쏘면
 * 루트에서 포커스된 자식으로 내려가 버려서, target이 없어도 통과한다
 * (실제로 그렇게 짰다가 거짓 통과를 봤다).
 */
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Blank = () => null;

/** 스택 안에서 부모(탭) navigation을 꺼내 테스트로 넘긴다. */
function Capture({ onReady }: { onReady: (tabNav: unknown) => void }) {
  const navigation = useNavigation();
  React.useEffect(() => {
    onReady(navigation.getParent());
  }, [navigation, onReady]);
  return null;
}

describe('popToTop을 자식 스택으로 내려보내기', () => {
  function setup() {
    const ref = createNavigationContainerRef();
    let tabNav: any;

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <NavigationContainer ref={ref}>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Trip">
              {() => (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="PlanForm">
                    {() => (
                      <Capture
                        onReady={parent => {
                          tabNav = parent;
                        }}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Schedule" component={Blank} />
                </Stack.Navigator>
              )}
            </Tab.Screen>
            <Tab.Screen name="Other" component={Blank} />
          </Tab.Navigator>
        </NavigationContainer>,
      );
    });

    ReactTestRenderer.act(() => {
      ref.dispatch(StackActions.push('Schedule'));
    });

    return { ref, tabNav: () => tabNav };
  }

  /** 탭의 첫 라우트(= Trip 탭)가 품은 자식 스택 state. */
  function nestedState(ref: ReturnType<typeof createNavigationContainerRef>) {
    const root = ref.getRootState();
    if (root === undefined) throw new Error('컨테이너가 아직 준비되지 않았다');
    return root.routes[0].state;
  }

  const nestedIndex = (ref: ReturnType<typeof createNavigationContainerRef>) =>
    nestedState(ref)?.index;

  it('target에 스택 state key를 실으면 그 스택이 첫 화면으로 돌아간다', () => {
    const { ref, tabNav } = setup();
    expect(nestedIndex(ref)).toBe(1);

    const stackKey = stackToPopToTop(nestedState(ref));

    ReactTestRenderer.act(() => {
      tabNav().dispatch({ ...StackActions.popToTop(), target: stackKey });
    });

    expect(nestedIndex(ref)).toBe(0);
  });

  // target이 없으면 액션이 부모로만 올라가 아무 일도 일어나지 않는다.
  // 이 테스트가 깨지면 target을 실을 이유가 사라졌다는 뜻이다.
  it('target 없이 쏘면 자식 스택이 그대로 남는다', () => {
    const { ref, tabNav } = setup();
    expect(nestedIndex(ref)).toBe(1);

    ReactTestRenderer.act(() => {
      tabNav().dispatch(StackActions.popToTop());
    });

    expect(nestedIndex(ref)).toBe(1);
  });
});
