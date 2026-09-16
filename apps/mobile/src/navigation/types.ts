import { ExcludedPlace, Festival, Place, ScheduleDay } from '../api/types';
import { VisitContext } from '../screens/placeDetail.format';
import type { SavedTrip } from '../storage/savedTrips';

/**
 * "여행" 탭의 스택. 일정을 만들고 결과를 보는 흐름.
 *
 * 화면 이름과 파라미터를 한곳에 모아 두면 navigate 호출에서 타입이 잡힌다
 * (오타나 빠뜨린 파라미터가 컴파일 시점에 드러난다).
 */
export type TripStackParamList = {
  PlanForm: undefined;
  Schedule: { days: ScheduleDay[]; regionLabel: string };
  /** visit은 일정에서 들어올 때만 있다. 다른 진입점에서는 없다. */
  PlaceDetail: { place: Place; visit?: VisitContext };
};

/**
 * "골라 담기" 탭의 스택.
 *
 * 일정 화면을 자동 생성 탭으로 넘기지 않고 이 스택에도 둔다. 사용자가 시작한
 * 흐름 안에서 결과를 보는 편이 자연스럽고, 탭을 오갈 때 각자의 상태가 유지된다.
 */
export type SearchStackParamList = {
  PickCondition: undefined;
  PickList: undefined;
  Schedule: {
    days: ScheduleDay[];
    regionLabel: string;
    /** 담았지만 일정에 넣지 못한 장소. 골라 담기에서만 생긴다. */
    excludedPlaces?: ExcludedPlace[];
  };
  PlaceDetail: { place: Place; visit?: VisitContext };
};

/**
 * "홈" 탭의 스택. 지금 열리는 축제를 보고 거기서 여행을 시작한다.
 */
export type HomeStackParamList = {
  /**
   * 탭 이름도 Home이라 스택 화면까지 Home으로 두면 react-navigation이
   * "Home > Home"으로 중첩됐다고 경고한다. 화면 쪽 이름을 구체적으로 둔다.
   */
  FestivalHome: undefined;
  /** 축제를 고른 뒤 며칠 여행할지 정하는 화면. */
  FestivalPlan: { festival: Festival };
  Schedule: {
    days: ScheduleDay[];
    regionLabel: string;
    excludedPlaces?: ExcludedPlace[];
    /** 이 일정의 앵커가 된 축제. 일정에서 개최 날짜를 함께 보여준다. */
    anchor?: { placeId: string; label: string };
  };
  PlaceDetail: { place: Place; visit?: VisitContext };
};

/** 기기에 저장한 골라 담기 일정을 다시 보는 스택. */
export type SavedTripsStackParamList = {
  SavedTripsHome: undefined;
  SavedSchedule: { trip: SavedTrip };
  /** 저장된 일정으로 실제 여행(잠금화면 표시)을 시작하는 화면. */
  TripStart: { trip: SavedTrip };
  PlaceDetail: { place: Place; visit?: VisitContext };
};

/**
 * 하단 탭들. 탭을 오갈 때 각자의 스택 상태가 유지된다는 기존 규칙
 * (SearchStackParamList 주석 참고)은 그대로 두되, "이미 그 탭에 있을 때 한
 * 번 더 누르면 첫 화면으로 리셋"이라는 예외를 추가했다. 구현은 이 파일이
 * 아니라 RootTabs.tsx의 screenListeners와 tabReset.ts에 있다.
 */
export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Trip: undefined;
  Saved: undefined;
};
