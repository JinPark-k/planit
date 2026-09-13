-- TourAPI detailIntro2의 playtime에서 뽑은 축제 운영 시각.
--
-- 축제가 일정의 앵커라 가장 먼저 배치되는데, 시간 제약이 없어 하루 시작 시각인
-- 09:00에 들어갔다. 무주반딧불축제는 10:00에 열고, 경주 국가유산야행은 18:00에
-- 여는데도 그랬다.
--
-- playtime 형식이 비정형이라 파싱에 실패할 수 있다. 그때는 NULL로 두고 제약을
-- 걸지 않는다(batch/parse-playtime.ts 참고).
alter table places
  add column if not exists event_open_time time,
  add column if not exists event_close_time time;

comment on column places.event_open_time is
  'TourAPI detailIntro2 playtime에서 뽑은 개장 시각. 파싱 실패 시 NULL.';
comment on column places.event_close_time is
  '폐장 시각. 개장보다 늦을 때만 채운다.';
