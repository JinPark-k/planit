import Foundation

/// TS(src/native/types.ts)의 LiveTripPlan / LiveTripFramePayload와 1:1 대응하는
/// 순수 데이터 모델. Kotlin의 LiveTripPlan.kt와 마찬가지로 이 파일에는 여행
/// 도메인 로직이 전혀 없다 — JSON(RN 브리지 NSDictionary, App Group
/// UserDefaults 영속화) <-> Swift 값 사이의 변환과, "지금이 몇 번째 프레임인가"를
/// 고르는 2줄짜리 규칙만 담당한다. "무엇을 보여줄지/언제 Activity를 다시 띄울지"
/// 판단은 TripLiveActivityController에 있다.

struct TripSegment: Codable, Hashable {
    let minutes: Double
    let filled: Bool
}

struct TripFrame: Codable, Hashable {
    /// epoch ms. TS가 항상 ms 단위 숫자로 보낸다. Kotlin 쪽 주석과 같은 이유로
    /// Int64가 아니라 Double로 받는다 — RN 브리지/JSONSerialization을 거치는
    /// 경로에서 정수 타입으로 강제 디코딩하면 소수점 표현(예: 1.8e12) 때문에
    /// 실패할 여지가 있는데, Double은 그런 걱정이 없다.
    let at: Double
    let kind: String // "SHOW" | "HIDE" | "END" — TS의 유니언을 그대로 문자열로 받는다.
    let title: String?
    let body: String?
    let shortText: String?
    let segments: [TripSegment]?
    let progressMax: Double?
    let progressAt: Double?
    let progressPerMinute: Double?

    var date: Date { Date(timeIntervalSince1970: at / 1000) }
}

struct TripPlan: Codable {
    let tripId: String
    let title: String
    let frames: [TripFrame]

    /// Kotlin LiveUpdateModule.render()와 동일한 2줄 규칙.
    /// "지금 몇 번째 프레임을 보여줘야 하는가".
    func frameAt(now: Date) -> TripFrame? {
        frames.last { $0.date <= now }
    }

    /// 다음 재조정 시각(=staleDate)을 위한 다음 프레임.
    func nextFrameAt(now: Date) -> TripFrame? {
        frames.first { $0.date > now }
    }
}

extension TripPlan {
    /// RN 브리지가 넘기는 NSDictionary(JS 객체)를 그대로 받아 변환한다.
    /// Kotlin의 ReadableMap.toLiveTripPlan()처럼 필드를 하나하나 손으로
    /// 옮기지 않고, JSONSerialization -> Codable 자동 합성으로 유지보수
    /// 부담을 줄인다(필드가 늘어나도 이 파일을 고칠 필요가 없다).
    init(dictionary: NSDictionary) throws {
        let data = try JSONSerialization.data(withJSONObject: dictionary, options: [])
        self = try JSONDecoder().decode(TripPlan.self, from: data)
    }
}
