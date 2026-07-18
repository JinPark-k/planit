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

# Notion 연동 (Task → Branch 워크플로)

## 연동 정보
- Notion Tasks DB("Tasks [UT]", Ultimate Tasks 템플릿 기준)와 연동되어 있습니다.
- DB ID: 환경변수 `NOTION_DATABASE_ID`
- 인증: 환경변수 `NOTION_API_KEY` (Bearer 토큰)
- API 호출은 `curl`로 직접 수행하고, 응답은 `jq`로 필요한 필드만 추출해서 사용합니다 (MCP 서버 미사용).
- **보안: `NOTION_API_KEY` 값은 절대 출력/로그하지 않습니다.** 항상 `Authorization: Bearer $NOTION_API_KEY`처럼 헤더에서만 참조하고, `curl -v` 등 헤더를 그대로 노출하는 옵션은 쓰지 않습니다. 이 값은 로컬 환경변수 / GitHub Actions Secrets에만 존재하며 코드·문서 어디에도 실제 값을 적지 않습니다.

## Status 속성
- 타입: `status`
- 옵션: `To Do` / `Doing` / `Done`

## 로컬 워크플로: 브랜치 생성
1. 사용자가 "노션에서 '{태스크 이름}' 보고 브랜치 만들어 줘"라고 명령하면, Tasks DB에서 `Name`이 해당 문자열과 일치하는 태스크를 조회합니다.
   - 정확히 일치하는 태스크가 하나면 그것을 사용합니다.
   - 여러 개거나 하나도 없으면, 후보 목록(또는 검색 결과 없음)을 보여주고 사용자에게 확인을 요청합니다. 임의로 추측해서 진행하지 않습니다.
2. 해당 태스크의 `Page ID`와 본문(요구사항)을 조회합니다.
3. 로컬에서 브랜치를 생성합니다: `git checkout -b feature/notion-{page_id 전체}`
   - Page ID는 축약하지 않습니다. 태스크 이름(한글 포함)은 브랜치명에 넣지 않고, 대신 커밋 메시지/PR 제목에 적어 가독성을 확보합니다.
   - PR 머지 시 GitHub Action(`.github/workflows/notion-task-done.yml`)이 브랜치명에서 Page ID를 파싱해 Notion Status를 `Done`으로 변경합니다.
4. 브랜치 생성 직후, 해당 태스크의 Notion `Status`를 `Doing`으로 업데이트합니다 (다음 실행 시 같은 태스크가 다시 잡히지 않도록).
5. 노션 페이지 본문의 요구사항을 요약해서 보여주고, 사용자 확인을 받은 뒤에 실제 구현 코드를 작성합니다. 확인 없이 바로 전체 구현을 진행하지 않습니다.

## 원격 워크플로: PR 머지 → Done 처리
- `.github/workflows/notion-task-done.yml`이 `feature/notion-*` 브랜치의 PR이 머지되면 자동으로 해당 Notion 태스크 Status를 `Done`으로 변경합니다.
- 필요한 GitHub Actions Secret: `NOTION_API_KEY`
