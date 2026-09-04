---
name: notion-task-branch
description: Notion Tasks DB("Tasks [UT]")에서 태스크를 찾아 로컬 브랜치를 만들고 Status를 Doing으로 전환한다. 사용자가 "노션에서 '{태스크 이름}' 보고 브랜치 만들어 줘" 같은 요청을 할 때 사용.
---

# Notion Task → Branch

Notion Tasks DB의 특정 태스크를 기준으로 작업용 git 브랜치를 만들고, 이후 PR이 머지되면 자동으로 해당 태스크를 Done 처리되도록 연결하는 워크플로.

## 연동 정보

- DB: Notion Tasks DB ("Tasks [UT]", Ultimate Tasks 템플릿)
- DB ID: 환경변수 `NOTION_DATABASE_ID`
- 인증: 환경변수 `NOTION_API_KEY` (Bearer 토큰)
- API 호출은 `curl`로 직접 수행하고, 응답은 `jq`로 필요한 필드만 추출한다 (MCP 서버 미사용).
- Status 속성 타입: `status`, 옵션: `To Do` / `Doing` / `Done`

## 보안

- `NOTION_API_KEY` 값은 절대 출력/로그하지 않는다. 항상 `Authorization: Bearer $NOTION_API_KEY`처럼 헤더에서만 참조한다.
- `curl -v` 등 요청 헤더를 그대로 노출하는 옵션은 쓰지 않는다.
- 이 값은 로컬 환경변수 / GitHub Actions Secrets에만 존재하며, 코드·문서 어디에도 실제 값을 적지 않는다.

## 절차

1. 사용자가 지정한 태스크 이름으로 Tasks DB를 조회한다 (`Name`이 정확히 일치하는 것 기준).
   - 정확히 일치하는 태스크가 하나면 그것을 사용한다.
   - 여러 개거나 하나도 없으면, 후보 목록(또는 검색 결과 없음)을 사용자에게 보여주고 확인을 요청한다. 임의로 추측해서 진행하지 않는다.
2. 해당 태스크의 Page ID와 본문(요구사항)을 조회한다.
3. 로컬에서 브랜치를 생성한다: `git checkout -b feature/notion-{page_id 전체}`
   - Page ID는 축약하지 않는다 (하이픈 포함 전체 UUID).
   - 태스크 이름(한글 포함)은 브랜치명에 넣지 않는다 — 대신 커밋 메시지/PR 제목에 적어 가독성을 확보한다.
   - PR 머지 시 `.github/workflows/notion-task-done.yml`이 브랜치명에서 Page ID를 파싱해 Notion Status를 Done으로 변경한다. 브랜치명 형식이 어긋나면 이 자동화가 동작하지 않는다.
4. 브랜치 생성 직후, 해당 태스크의 Notion Status를 Doing으로 업데이트한다 (다음 실행 시 같은 태스크가 다시 잡히지 않도록).
5. 노션 페이지 본문의 요구사항을 요약해서 사용자에게 보여주고, 확인을 받은 뒤에 실제 구현 코드를 작성한다. 확인 없이 바로 전체 구현을 진행하지 않는다.

## 참고

- 이 워크플로를 거치지 않고 그냥 만든 브랜치(`feature/notion-` 접두사가 아닌 경우)는 PR 머지 시 자동 Done 처리 대상이 아니다.
- 원격 자동화(`notion-task-done.yml`)가 동작하려면 GitHub Actions Secret `NOTION_API_KEY`가 등록되어 있어야 한다.
