import Foundation

/// App Group UserDefaults(group.com.mjj.planit)에 진행 중인 여행 플랜 +
/// 수동 오버라이드 상태를 저장한다.
///
/// 왜 App Group인가: 이 상태를 읽는 주체가 세 곳이다 — RN 브리지를 통해
/// 호출되는 앱 프로세스(LiveActivityModule/TripLiveActivityController),
/// 위젯 익스텐션 프로세스(TripLiveActivityWidget, 타임라인 프리뷰 등), 그리고
/// NextStopIntent(LiveActivityIntent — 앱 프로세스에서 백그라운드로 돈다).
/// 세 실행 주체가 같은 상태를 보려면 앱 전용 샌드박스인 표준 UserDefaults가
/// 아니라 그룹 컨테이너가 필요하다. Kotlin의 TripSessionStore(SharedPreferences)와
/// 같은 역할.
enum TripSessionStore {
    private static let suiteName = "group.com.mjj.planit"
    private static let keyPlan = "live_trip_plan_json"
    private static let keyOverrideIndex = "live_trip_override_index"
    private static let keyActivityId = "live_trip_activity_id"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    static func save(_ plan: TripPlan) {
        guard let data = try? JSONEncoder().encode(plan) else { return }
        defaults?.set(data, forKey: keyPlan)
    }

    static func load() -> TripPlan? {
        guard let data = defaults?.data(forKey: keyPlan) else { return nil }
        return try? JSONDecoder().decode(TripPlan.self, from: data)
    }

    /// 세션 전체를 정리한다. end() 및 "표시할 프레임이 더 없음" 경로에서 부른다.
    static func clear() {
        let store = defaults
        store?.removeObject(forKey: keyPlan)
        store?.removeObject(forKey: keyOverrideIndex)
        store?.removeObject(forKey: keyActivityId)
    }

    /// "다음 장소" 버튼(NextStopIntent)으로 수동 전진한 프레임 인덱스.
    /// nil이면 시각 기준 자동 판정만 쓴다. 저장값이 없을 때 UserDefaults.integer가
    /// 0을 돌려주는 것과 "인덱스 0으로 오버라이드함"을 구분하려고 -1을 "없음"
    /// 마커로 쓴다.
    static func overrideIndex() -> Int? {
        guard let store = defaults, store.object(forKey: keyOverrideIndex) != nil else { return nil }
        let value = store.integer(forKey: keyOverrideIndex)
        return value >= 0 ? value : nil
    }

    static func setOverrideIndex(_ index: Int?) {
        if let index {
            defaults?.set(index, forKey: keyOverrideIndex)
        } else {
            defaults?.removeObject(forKey: keyOverrideIndex)
        }
    }

    /// 현재 세션의 Activity.id. reconcile()에서 "이미 떠 있는 것과 같은
    /// 세션인지" 확인할 때 참고용으로 쓴다(현재는 activities 배열을 직접
    /// 순회하는 걸로 충분해 필수는 아니지만, 디버깅/향후 push 연동 대비로 남겨 둔다).
    static func activityId() -> String? {
        defaults?.string(forKey: keyActivityId)
    }

    static func setActivityId(_ id: String?) {
        if let id {
            defaults?.set(id, forKey: keyActivityId)
        } else {
            defaults?.removeObject(forKey: keyActivityId)
        }
    }
}
