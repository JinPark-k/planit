# 의도적으로 비어 있는 디렉터리

이 백엔드는 정적 파일을 서빙하지 않는다(모든 요청이 `api/index.js` 서버리스 함수로 간다).
하지만 `vercel.json`에 `buildCommand`가 있으면 Vercel이 빌드 후 정적 산출물 디렉터리를
찾고, 없으면 `No Output Directory named "public" found`로 배포를 실패시킨다.

그래서 빈 디렉터리를 두고 `outputDirectory`로 가리킨다.
`outputDirectory: "."`로 두면 소스 전체가 정적으로 노출되므로 쓰면 안 된다.
