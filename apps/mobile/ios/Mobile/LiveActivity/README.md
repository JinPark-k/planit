# LiveActivity (iOS)

TS(`src/native/types.ts`)가 여행 일정을 절대시각 프레임 목록으로 미리 평탄화해서
넘기고, 네이티브에는 여행 도메인 로직을 두지 않는다는 계약은 Android
(`android/.../liveupdate/`)와 같다. 이 디렉터리는 그 계약을 iOS에서 구현한다.

## 구조

```
ios/Mobile/LiveActivity/          앱 타겟 전용 + 앱/위젯 공유 소스
  LiveActivityModule.swift/.m     RN 브리지 (앱 타겟 전용)
  TripActivityAttributes.swift    Activity 스키마 (공유)
  TripPlan.swift                  TS 페이로드 <-> Swift 모델 변환 (공유)
  TripSessionStore.swift          App Group UserDefaults 저장소 (공유)
  TripLiveActivityController.swift  start/refresh/advance/end 단일 진입점 (공유)
  NextStopIntent.swift            잠금화면 "다음 장소" 버튼 (공유, iOS 17+)

ios/PlanitLiveActivity/           Widget Extension 타겟 전용
  PlanitLiveActivityBundle.swift  @main WidgetBundle
  TripLiveActivityWidget.swift    잠금화면 + Dynamic Island 뷰
  Info.plist, PlanitLiveActivity.entitlements
```

"공유" 파일은 앱 타겟과 위젯 타겟 양쪽에 멤버십이 있다(pbxproj의 Sources 빌드
페이즈에 두 번 등록됨). `NextStopIntent`가 대표적인 이유: `LiveActivityIntent`는
버튼을 그리는 위젯 프로세스가 아니라 **앱 프로세스에서 백그라운드로** 실행되므로,
버튼을 그리는 쪽(위젯)과 실제로 실행되는 쪽(앱) 둘 다 이 타입을 알아야 한다.

## 프로젝트 구조는 스크립트로 만든다

Xcode GUI로 "File > New > Target > Widget Extension"을 누르는 대신
**`ios/scripts/add_live_activity_target.rb`**가 `project.pbxproj` 그래프를
직접 조작해 위젯 타겟 생성, 소스 등록, Embed 빌드 페이즈, 서명 설정을 전부
한다. `xcodeproj` gem(1.27.0)이 시스템 루비(2.6.10)에서 바로 동작하는 걸
확인했다.

```
ruby ios/scripts/add_live_activity_target.rb
```

여러 번 실행해도 안전하다(idempotent) — 이미 있는 타겟/파일/빌드 페이즈
항목은 건너뛰고 없는 것만 만든다. 프로젝트 구조를 바꿔야 할 때는(예: 위젯에
소스 파일 추가) 이 스크립트를 고쳐서 다시 실행하는 걸 기본으로 하고, GUI는
꼭 필요할 때만 보조적으로 쓴다 — 어느 쪽으로 건드리든 diff가 pbxproj에 남아
리뷰가 가능하다.

## iOS의 결정적 제약과 이 코드가 그걸 감당하는 방식

Apple 문서로 확인한 사실 두 가지가 이 구현 전체의 모양을 결정한다
(자세한 이유는 `TripLiveActivityController.swift` 상단 주석 참고):

1. **`Activity.request(...)`는 앱이 포그라운드일 때만 성공한다.** 한 번
   `end()`한 Live Activity를 나중에 자동으로 다시 띄울 방법이 없다(APNs
   푸시 제외 — 이번 범위 밖).
2. **Live Activity는 시작 후 8시간이 지나면 시스템이 자동 종료**하고,
   종료 상태로 잠금화면에 최대 4시간 더 남는다(합 12시간).

그래서:
- **HIDE 프레임에서 `end()`하지 않는다.** Android는 알림을 실제로 내리지만
  iOS는 표시를 유지한다 — HIDE 프레임의 title/body(야간 문구)를 그대로
  ContentState에 반영한다. **END에서만 실제로 종료**한다.
- **`refresh()`의 핵심 책임은 재조정(reconcile)**이다: 세션은 살아 있는데
  `Activity<TripActivityAttributes>.activities`가 비어 있으면(8시간 캡으로
  시스템이 지운 것) `request()`로 다시 띄운다. `refresh()`는 항상 앱이
  포그라운드인 컨텍스트(JS 호출)에서만 불리므로 이 경로가 8시간 캡 이후의
  유일한 복구 경로다.
- **`NextStopIntent.perform()`(잠금화면 버튼)은 절대 `request()`를 걸지
  않는다** — 백그라운드에서 실행될 수 있어 포그라운드 제약을 만족한다고
  보장할 수 없기 때문이다. 이미 떠 있는 Activity에 `update`만 하고, 없으면
  포기한다(다음 `refresh()`가 복구한다).
- 위젯 뷰는 `Text(timerInterval:)`/`ProgressView(timerInterval:)`를 써서
  갱신 호출 없이도 카운트다운/진행바가 스스로 흐르게 한다.
  `TripLiveActivityController`가 진행률 1차식(progressAt/progressPerMinute/
  progressMax)을 "0%/100%에 도달하는 시각"으로 미리 풀어서 넘기는 이유가
  이것이다 — 위젯은 그 두 시각 사이를 SwiftUI에 맡기기만 하면 된다.
- `Activity.update`는 `ActivityContent(state:staleDate:)`로 하고
  `staleDate`를 다음 프레임 시각으로 잡는다 — 갱신이 밀리면 위젯이
  `context.isStale`로 스스로 판단한다.

## getCapability()

```
iOS < 16.2                                  → supported:false, reason:OS_TOO_OLD
ActivityAuthorizationInfo().areActivitiesEnabled == false
                                            → supported:true, allowed:false, reason:PERMISSION_DENIED
그 외                                        → supported:true, allowed:true, statusBar:true
```

## Apple 개발자 포털 설정 (이미 완료됨)

- App ID `com.mjj.planit.LiveActivity` (App Groups 활성화)
- App Group `group.com.mjj.planit` — 앱/위젯 두 App ID 모두에 할당
- 프로비저닝 프로파일: `planit AppStore`(앱), `planit LiveActivity AppStore`(위젯)
- Live Activities는 별도 capability/entitlement가 없다 — 앱 Info.plist의
  `NSSupportsLiveActivities` 키만 있으면 된다. 포털에서 찾지 말 것.

## 로컬 빌드 검증

```
cd apps/mobile/ios
xcodebuild -workspace Mobile.xcworkspace -scheme planit \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  build
```

`PlanitLiveActivity.appex`가 `planit.app/PlugIns/` 아래 임베드되는지 빌드
산출물로 확인할 수 있다. iOS는 CI가 없으므로 로컬 빌드가 유일한 검증이다.
