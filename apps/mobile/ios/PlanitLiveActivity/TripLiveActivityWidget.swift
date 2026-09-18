import ActivityKit
import WidgetKit
import SwiftUI

/// apps/mobile/src/theme/colors.ts의 브랜드 토큰을 옮겨온 값.
///
/// `Color.accentColor`를 쓰고 있었지만 이 타깃의 Images.xcassets에 AccentColor
/// 컬러셋이 없어서 시스템 기본 파랑으로 렌더됐다. 자산 카탈로그에 기대지 않고
/// 값을 명시한다.
///
/// TS 토큰과 자동으로 동기화되지 않는다. 팔레트를 바꾸면 여기와 Android의
/// TripNotifier 상수도 같이 손대야 한다(CI가 Swift/Kotlin을 컴파일하지 않으므로
/// PR에서 잡히지 않는다).
private enum PlanItBrand {
    /// accent — Trail Purple #6B33CC. 진행바의 채워진 구간(= 지나온 경로).
    static let accent = Color(red: 107 / 255, green: 51 / 255, blue: 204 / 255)
    /// placeholder — #E1DCE9. 아직 지나지 않은 구간.
    static let track = Color(red: 225 / 255, green: 220 / 255, blue: 233 / 255)
    /// text — Ink #1F182A. 잠금화면 카드 배경 틴트에 쓴다.
    static let ink = Color(red: 31 / 255, green: 24 / 255, blue: 42 / 255)
}

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

            // 잠금화면에도 버튼을 둔다. Dynamic Island 확장 뷰에만 두면 이 기능을
            // 쓸 수 있는 사람이 Pro 모델 사용자 중 섬을 길게 눌러 본 사람으로
            // 줄어든다. 게다가 시작 화면이 "다음 장소로 넘기려면 잠금화면 버튼을
            // 누르거나 앱을 열면 됩니다"라고 약속하고 있어서, 여기 버튼이 없으면
            // 앱이 거짓말을 하는 셈이 된다.
            NextStopButton(state: context.state)

            if context.isStale {
                StaleHint()
            }
        }
        .padding(16)
        // 순수한 검정이 아니라 브랜드 잉크를 쓴다 — 중립색도 accent의 색조를
        // 따르게 통일한 팔레트와 맞추기 위한 것이다.
        .activityBackgroundTint(PlanItBrand.ink.opacity(0.85))
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

            NextStopButton(state: context.state)

            if context.isStale {
                StaleHint()
            }
        }
    }
}

/// 잠금화면과 Dynamic Island 확장 뷰가 공유하는 "다음 장소" 버튼.
///
/// Button(intent:)는 iOS 17+ 전용(AppIntents의 LiveActivityIntent)이라 16.2~16.x
/// 에서는 정보만 보여준다. iOS는 시각이 됐다고 잠금화면 표시가 저절로 넘어가지
/// 않으므로(Activity.update는 앱이 살아 있어야 한다) 이 버튼이 앱을 열지 않고
/// 넘길 수 있는 유일한 수단이다.
private struct NextStopButton: View {
    let state: TripActivityAttributes.ContentState

    var body: some View {
        if state.nextFrameAt != nil, #available(iOS 17.0, *) {
            Button(intent: NextStopIntent()) {
                Label("다음 장소", systemImage: "arrow.right.circle")
            }
            .font(.caption2)
        }
    }
}

/// 다음 프레임까지 남은 시간을 스스로 흘러가는 카운트다운으로 보여준다.
/// Text(timerInterval:)은 시스템이 관리하는 타이머라 update() 호출 없이도
/// 매초 갱신된다 — 반자동인 티가 크게 준다.
///
/// 단 "일정 진행 중"일 때만 띄운다. 야간(HIDE) 프레임에는 진행률이 없는데,
/// 시뮬레이터로 실제 야간 구간을 띄워 보니 "오늘 일정이 끝났어요" 옆에
/// `8:06:--`(내일 첫 일정까지 남은 시간)이 붙어서, 무엇을 세는 숫자인지 알 수
/// 없는 상태가 됐다. 자고 일어날 때까지 남은 시간은 사용자가 알아야 할 정보가
/// 아니다. 진행률(progressRange)이 있는 프레임 = 오늘 일정이 도는 중이라는 뜻이라
/// 그 조건을 그대로 쓴다.
private struct CountdownText: View {
    let state: TripActivityAttributes.ContentState

    var body: some View {
        if state.progressRangeEnd != nil,
           let nextFrameAt = state.nextFrameAt,
           nextFrameAt > .now {
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
            // 기본 레이블(경과 시간)을 숨긴다. 막대 아래에 "0:00" 같은 숫자가
            // 하나 더 붙는데, 그게 무엇의 경과인지 카드만 봐서는 알 수 없다 —
            // 시간 정보는 제목/본문(“12:07까지 · 다음 12:13 춘미향”)이 이미 말한다.
            ProgressView(timerInterval: start...end, countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
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
                        .fill(segment.filled ? PlanItBrand.accent : PlanItBrand.track)
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
