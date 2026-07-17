# LiveActivity (iOS)

`LiveActivityModule.swift`/`.m`은 React Native 쪽에서 호출 가능한 브리지 껍데기일 뿐, 아직 ActivityKit 연동이 구현되어 있지 않다.

Live Activities를 실제로 동작시키려면 파일 추가만으로는 부족하고 다음을 Xcode GUI에서 직접 해야 한다 (스크립트로 안전하게 자동화하기 어려움 — `project.pbxproj` 그래프를 직접 건드려야 함):

1. Xcode에서 `File > New > Target > Widget Extension` 추가 (예: `MobileWidgets`)
2. "Include Live Activity" 체크
3. 새 타겟에 `ActivityAttributes`/`ActivityContent` 정의
4. 메인 앱 타겟과 Widget Extension 타겟 양쪽에서 공유할 `ActivityAttributes` 구조체를 별도 Swift 파일로 분리
5. `LiveActivityModule.swift`에서 `Activity<T>.request(...)`로 실제 시작/업데이트/종료 구현
