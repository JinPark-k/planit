import Foundation

// TODO: ActivityKit 연동 구현.
// 주의: Live Activities는 이 파일만으로 동작하지 않는다. Xcode에서
// File > New > Target > Widget Extension 을 별도로 추가해야
// 잠금화면 UI(ActivityAttributes/ActivityContent)를 렌더링할 수 있다.
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

  @objc
  func start(_ status: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "LiveActivityModule.start is not implemented yet", nil)
  }

  @objc
  func update(_ status: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "LiveActivityModule.update is not implemented yet", nil)
  }

  @objc
  func end(_ resolve: @escaping RCTPromiseResolveBlock,
           rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("NOT_IMPLEMENTED", "LiveActivityModule.end is not implemented yet", nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
