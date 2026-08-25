# 백엔드 구조 규칙

루트 `/Users/jpark/planit/CLAUDE.md`의 배포 어댑터 분리 요구사항을 구현하기 위한 레이어 규칙.

## `src/core/`

- 배포 방식과 무관한 순수 도메인 로직만 둔다 (스코어링, 클러스터링, 이동시간 계산, 일정 생성 등).
- `@nestjs/*`, `apps/backend/adapters/*` import 금지. Nest 없이 유닛테스트 가능해야 한다.
- **Why**: 인프라 전환(Vercel → Oracle Cloud/AWS 등) 시 `core/`를 건드리지 않고 `adapters/`만 교체/추가하는 것이 목표이기 때문. `core/`가 Nest나 특정 배포 타겟에 의존하면 이 분리가 깨진다.

## `src/modules/`

- Nest HTTP 레이어(controller/service)만 두고, 실제 로직은 `core/*`를 호출하는 형태로 위임한다.

## `src/infra/`

- 외부 연동(Supabase, TourAPI 등) 클라이언트. Nest DI 없이도 `batch/` 스크립트 등에서 plain function으로 재사용 가능해야 한다.
- **부팅 시 throw 금지**: 필수 환경변수가 없어도 앱 부팅 자체를 막지 않는다. `console.warn`을 남기고 placeholder 값으로 클라이언트를 생성해, 실제 호출 시점에 네트워크/인증 에러로 자연스럽게 드러나게 한다.
  - **Why**: 과거 `createSupabaseClient`가 env 누락 시 동기적으로 throw하도록 만들었다가 Nest DI 부팅 자체가 크래시하는 문제를 겪었다. 참고 구현: `src/infra/supabase/supabase.client.ts`.

## `apps/backend/adapters/`

- 배포 타겟별 얇은 래퍼만 둔다 (예: `adapters/vercel/index.ts`가 `createApp()`을 serverless-express로 감싸는 정도).
- 비즈니스 로직을 여기에 작성하지 않는다.

## `src/batch/`

- `runBatchPipeline(regionCode)` 형태로, 지역코드를 파라미터로 받아 도시 단위로 재사용 가능하게 설계한다.
- Nest DI 없이 실행 가능한 plain 엔트리포인트(`cli.ts`)를 유지한다 (GitHub Actions 크론에서 Nest 앱 전체를 부팅하지 않고 배치만 실행하기 위함).
