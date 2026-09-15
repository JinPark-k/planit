import AppIntents

/// 잠금화면/Dynamic Island의 "다음 장소" 버튼(TripLiveActivityWidget에서
/// `Button(intent: NextStopIntent())`로 참조한다).
///
/// LiveActivityIntent로 채택하면 앱이 백그라운드거나 완전히 종료된 상태에서도
/// 시스템이 이 perform()을 앱 프로세스 안에서 대신 실행해 준다(위젯 익스텐션
/// 프로세스가 아니다) — 그래서 RN/JS 브리지를 거치지 않고, App Group에서
/// 직접 플랜을 읽어 TripLiveActivityController.advance()로 다음 프레임을
/// 계산/반영한다. 이 타입이 앱 타겟과 위젯 타겟 양쪽에 멤버십이 있어야 하는
/// 이유도 이것이다 — 버튼을 그리는 쪽(위젯)과 실제로 실행되는 쪽(앱 프로세스)
/// 둘 다 이 타입을 알아야 한다.
@available(iOS 17.0, *)
struct NextStopIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "다음 장소"
    static var description = IntentDescription("여행 일정을 다음 장소로 넘깁니다.")

    func perform() async throws -> some IntentResult {
        // TripLiveActivityController는 @available(iOS 16.2, *)이고 이 struct는
        // 17.0 전용이라 가용성 조건은 항상 만족한다.
        try await TripLiveActivityController.advance()
        return .result()
    }
}
