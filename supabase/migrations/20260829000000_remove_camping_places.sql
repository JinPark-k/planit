-- supabase/migrations/20260829000000_remove_camping_places.sql
--
-- 캠핑(분류체계 AC05) 장소를 places에서 제거한다.
--
-- 배경: AC05(일반야영장/오토캠핑장/카라반/글램핑장)는 한국관광공사
-- "신분류체계정보 관광타입정보 연계 정의서"상 관광타입 28(레포츠)이라
-- 레포츠 수집에 딸려 들어온다. 하지만 잠을 자는 곳이지 낮에 들르는 일정 항목이 아니어서,
-- 그대로 두면 '별헤는밤글램핑' 같은 숙소가 category=ACTIVITY로 오후 시간대에 배치된다.
-- contentTypeId 32(숙박)를 수집하지 않기로 한 결정과 같은 기준으로 제외한다.
--
-- 배치는 upsert만 하고 삭제 동기화를 하지 않으므로, 수집 단계에서 걸러내도
-- 이미 적재된 행은 남는다. 이 마이그레이션이 그 잔여분을 한 번 정리한다.
-- 이후로는 transform-place의 isExcludedLcls2가 재유입을 막는다.
--
-- 재실행 안전: 조건에 맞는 행이 없으면 0건 삭제로 끝난다.

delete from places
where raw_response ->> 'lclsSystm2' = 'AC05';
