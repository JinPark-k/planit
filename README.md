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

### 배치 파이프라인 (placeholder, 아직 미구현)

```bash
pnpm batch:run SEOUL
```

### 모바일 앱 실행

```bash
pnpm dev:mobile:ios
pnpm dev:mobile:android
```

iOS는 최초 1회 `cd apps/mobile/ios && pod install` 필요. Android는 `ANDROID_HOME` 환경변수 설정 필요.

## 환경 변수

루트 `.env.example`(Supabase/TourAPI 키)과 `apps/mobile/.env.example`(카카오맵 JS 키 등 모바일 전용 값)을 참고해 각각 `.env`를 만든다.
