-- supabase/migrations/20260828000000_grant_table_privileges.sql
--
-- 테이블 권한을 명시적으로 부여한다.
--
-- 배경: 클라우드 프로젝트는 플랫폼이 public 스키마에 기본 권한을 넣어주지만,
-- 로컬(`supabase start`)에서는 service_role에 Dxtm(TRUNCATE/REFERENCES/TRIGGER/MAINTAIN)만
-- 부여되고 arwd(SELECT/INSERT/UPDATE/DELETE)가 빠져 배치 upsert가
-- "permission denied for table places"로 실패했다.
-- 환경별 기본값에 의존하지 않도록 권한을 마이그레이션으로 고정한다.
-- (클라우드에는 이미 동등한 권한이 있어 재적용해도 무해하다.)

-- 배치(service_role)는 읽기/쓰기 모두 필요하다.
grant select, insert, update, delete on table places to service_role;
grant select, insert, update, delete on table region_visitor_stats to service_role;

-- 앱 읽기 경로는 anon 키를 사용한다(infra/supabase/supabase.provider.ts).
-- 관광 공개 데이터이므로 읽기만 허용한다.
grant select on table places to anon, authenticated;
grant select on table region_visitor_stats to anon, authenticated;

-- region_visitor_stats는 identity 컬럼을 쓰므로 시퀀스 권한도 필요하다.
grant usage, select on all sequences in schema public to service_role;

-- TODO: RLS는 아직 활성화하지 않았다. 현재 두 테이블 모두 공개 관광 데이터이고
-- 배치(service_role)만 쓰기 때문에 위 GRANT로 충분하다.
-- 사용자별 데이터(저장한 일정 등)가 생기면 그때 RLS 정책을 함께 설계할 것.
