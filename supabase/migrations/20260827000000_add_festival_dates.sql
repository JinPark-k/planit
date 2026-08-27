-- supabase/migrations/20260827000000_add_festival_dates.sql
-- TourAPI searchFestival2의 축제 기간(eventstartdate/eventenddate)을 저장한다.
-- 축제(contentTypeId=15) 외 콘텐츠타입은 항상 NULL.

alter table places
  add column if not exists event_start_date date,
  add column if not exists event_end_date date;

comment on column places.event_start_date is
  'TourAPI searchFestival2 eventstartdate(YYYYMMDD) 파싱값. 축제(contentTypeId=15)만 non-null.';
comment on column places.event_end_date is
  'TourAPI searchFestival2 eventenddate(YYYYMMDD) 파싱값. 축제(contentTypeId=15)만 non-null.';

-- PostgreSQL은 ADD CONSTRAINT IF NOT EXISTS를 지원하지 않아 DO 블록으로 재실행 안전성을 맞춘다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'places_event_date_order'
  ) then
    alter table places
      add constraint places_event_date_order check (
        event_start_date is null
        or event_end_date is null
        or event_start_date <= event_end_date
      );
  end if;
end $$;

-- 여행 기간과 겹치는 축제 후보 조회용(다음 PR). 축제만 non-null이라 partial index로 크기를 최소화.
create index if not exists idx_places_event_dates
  on places (region_code, event_start_date, event_end_date)
  where event_start_date is not null;
