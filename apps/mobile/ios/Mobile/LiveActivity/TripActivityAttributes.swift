import ActivityKit
import Foundation

/// 앱(TripLiveActivityController)과 위젯 익스텐션(TripLiveActivityWidget)이
/// 공유하는 Live Activity 스키마. ActivityAttributes는 세션 동안 불변인 값,
/// ContentState는 update()/staleDate로 매번 바뀌는 값이다.
///
/// TripFrame(TripPlan.swift, TS 페이로드 그대로)과 필드가 비슷해 보이지만
/// 동일 타입이 아니다 — 여기 있는 건 "위젯이 그리는 데 필요한 것" 기준으로
/// 다시 고른 값이다. 특히 kind("SHOW"/"HIDE"/"END")는 여기 없다: 그 판단은
/// TripLiveActivityController가 이미 끝내고, END면 ContentState를 만들지 않고
/// Activity 자체를 끝낸다(HIDE는 SHOW와 마찬가지로 title/body를 그대로 담은
/// ContentState가 된다 — iOS는 Android처럼 "알림을 내린다"는 개념이 없고 표시를
/// 유지해야 하기 때문. 자세한 이유는 TripLiveActivityController 주석 참고).
struct TripActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// 화면에 필요한 최소 세그먼트 표현. Android TripNotifier의
        /// 채워진/안 채워진 구간 막대와 같은 정보를 쓴다.
        struct ProgressSegment: Codable, Hashable {
            let minutes: Double
            let filled: Bool
        }

        var title: String
        var body: String
        var shortText: String?
        var segments: [ProgressSegment]?

        /// ProgressView(timerInterval:)에 그대로 넘기기 위한 구간 — 이 진행률이
        /// 0에 도달하는 시각과 progressMax(=100%)에 도달하는 시각. 컨트롤러가
        /// frame.progressAt/progressMax/progressPerMinute의 1차식을 미리 풀어서
        /// 두 시각으로 환산해 넘긴다. 위젯은 이 값을 매번 다시 계산하지 않고
        /// SwiftUI의 시간 기반 자동 보간만 쓴다 — update() 호출 없이도 진행바가
        /// 스스로 흐르는 이유가 이것이다.
        var progressRangeStart: Date?
        var progressRangeEnd: Date?

        /// 디버깅/"마지막 프레임인가" 판단용. frames 배열 안에서의 위치.
        var frameIndex: Int
        /// 현재 표시 중인 프레임이 시작된 시각.
        var frameAt: Date
        /// 다음 프레임 시각. nil이면 이게 마지막 프레임 — 카운트다운/진행바를
        /// 표시하지 않는다. staleDate 계산의 기준이기도 하다.
        var nextFrameAt: Date?
    }

    var tripId: String
    var tripTitle: String
}
