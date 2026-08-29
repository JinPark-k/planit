-- supabase/migrations/20260829010000_replace_cat_with_lcls_systm.sql
--
-- places의 구 서비스분류코드 컬럼(cat1~3)을 분류체계 컬럼(lcls_systm1~3)으로 교체한다.
--
-- 배경: 한국관광공사 개방데이터 활용매뉴얼 v4.4(2026-02-10) 개정 이력에
-- "요청/응답 : 서비스 대분류, 중분류, 소분류 삭제"가 명시됐다.
-- 지역코드/시군구코드도 같은 개정에서 삭제됐다. 즉 cat1~3는 더 이상 스펙 항목이 아니고,
-- 실제 응답에 아직 섞여 오는 값(2026-08 실측 56%)은 문서화되지 않은 잔재다.
--
-- 이 프로젝트는 아직 서비스 전이라 보존해야 할 과거 데이터가 없다.
-- 폴백을 남기는 대신 새 코드 체계로 완전히 넘어간다.
--
-- 컬럼 용도: 배치가 "매핑되지 않은 소분류 코드"를 로그로 노출해 태그 매핑을 튜닝하는 데 쓴다.
-- 조회 경로(PLACE_LIST_COLUMNS)에서는 읽지 않는다.
--
-- 재실행 안전: add/drop 모두 if (not) exists를 쓴다.

alter table places add column if not exists lcls_systm1 text;
alter table places add column if not exists lcls_systm2 text;
alter table places add column if not exists lcls_systm3 text;

-- 이미 적재된 행은 raw_response에 원본이 남아 있으므로 거기서 채운다.
-- (빈 문자열은 null로 정규화 — transform-place의 nullable()과 동일한 규칙)
update places
set lcls_systm1 = nullif(trim(raw_response ->> 'lclsSystm1'), ''),
    lcls_systm2 = nullif(trim(raw_response ->> 'lclsSystm2'), ''),
    lcls_systm3 = nullif(trim(raw_response ->> 'lclsSystm3'), '')
where raw_response is not null;

alter table places drop column if exists cat1;
alter table places drop column if exists cat2;
alter table places drop column if exists cat3;
