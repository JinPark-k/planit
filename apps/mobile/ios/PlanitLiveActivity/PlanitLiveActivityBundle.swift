import WidgetKit
import SwiftUI

/// 위젯 익스텐션의 진입점. 이 타겟엔 위젯이 TripLiveActivityWidget 하나뿐이라
/// WidgetBundle이 과해 보일 수 있지만, WidgetKit 익스텐션의 @main은 항상
/// WidgetBundle이어야 한다(단일 Widget을 @main으로 직접 채택할 수 없다).
@main
struct PlanitLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        TripLiveActivityWidget()
    }
}
