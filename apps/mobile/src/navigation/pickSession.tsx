import React, { createContext, useCallback, useContext, useState } from 'react';
import { Place, RegionCode } from '../api/types';

const DEFAULT_DAY_COUNT = 2;

/**
 * "골라 담기" 탭이 진행 중인 한 번의 고르기.
 *
 * 조건(일수·지역·키워드)과 담은 장소를 화면이 아니라 탭이 들고 있는다.
 * 조건 화면과 목록 화면이 나뉘어 있어서, 화면에 두면 조건을 고치러 뒤로 가는
 * 순간 담은 것이 사라진다. 일수만 바꾸려던 사람에게 그건 사고에 가깝다.
 */
export interface PickSession {
  dayCount: number;
  setDayCount: (dayCount: number) => void;

  region: RegionCode | null;
  /** 지역이 바뀌면 담은 것을 비운다. 다른 지역의 장소는 이 일정에 넣을 수 없다. */
  setRegion: (region: RegionCode) => void;

  keywords: string[];
  setKeywords: (keywords: string[]) => void;

  /**
   * 담은 장소를 id가 아니라 장소째로 들고 있는다. 조회 결과에서 id를 찾는
   * 방식이면 목록이 바뀔 때마다(키워드·종류) 담은 것이 사라진다.
   */
  picked: Place[];
  togglePick: (place: Place) => void;
}

const PickSessionContext = createContext<PickSession | null>(null);

export function PickSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const [region, setRegionState] = useState<RegionCode | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [picked, setPicked] = useState<Place[]>([]);

  const setRegion = useCallback(
    (next: RegionCode) => {
      if (next === region) return;
      setRegionState(next);
      setPicked([]);
    },
    [region],
  );

  const togglePick = useCallback((place: Place) => {
    setPicked(previous =>
      previous.some(item => item.id === place.id)
        ? previous.filter(item => item.id !== place.id)
        : [...previous, place],
    );
  }, []);

  return (
    <PickSessionContext.Provider
      value={{
        dayCount,
        setDayCount,
        region,
        setRegion,
        keywords,
        setKeywords,
        picked,
        togglePick,
      }}>
      {children}
    </PickSessionContext.Provider>
  );
}

export function usePickSession(): PickSession {
  const session = useContext(PickSessionContext);
  if (session === null) {
    throw new Error('usePickSession은 PickSessionProvider 안에서만 쓸 수 있다');
  }
  return session;
}
