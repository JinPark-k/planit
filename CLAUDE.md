# 프로젝트 개요

국내 도시 여행 서비스. 사용자가 키워드를 선택하면 여행지를 추천하고, 스케줄표 형태의 여행 일정을 짜준다.

# 기술 스택

- 백엔드: NestJS (TypeScript)
- 앱: React Native (TypeScript)
- 웹(선택): Next.js (TypeScript)
- DB: Supabase (PostgreSQL)
- 배포: Vercel(Hobby)로 시작 → 필요 시 Oracle Cloud/AWS 등 다른 인프라로 전환 가능한 구조 유지 (비즈니스 로직과 배포 어댑터를 분리해서 작성)

# 데이터 소스 & 배치

- 관광지 원본 데이터: TourAPI (한국관광공사, 공공데이터포털) — 무료, 실시간 호출 대신 배치로 수집
- 배치는 GitHub Actions 크론으로 실행: TourAPI 수집 → 정제 → DB 저장
- 배치 파이프라인은 지역코드를 파라미터로 받아 도시 단위로 재사용 가능하게 설계 (`run_batch_pipeline(region_code)` 형태)
- 초기에는 일부 도시(예: 서울/부산/제주)만 우선 지원, 이후 지역 확장

# 일정 생성 알고리즘

LLM 미사용, 규칙 기반으로 구현 (비용 예측 가능성 때문에 확정).

1. 키워드 → 태그 매핑 테이블로 필터링
2. 스코어링: 태그 일치도 + 인기도 + 평점 가중합
3. 그리디 방식 지역 클러스터링으로 일차별 그룹 나누기
4. 카테고리(관광/맛집/액티비티 등) + 시간대 기준으로 일차 내 순서 배치
5. 출력은 스케줄표 데이터(장소명, 시간, 이동시간)만 — 문장/설명 생성 단계 없음

## 향후 고도화 예정 (지금 구현 범위 아님, 설계 시 확장 여지만 남겨둘 것)

- **식사 장소 고정(예약)**: 사용자가 특정 식당을 특정 시각에 예약해서 일정에 고정하고 싶은 경우. 현재 `orderWithinDay`의 점심/저녁 앵커(스코어 1·2위 FOOD를 골라 12:00/18:00 이후 첫 타이밍에 배치하는 소프트 방식)를 "지정 장소 + 정확한 시각"의 하드 앵커로 일반화하면 구현 가능 — 앵커 사이를 최근접으로 채우는 현재 구조는 재사용.
- **영업시간 고려**: `Place`에 영업시간 필드 추가 후, 장소 선택 단계에서 도착 예정 시각에 영업 중인 후보만 필터링. 알고리즘보다 TourAPI 영업시간 텍스트(비정형)를 파싱/정규화하는 데이터 정제가 관건.
- **날씨 고려**: 외부 기상 API 연동 필요 (`infra/weather` 신규). 실외 카테고리(관광/액티비티) 장소를 우천 시 제외/후순위 배치하는 정책 설계 필요. 여행일이 미래인 경우 예보 정확도 이슈 있어, 임박 시점 재생성 흐름도 함께 고려.

# 이동시간 계산

- MVP: 하버사인 거리 계산 + 보정계수(도심 1.2~1.4)로 근사, 화면엔 "약 n분" 형태로 추정치임을 표시
- `getTravelTime(placeA, placeB, mode)` 형태로 모듈화해서, 나중에 실제 경로 데이터로 교체할 때 이 함수 내부만 바꾸면 되도록 설계 (스코어링/클러스터링 로직은 건드리지 않음)

# 지도 / 길찾기

