import ActivityKit
import WidgetKit
import SwiftUI

/// 잠금화면 + Dynamic Island에 여행 진행 상황을 그린다.
///
/// 이 파일은 프레임을 다시 계산하지 않는다 — TripActivityAttributes.ContentState는
/// 이미 TripLiveActivityController가 "지금 뭘 보여줄지" 판단을 끝낸 결과다.
/// 여기서 하는 일은 그 값을 그리는 것과, 진행바/카운트다운을 시간 기반으로
/// 자동 보간되게 두는 것뿐이다(Text/ProgressView(timerInterval:)를 쓰면
/// update() 호출 없이도 시스템이 매초 다시 그려준다 — 배터리 비용 없이
/// "실시간처럼" 보이는 핵심 트릭).
struct TripLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TripActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.title)
                        .font(.caption)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    CountdownText(state: context.state)
                        .font(.caption2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(context: context)
                }
            } compactLeading: {
                Image(systemName: "figure.walk")
            } compactTrailing: {
                CountdownText(state: context.state)
                    .font(.caption2)
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "figure.walk")
            }
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(context.state.title)
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                CountdownText(state: context.state)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(context.state.body)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            ProgressSection(state: context.state)

            if context.isStale {
                StaleHint()
            }
        }
        .padding(16)
        // 브랜드 컬러가 아직 정해지지 않아 임시로 고른 값이다(Android
        // TripNotifier의 FILLED/UNFILLED_SEGMENT_COLOR 주석과 같은 사정).
        // 나중에 디자인 시스템이 나오면 여기와 SegmentedProgressBar만 바꾸면 된다.
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.white)
    }
}

private struct ExpandedBottomView: View {
    let context: ActivityViewContext<TripActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(context.state.body)
                .font(.caption)
                .lineLimit(2)

            ProgressSection(state: context.state)

            if context.state.nextFrameAt != nil {
                // Button(intent:)는 iOS 17+ 전용(AppIntents의 LiveActivityIntent).
                // 16.2~16.x에서는 버튼 없이 정보만 보여준다.
                if #available(iOS 17.0, *) {
                    Button(intent: NextStopIntent()) {
                        Label("다음 장소", systemImage: "arrow.right.circle")
                    }
                    .font(.caption2)
                }
            }

            if context.isStale {
                StaleHint()
            }
        }
    }
}

/// 다음 프레임까지 남은 시간을 스스로 흘러가는 카운트다운으로 보여준다.
/// Text(timerInterval:)은 시스템이 관리하는 타이머라 update() 호출 없이도
/// 매초 갱신된다 — 반자동인 티가 크게 준다.
private struct CountdownText: View {
    let state: TripActivityAttributes.ContentState

    var body: some View {
        if let nextFrameAt = state.nextFrameAt, nextFrameAt > .now {
            Text(timerInterval: Date.now...nextFrameAt, countsDown: true)
                .monospacedDigit()
        }
    }
}

/// 진행바 표시 우선순위: 1차식을 미리 풀어 둔 progressRange가 있으면
/// ProgressView(timerInterval:)로 자동 보간되는 막대를, 없으면(예: 세그먼트만
/// 있고 진행률 정보가 없는 프레임) 정적인 세그먼트 막대를 보여준다.
private struct ProgressSection: View {
    let state: TripActivityAttributes.ContentState

    var body: some View {
        if let start = state.progressRangeStart, let end = state.progressRangeEnd, start <= end {
            ProgressView(timerInterval: start...end, countsDown: false)
                .tint(.accentColor)
        } else if let segments = state.segments, !segments.isEmpty {
            SegmentedProgressBar(segments: segments)
                .frame(height: 6)
        }
    }
}

private struct SegmentedProgressBar: View {
    let segments: [TripActivityAttributes.ContentState.ProgressSegment]

    var body: some View {
        GeometryReader { geo in
            let total = max(segments.reduce(0) { $0 + $1.minutes }, 1)
            HStack(spacing: 2) {
                ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                    Capsule()
                        .fill(segment.filled ? Color.accentColor : Color.gray.opacity(0.3))
                        .frame(width: geo.size.width * CGFloat(segment.minutes / total))
                }
            }
        }
    }
}

private struct StaleHint: View {
    var body: some View {
        // staleDate(다음 프레임 시각)가 지나도록 refresh()가 호출되지
        // 않았다는 뜻 — 갱신이 밀렸다고 사용자에게 알려준다. 에러처럼 보이지
        // 않게 톤을 낮춘다.
        Text("앱을 열면 최신으로 갱신돼요")
            .font(.caption2)
            .foregroundStyle(.orange)
    }
}
