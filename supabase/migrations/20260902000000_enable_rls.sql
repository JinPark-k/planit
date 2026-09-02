-- supabase/migrations/20260902000000_enable_rls.sql
--
-- 두 테이블에 RLS를 켜고 읽기 전용 정책을 건다.
--
-- 배경: Supabase 대시보드가 "rls_disabled_in_public — Anyone with your project URL
-- can read, edit, and delete all data in this table"로 경고했다.
--
-- 로컬(Docker)에서 anon 키로 실측한 결과는 SELECT 200 / INSERT·UPDATE·DELETE 401
-- (42501 permission denied)이었다. 20260828000000이 `grant select`만 준 덕분이다.
-- 그러나 그 마이그레이션은 아무것도 REVOKE하지 않는다. Supabase 클라우드는 public
-- 스키마의 테이블에 anon/authenticated 기본 권한을 넓게 주므로, 클라우드에는 쓰기
-- 권한이 남아 있을 수 있다 - 경고가 정확할 가능성이 크다.
--
-- 그래서 현재 상태를 확인하지 않고도 결과가 확정되도록 두 겹으로 막는다.
--   1) 쓰기 권한을 명시적으로 회수한다 (GRANT 계층)
--   2) RLS를 켜고 SELECT만 허용하는 정책을 만든다 (행 단위 계층)
-- 둘 중 하나가 환경별 기본값 때문에 어긋나도 나머지가 막는다.

-- 1) 쓰기 권한 회수. 이미 없으면 무해하다.
revoke insert, update, delete, truncate on table places from anon, authenticated;
revoke insert, update, delete, truncate on table region_visitor_stats from anon, authenticated;

-- 2) RLS 활성화.
--
-- service_role은 BYPASSRLS 속성을 가지므로 배치(insert/update)는 정책과 무관하게
-- 계속 동작한다. 반면 API 읽기 경로는 anon 키를 쓰므로(infra/supabase/supabase.provider.ts)
-- 아래 SELECT 정책이 없으면 조회가 조용히 0건이 된다 - 정책과 활성화는 반드시 같이 간다.
alter table places enable row level security;
alter table region_visitor_stats enable row level security;

-- 공개 관광 데이터라 모든 행을 읽을 수 있게 한다. 제한은 행이 아니라 "읽기만"에 있다.
-- 사용자별 데이터(저장한 일정 등)가 생기면 그 테이블에는 소유자 기준 정책을 따로 만든다.
create policy "places_read_all" on places
  for select to anon, authenticated using (true);

create policy "region_visitor_stats_read_all" on region_visitor_stats
  for select to anon, authenticated using (true);
