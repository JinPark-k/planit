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

## 배포

백엔드는 Vercel에 올라가 있다: **https://planit-backend-omega.vercel.app**

앱의 `API_BASE_URL` 기본값이 이 주소라, 앱만 받아도 백엔드를 로컬에서 띄우지 않고 동작한다.

- Vercel 프로젝트: `jinpark-k/planit-backend`. 배포는 `npx vercel deploy --prod --cwd apps/backend`.
- 환경변수는 Vercel에 `SUPABASE_URL` / `SUPABASE_ANON_KEY`만 넣는다. `anon` 키는 `places`에
  `SELECT`만 허용돼 있다(`supabase/migrations/20260828000000_grant_table_privileges.sql`).
  **`SUPABASE_SERVICE_ROLE_KEY`는 넣지 않는다** — 읽기 API에 필요 없고 노출면만 넓힌다.
- 함수 리전은 `icn1`(서울). Supabase 프로젝트가 `ap-northeast-2`라 기본값(미국)이면 왕복이 느려진다.
- `api/index.js`가 **tsc 산출물(`dist/`)을 참조**한다. Vercel의 Node 런타임은 TypeScript를
  esbuild로 컴파일하는데, esbuild는 `emitDecoratorMetadata`를 지원하지 않아 Nest DI가
  에러 없이 `undefined`를 주입한다(부팅은 성공하고 엔드포인트 호출 시점에 터진다).
  그래서 빌드는 `nest build`에 맡긴다. 자세한 이유는 `apps/backend/api/index.js` 주석 참고.

### GitHub 연동

대시보드에서 저장소를 연결하고 Root Directory를 `apps/backend`,
`sourceFilesOutsideRootDirectory`를 켜 두었다. `main` push는 운영에, PR은 프리뷰에
배포된다. Vercel이 레포 전체를 클론해 워크스페이스 루트에서 pnpm으로 설치한다.

#### 백엔드와 무관한 PR은 배포하지 않는다

프로젝트 설정 `enableAffectedProjectsDeployments`를 켜 두었다. Vercel이 Root Directory와
워크스페이스 의존 관계를 보고 이 프로젝트가 영향을 받았는지 서버에서 판단한다.
실측으로 확인한 동작:

| 바뀐 곳 | 결과 |
|---|---|
| `apps/backend/**` | 배포 |
| `apps/mobile/**`만 | `Skipped - Not affected` |
| 백엔드 커밋 + 모바일 커밋을 한 번에 push | 배포 (tip이 모바일이어도 건너뛰지 않는다) |
| 루트 파일(`README.md`, `pnpm-lock.yaml`, `.github/**` …) | 배포 |

마지막 줄은 `sourceFilesOutsideRootDirectory`가 켜져 있어 루트도 빌드 입력으로 치기
때문이다. 문서만 고쳐도 배포가 도는 건 그래서다. 대신 `node-linker=hoisted` 때문에
루트 의존성이 바뀌면 백엔드 해석도 바뀌는데(PR #22), 그 경우가 자동으로 잡힌다.

`vercel.json`의 `ignoreCommand`로 직접 `git diff`를 돌리는 방법은 **쓸 수 없다.**
Vercel 빌드 환경의 클론에는 원격이 없고(`git remote -v`가 비어 있다) depth 10짜리
얕은 클론이라, `main`을 가져올 수도 `merge-base`를 구할 수도 없다. `HEAD^`로 폴백하면
커밋 여러 개를 한 번에 push했을 때 마지막 커밋만 검사해, 앞 커밋이 백엔드를 고쳤어도
건너뛴다. 실제로 그렇게 잘못 건너뛴 것을 확인했다(PR #27).

### 아직 안 한 설정

- **Deployment Protection** — `planit-backend-jinpark-k.vercel.app`은 Vercel 인증에 막혀 있다.
  공개 도메인은 위의 `planit-backend-omega.vercel.app` 하나다.

## 시작하기

```bash
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

### 백엔드 실행

```bash
pnpm dev:backend
```

### API 문서 (Swagger)

서버 기동 후 http://127.0.0.1:3000/docs 에서 엔드포인트를 확인하고 바로 호출해볼 수 있다.
OpenAPI JSON은 http://127.0.0.1:3000/docs-json 이며, Postman 등으로 임포트할 수 있다.

문서는 DTO의 `class-validator` 데코레이터에서 자동 생성된다(`nest-cli.json`의 `@nestjs/swagger` 플러그인).
따라서 요청 스펙을 바꿀 때는 DTO만 고치면 되고 문서를 따로 관리하지 않는다.
운영(`NODE_ENV=production`)에서는 기본 비활성이며 `SWAGGER_ENABLED=true`로 켤 수 있다.

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

앱을 띄우기 전에 `apps/mobile/.env.example`을 복사해 `apps/mobile/.env`를 만든다. 이 파일이 없어도
빌드는 성공하지만 `Config`가 빈 채로 돌아 `API_BASE_URL` 폴백값이 쓰이므로 증상이 눈에 띄지 않는다.

- `.env`를 고친 뒤에는 Metro 리로드로 반영되지 않는다. Android는 `dotenv.gradle`이 Gradle
  configuration 시점에 값을 읽어 `BuildConfig`로 굽기 때문에 **앱을 다시 빌드**해야 한다.
- 호스트 주소가 플랫폼마다 다르다. iOS 시뮬레이터는 `localhost`, Android 에뮬레이터는
  `10.0.2.2`가 호스트 PC다.
- **Android 에뮬레이터는 Wi-Fi를 꺼야 호스트에 붙는다** (`adb shell svc wifi disable`).
  Wi-Fi가 켜져 있으면 `wlan0`가 `10.0.2.0/24` 라우트를 가져가 앱의 기본 네트워크가
  `10.0.2.2`(= 호스트)에 도달하지 못하고, Metro 연결이 5초 타임아웃 뒤
  `Unable to load script`로 죽는다. `adb reverse`는 이 우회로가 되지 못한다(동작하지 않음).

## 환경 변수

| 파일 | 용도 | git |
|---|---|---|
| `apps/backend/.env` | **로컬 개발** (Docker DB). 평소엔 이것만 사용 | 제외 |
| `apps/backend/.env.production` | 운영 클라우드 Supabase. `:prod` 명령에서만 사용 | 제외 |
| `apps/backend/.env.example` | 템플릿 | 커밋 |
| `apps/mobile/.env.example` | 모바일 전용(카카오맵 JS 키 등) 템플릿 | 커밋 |

`apps/backend/.env.example`을 복사해 `.env`를 만들고, `pnpm db:start` 출력값(API URL / anon key / service_role key)을 채운다.

> **주의**: `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 관리자 키다. 서버/CI에만 두고 앱(클라이언트)에는 절대 넣지 않는다. `.env*`는 `.gitignore`로 제외되며, 커밋 시 secretlint pre-commit 훅이 한 번 더 걸러준다.
