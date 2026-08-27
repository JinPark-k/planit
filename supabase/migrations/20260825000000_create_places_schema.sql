-- supabase/migrations/20260825000000_create_places_schema.sql

create table if not exists places (
  id uuid primary key default gen_random_uuid(),

  content_id text not null unique,
  content_type_id text,
  cat1 text,
  cat2 text,
  cat3 text,
  addr1 text,
  addr2 text,
  tel text,
  overview text,
  homepage text,
  image_url text,
  raw_response jsonb,

  name text not null,
  lat double precision not null,
  lng double precision not null,
  region_code text not null,
  sigungu_code text,
  category text,
  tags text[] not null default '{}',

  popularity double precision not null default 0,
  rating double precision not null default 0.5,
    -- ASSUMPTION(미확정): TourAPI엔 평점 데이터 없음. 실 데이터 소스 연동 전까지 중립값.

  created_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),

  constraint places_lat_range check (lat between -90 and 90),
  constraint places_lng_range check (lng between -180 and 180),
  constraint places_popularity_range check (popularity between 0 and 1),
  constraint places_rating_range check (rating between 0 and 1),
  constraint places_category_valid check (
    category is null or category in ('SIGHTSEEING', 'FOOD', 'ACTIVITY')
  )
);

create index if not exists idx_places_region_sigungu on places (region_code, sigungu_code);
create index if not exists idx_places_tags_gin on places using gin (tags);

comment on table places is
  'TourAPI 배치 수집 결과. Nest 앱은 이 테이블만 읽는다(직접 TourAPI 호출 없음). service-role만 write.';
comment on column places.raw_response is
  'TourAPI 원본 응답 JSON 전체. 재정제/디버깅 대비 보존.';


create table if not exists region_visitor_stats (
  id bigint generated always as identity primary key,

  region_code text not null,      -- TODO: TourAPI areacode와 코드 체계 동일한지 공식 문서로 확인
  sigungu_code text,               -- 광역 단위만 있는 경우 NULL
  stat_base_date date not null,    -- TODO: 집계 단위(월/분기/연) 확인 후 조정
  visitor_count bigint not null,   -- TODO: 실제 필드명/단위 공식 문서로 확인
  source text not null default 'tourapi_visitor_bigdata',

  created_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),

  constraint region_visitor_stats_count_nonnegative check (visitor_count >= 0)
);

create unique index if not exists uq_region_visitor_stats_key
  on region_visitor_stats (region_code, coalesce(sigungu_code, ''), stat_base_date);
create index if not exists idx_region_visitor_stats_region_sigungu
  on region_visitor_stats (region_code, sigungu_code);

comment on table region_visitor_stats is
  '한국관광공사_빅데이터_지역별 방문자수(지역 단위). places.popularity 계산 입력 신호. 컬럼명/단위는 공식 문서 확인 전까지 TODO 가정치.';
