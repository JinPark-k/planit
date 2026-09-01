import { Place, ScheduleDay } from '../api/types';
import { VisitContext } from '../screens/placeDetail.format';

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

/** "검색" 탭의 스택. 아직 목록 화면 하나뿐이다. */
export type SearchStackParamList = {
  SearchHome: undefined;
};

export type RootTabParamList = {
  Search: undefined;
  Trip: undefined;
};
