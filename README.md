# Planit

국내 도시 여행 서비스. 사용자가 키워드를 선택하면 여행지를 추천하고, 스케줄표 형태의 여행 일정을 짜준다. 자세한 제품/아키텍처 컨텍스트는 [CLAUDE.md](./CLAUDE.md) 참고.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 백엔드 | NestJS (TypeScript) |
| 앱 | React Native (Bare CLI, TypeScript) |
| DB | Supabase (PostgreSQL) |
| 배포 | Vercel(Hobby) → 필요 시 Oracle Cloud/AWS 등으로 전환 가능 |
| 배치 | GitHub Actions cron + TourAPI |

## 모노레포 구조

```
planit/
├── apps/
│   ├── backend/   # NestJS API + 배치 파이프라인
│   └── mobile/    # React Native Bare CLI 앱
└── .github/workflows/   # 배치 cron
```

백엔드는 `apps/backend/src/core`(배포 방식과 무관한 순수 도메인 로직)와 `apps/backend/adapters`(배포 타겟별 얇은 래퍼)를 분리한다. 인프라를 옮길 때는 `adapters`만 추가/교체하면 되고 `core`/`modules`/`infra`는 건드리지 않는다.

## 시작하기

```bash
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

### 백엔드 실행

```bash
pnpm dev:backend
```

### 로컬 DB (Docker Supabase)

개발은 기본적으로 **로컬 DB**를 사용한다. 운영 클라우드 DB는 명시적으로 `:prod` 명령을 쓸 때만 접근한다.

```bash
pnpm db:start     # Docker로 로컬 Supabase 기동 (마이그레이션 자동 적용)
pnpm db:status    # 로컬 URL/키 확인
pnpm db:reset     # 로컬 DB 초기화 후 마이그레이션 재적용
pnpm db:stop      # 종료
```

Studio(웹 UI)는 http://127.0.0.1:54323, API는 http://127.0.0.1:54321 이다.

마이그레이션은 `supabase/migrations/`에 두고, **로컬에서 먼저 검증한 뒤** 클라우드에 반영한다.

```bash
pnpm db:push:prod   # 클라우드에 마이그레이션 적용
```

### 배치 파이프라인 (TourAPI → Supabase)

```bash
pnpm batch:run SEOUL        # 로컬 DB에 적재 (기본)
pnpm batch:run:prod SEOUL   # 운영 클라우드 DB에 적재 (주의)
```

지역: `SEOUL` / `BUSAN` / `JEJU`. 운영 환경에서는 GitHub Actions 크론(`.github/workflows/batch-tour-api.yml`)이 매일 자동 실행하며, 이때 환경변수는 GitHub Secrets에서 주입되므로 `.env` 파일과 무관하다.

### 모바일 앱 실행

```bash
pnpm dev:mobile:ios
pnpm dev:mobile:android
```

iOS는 최초 1회 `cd apps/mobile/ios && pod install` 필요. Android는 `ANDROID_HOME` 환경변수 설정 필요.

## 환경 변수

| 파일 | 용도 | git |
|---|---|---|
| `apps/backend/.env` | **로컬 개발** (Docker DB). 평소엔 이것만 사용 | 제외 |
| `apps/backend/.env.production` | 운영 클라우드 Supabase. `:prod` 명령에서만 사용 | 제외 |
| `apps/backend/.env.example` | 템플릿 | 커밋 |
| `apps/mobile/.env.example` | 모바일 전용(카카오맵 JS 키 등) 템플릿 | 커밋 |

`apps/backend/.env.example`을 복사해 `.env`를 만들고, `pnpm db:start` 출력값(API URL / anon key / service_role key)을 채운다.

> **주의**: `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 관리자 키다. 서버/CI에만 두고 앱(클라이언트)에는 절대 넣지 않는다. `.env*`는 `.gitignore`로 제외되며, 커밋 시 secretlint pre-commit 훅이 한 번 더 걸러준다.
