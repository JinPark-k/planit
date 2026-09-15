import ActivityKit
import Foundation

/// LiveActivityModule(RN 브리지)과 NextStopIntent(백그라운드 App Intent) 양쪽이
/// 공유하는 단일 진입점. Kotlin의 LiveUpdateModule.companion과 같은 역할 —
/// "지금 뭘 보여줄지"를 계산하는 로직이 여기 한 곳에만 있어야 두 호출 경로
/// (JS 호출 vs 잠금화면 버튼)가 서로 어긋나지 않는다.
///
/// Android와 근본적으로 다른 제약이 두 가지 있고, 이 파일의 구조는 전부 그
/// 제약을 감당하기 위한 것이다:
///
/// 1. `Activity.request(...)`는 앱이 포그라운드일 때만 성공한다(ActivityKit
///    제약, Apple 문서 확인 완료). 한 번 끝난 Live Activity를 백그라운드에서
///    다시 띄울 방법이 없다(APNs 푸시는 이번 범위 밖).
/// 2. Live Activity는 시작 후 8시간이 지나면 시스템이 강제 종료하고, 종료
///    상태로 최대 4시간 더 잠금화면에 남는다(합 12시간). 하루 일정이
///    09:00~21:00(12시간)이면 첫날 오후에 시스템이 저절로 지워버릴 수 있다.
///
/// 그래서 refresh()의 핵심 책임은 "재조정(reconcile)"이다: 세션(플랜)은 아직
/// 살아 있는데 `Activity<TripActivityAttributes>.activities`가 비어 있으면
/// (8시간 캡으로 시스템이 지운 것) request()로 다시 띄운다. refresh()는 항상
/// JS(앱이 살아있는 포그라운드 컨텍스트)에서만 호출되므로 이 경로에서는
/// 포그라운드 제약을 항상 만족한다 — 이게 8시간 캡 이후의 유일한 복구 경로다.
///
/// 반대로 advance()는 NextStopIntent(LiveActivityIntent)에서 호출되는데, 이
/// Intent는 앱이 백그라운드/스와이프로 종료된 상태에서도 시스템이 대신
/// 실행해 줄 수 있다 — 그 시점엔 포그라운드 제약을 만족한다고 보장할 수
/// 없으므로 advance()는 절대 request()를 걸지 않는다(이미 떠 있는 Activity에
/// update만 하고, 없으면 포기한다 — 다음 refresh()가 복구한다).
@available(iOS 16.2, *)
enum TripLiveActivityController {

    /// RN의 start(). 앱이 포그라운드일 때만 호출된다는 전제(JS 쪽 정책)가
    /// 있어야 Activity.request가 성공한다.
    static func start(plan: TripPlan) async throws {
        TripSessionStore.save(plan)
        TripSessionStore.setOverrideIndex(nil)

        // 이전 세션의 Activity가 남아 있으면 정리한다 — 인스턴스가 여러 개
        // 남으면 잠금화면에 중복 카드가 뜬다.
        for activity in Activity<TripActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        TripSessionStore.setActivityId(nil)

        try await reconcile(plan: plan, requestIfMissing: true)
    }

    /// RN의 refresh() + 앱 foreground 복귀 훅에서 부른다. 위 클래스 주석의
    /// "재조정"이 이 함수의 존재 이유다.
    static func refresh() async throws {
        guard let plan = TripSessionStore.load() else { return }
        try await reconcile(plan: plan, requestIfMissing: true)
    }

    /// NextStopIntent(잠금화면 "다음 장소" 버튼)에서 부른다. RN/JS를 거치지
    /// 않고 App Group에서 직접 읽어 다음 프레임으로 넘긴다.
    static func advance() async throws {
        guard let plan = TripSessionStore.load(), !plan.frames.isEmpty else { return }
        let now = Date()
        let currentIndex = currentFrameIndex(plan: plan, now: now)
        let nextIndex = currentIndex + 1
        guard plan.frames.indices.contains(nextIndex) else { return }

        TripSessionStore.setOverrideIndex(nextIndex)
        // requestIfMissing: false — 클래스 주석의 제약 2번 때문에 여기서는
        // 절대 새로 띄우지 않는다.
        try await applyFrame(plan: plan, frameIndex: nextIndex, requestIfMissing: false)
    }

    /// RN의 end(). HIDE와 달리 END만 실제로 Activity를 종료한다 — HIDE
    /// 프레임 해석은 applyFrame() 안에 있다.
    static func end() async {
        for activity in Activity<TripActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        TripSessionStore.clear()
    }

    // MARK: - Private

    private static func reconcile(plan: TripPlan, requestIfMissing: Bool) async throws {
        let now = Date()
        let index = currentFrameIndex(plan: plan, now: now)
        guard plan.frames.indices.contains(index) else {
            await end()
            return
        }
        try await applyFrame(plan: plan, frameIndex: index, requestIfMissing: requestIfMissing)
    }

