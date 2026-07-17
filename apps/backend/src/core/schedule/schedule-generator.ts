import { resolveTagsForKeywords } from '../keyword-tag';
import { scoreAndSortPlaces } from '../scoring';
import { clusterPlacesByDay } from '../clustering';
import { getTravelTime } from '../travel-time';
import {
  GenerateScheduleInput,
  ScheduleDay,
  ScheduleItem,
} from './schedule.types';

/**
 * 일정 생성 파이프라인. LLM 미사용, 규칙 기반.
 * 1) 키워드 -> 태그 매핑으로 필터링
 * 2) 스코어링 (태그 일치도 + 인기도 + 평점)
 * 3) 그리디 지역 클러스터링으로 일차별 그룹 분리
 * 4) 카테고리 + 시간대 기준 일차 내 순서 배치
 * 출력은 스케줄표 데이터(장소명/시간/이동시간)만. 문장/설명 생성 없음.
 *
 * TODO: 3), 4) 단계는 clustering.ts / 아래 orderWithinDay 구현이 완료되어야 동작한다.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleDay[] {
  const keywordTags = resolveTagsForKeywords(input.keywords);
  const scored = scoreAndSortPlaces(input.candidatePlaces, keywordTags);

  const dayClusters = clusterPlacesByDay(
    scored.map(({ place }) => place),
    input.dayCount,
  );

  return dayClusters.map((cluster) => ({
    day: cluster.day,
    items: orderWithinDay(cluster.places, input.travelMode),
  }));
}

// TODO: 카테고리(관광/맛집/액티비티) + 시간대 기준 순서 배치 규칙을 구현한다.
function orderWithinDay(
  places: GenerateScheduleInput['candidatePlaces'],
  travelMode: GenerateScheduleInput['travelMode'],
): ScheduleItem[] {
  return places.map((place, index) => {
    const previous = places[index - 1];
    return {
      place,
      startTime: '00:00', // TODO: 시간대 배치 규칙 적용
      travelFromPreviousMinutes: previous
        ? getTravelTime(previous.location, place.location, travelMode).minutes
        : undefined,
    };
  });
}