- 지도 표시: 카카오맵 JS SDK (마커 + 직선 연결, 무료)
- 실제 길찾기: 카카오맵/구글맵 딥링크로 위임
  - 카카오맵: `kakaomap://route?sp=...&ep=...&vp1=...&by=CAR` (경유지 최대 5개)
  - 구글맵: `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
  - 앱 미설치 시 스토어로 유도하는 예외처리 필요

# 앱 전용 요구사항 (네이티브 모듈 필요)

- 안드로이드: Live Updates (Android 16+ 표준 API, `Notification.ProgressStyle`) — 갤럭시 NowBar는 이 표준 API를 감지해 자동으로 확장 표시됨. 용도: 현재 일정 / 다음 일정을 잠금화면에 실시간 표시
- iOS: Live Activities (ActivityKit) — 동일 용도
- React Native 자체 지원 기능이 아니므로 각각 Kotlin / Swift 네이티브 모듈로 별도 구현

# Git 워크플로

- `main`에 직접 push하지 않습니다. 모든 변경은 브랜치를 만들고 PR을 거쳐 머지합니다.
- Notion 태스크 기반 작업은 `feature/notion-{page_id}` 브랜치를 사용합니다 (아래 Notion 연동 워크플로 참고).
- 그 외 작업은 `feature/{설명}` 또는 `fix/{설명}` 형태의 브랜치를 사용합니다.
- PR 머지는 squash merge를 사용합니다 (`main`에 PR당 커밋 하나로 남도록).

## 시크릿 관리

- 비밀번호, API 키/토큰, `.env` 파일 등 민감 정보는 어떤 브랜치에도 커밋하지 않습니다. 코드/문서에는 값이 아니라 환경변수 이름(`$SUPABASE_SERVICE_ROLE_KEY`, `secrets.NOTION_API_KEY` 등)만 참조합니다.
- 실제 값은 로컬 `.env`(git 추적 제외, `.env.example`만 커밋) 또는 GitHub Actions Secrets에만 둡니다.
- `curl -v`처럼 요청 헤더를 그대로 출력하는 옵션 등, 터미널 출력에 토큰이 노출될 수 있는 명령은 쓰지 않습니다.
- `git add` 전에는 `git status`/`git diff`로 스테이징 내용을 확인하고, 커밋 직전 의심스러운 파일(설정 파일, 키 이름이 들어간 파일 등)은 내용을 다시 확인합니다.
- 실수로 시크릿이 커밋된 경우 즉시 알리고, 단순 삭제 커밋이 아니라 해당 값 자체를 폐기(rotate)하는 것을 우선 검토합니다 — 이미 push된 히스토리에는 값이 남아있기 때문입니다.

### 자동 검사 (pre-commit hook)

- `secretlint`가 husky `pre-commit` 훅으로 연결되어 있어(`.husky/pre-commit`), 스테이징된 파일에 알려진 시크릿 패턴(AWS/GCP/Notion/Supabase 등)이 있으면 커밋 자체가 차단됩니다.
- 훅은 `pnpm install` 시(`prepare` 스크립트) 자동 설치되므로 별도 설정이 필요 없습니다.
- 규칙 정의는 `.secretlintrc.json`. 전체 저장소를 수동으로 검사하려면 `pnpm run scan:secrets`.
- **주의**: 이건 알려진 패턴 기반 탐지라 100% 탐지를 보장하지 않습니다. 위의 수동 체크리스트(값 대신 env 이름 참조, `curl -v` 금지 등)는 계속 지켜야 합니다.

# Notion 연동 (Task → Branch 워크플로)

- "노션에서 '{태스크 이름}' 보고 브랜치 만들어 줘" 같은 요청은 `.claude/skills/notion-task-branch/SKILL.md`를 따릅니다 (전체 절차·보안 규칙 포함).
- 원격 워크플로(`.github/workflows/notion-task-done.yml`)가 `feature/notion-*` 브랜치의 PR 머지를 감지해 자동으로 해당 Notion 태스크 Status를 `Done`으로 변경합니다. 필요한 GitHub Actions Secret: `NOTION_API_KEY`.

# GitHub Actions 워크플로 작성 규칙

- `run:` 값에 `: `(콜론+공백)이 포함되면(예: `echo "TODO: ..."`) 반드시 작은따옴표로 전체를 감쌉니다 (`run: 'echo "TODO: ..."'`). YAML plain scalar에서 `: `는 매핑 구분자로 오인되어 파일 전체 파싱이 조용히 깨집니다.
  - **Why**: `batch-tour-api.yml`이 이 문제로 생성 시점부터 `workflow_dispatch` 수동 실행 불가 + 크론 실행마다 "failed" 메일이 발생했으나, GitHub UI/`gh api`로는 증상이 바로 드러나지 않았습니다.
- 워크플로 YAML을 수정한 뒤에는 커밋 전에 로컬에서 파싱 검증합니다: `ruby -ryaml -e "YAML.load_file('.github/workflows/파일명.yml')"` (별도 YAML 린터 설치 없이 macOS 기본 Ruby로 가능).