    /// 시각 기준 인덱스와 수동 오버라이드(다음 장소 버튼) 인덱스 중 더 뒤에
    /// 있는 쪽을 쓴다 — 오버라이드는 "적어도 여기까지는 넘어갔다"는 하한선
    /// 역할만 하고, 시간이 흘러 자연히 그 이후 프레임에 도달하면 다시 시각
    /// 기준을 따른다.
    private static func currentFrameIndex(plan: TripPlan, now: Date) -> Int {
        // TripPlan.frameAt(now:)와 같은 2줄 규칙을 인덱스로 계산한다(값이 아니라
        // 인덱스가 필요해서 firstIndex(of:)로 값 비교하는 대신 직접 lastIndex를 쓴다).
        let timeIndex = plan.frames.lastIndex { $0.date <= now } ?? -1
        let overrideIndex = TripSessionStore.overrideIndex() ?? -1
        return max(timeIndex, overrideIndex)
    }

    private static func applyFrame(plan: TripPlan, frameIndex: Int, requestIfMissing: Bool) async throws {
        let frame = plan.frames[frameIndex]

        // HIDE와 END는 프레임 kind로만 판단하고, 둘의 처리는 완전히 다르다:
        // 이 프로젝트의 iOS 결정적 제약 때문이다. Android는 HIDE에서 알림을
        // 실제로 "내린다"(취소). 하지만 iOS Live Activity는 한번 end()하면
        // (포그라운드 제약 때문에) 나중에 자동으로 다시 띄울 방법이 없다 —
        // 그래서 HIDE에서 end()하면 "오늘 일정이 끝났어요" 문구를 보여줄 방법이
        // 사라져 버린다. HIDE 프레임에도 title/body(야간 문구)가 들어있으므로
        // SHOW와 동일하게 ContentState로 반영해 표시를 유지한다. END에서만
        // 실제로 종료한다(다음 여행이 오늘 새로 start()될 것이기 때문에
        // 끝내도 안전하다).
        if frame.kind == "END" {
            await end()
            return
        }

        let nextFrame = plan.frames.indices.contains(frameIndex + 1) ? plan.frames[frameIndex + 1] : nil
        let (rangeStart, rangeEnd) = progressRange(for: frame)

        let state = TripActivityAttributes.ContentState(
            title: frame.title ?? plan.title,
            body: frame.body ?? "",
            shortText: frame.shortText,
            segments: frame.segments?.map { TripActivityAttributes.ContentState.ProgressSegment(minutes: $0.minutes, filled: $0.filled) },
            progressRangeStart: rangeStart,
            progressRangeEnd: rangeEnd,
            frameIndex: frameIndex,
            frameAt: frame.date,
            nextFrameAt: nextFrame?.date
        )

        // staleDate = 다음 프레임 시각. 갱신(reconcile)이 그 시각을 넘기도록
        // 밀리면 위젯이 context.isStale로 스스로 알아채게 한다.
        let content = ActivityContent(state: state, staleDate: nextFrame?.date)

        if let activity = Activity<TripActivityAttributes>.activities.first {
            await activity.update(content)
        } else if requestIfMissing {
            let activity = try Activity<TripActivityAttributes>.request(
                attributes: TripActivityAttributes(tripId: plan.tripId, tripTitle: plan.title),
                content: content,
                pushType: nil
            )
            TripSessionStore.setActivityId(activity.id)
        }
        // requestIfMissing == false인데 Activity가 없으면 아무 것도 하지
        // 않는다(advance()의 백그라운드 인텐트 경로) — 다음 refresh()가
        // 포그라운드에서 복구한다.
    }

    /// frame.progressAt + 경과분 * progressPerMinute을 [0, progressMax]로
    /// clamp하는 1차식(Kotlin TripNotifier.interpolatedProgress와 동일한 수식)을
    /// "진행률이 0/최댓값에 도달하는 시각"으로 미리 풀어 둔다. 위젯은 이 두
    /// 시각 사이를 ProgressView(timerInterval:)에 그대로 넘기기만 하면
    /// SwiftUI가 갱신 호출 없이 스스로 보간해 그린다.
    private static func progressRange(for frame: TripFrame) -> (Date?, Date?) {
        guard let progressMax = frame.progressMax, progressMax > 0 else { return (nil, nil) }
        let progressAt = frame.progressAt ?? 0
        let perMinute = frame.progressPerMinute ?? 1.0
        guard perMinute > 0 else { return (nil, nil) }

        let minutesToZero = -progressAt / perMinute
        let minutesToMax = (progressMax - progressAt) / perMinute
        let start = frame.date.addingTimeInterval(minutesToZero * 60)
        let end = frame.date.addingTimeInterval(minutesToMax * 60)
        // ProgressView(timerInterval:)는 ClosedRange라 lowerBound <= upperBound가
        // 반드시 성립해야 한다 — 이상한 입력(progressAt > progressMax 등)으로
        // 역전되면 진행바를 아예 그리지 않는다(세그먼트 막대는 별도로 남는다).
        guard start <= end else { return (nil, nil) }
        return (start, end)
    }
}
