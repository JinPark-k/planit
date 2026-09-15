import ActivityKit
import Foundation
// RCTPromiseResolveBlock/RCTPromiseRejectBlock은 React 모듈 헤더에서 온다.
// Foundation만 import하면 이 타입들을 찾지 못해 컴파일이 깨진다 —
// AppDelegate.swift도 같은 이유로 React를 import한다.
import React

/// RN(src/native/LiveActivity.ts)이 부르는 start/refresh/end/getCapability.
///
/// 여행 도메인 로직(체류/이동 판단, 일차 경계, 야간 처리, 진행률 계산)은 전부
/// TS의 buildFrames()가 끝내고 절대시각 프레임 목록만 넘어온다. 이 모듈은
/// TripLiveActivityController로 위임만 한다 — Kotlin의 LiveUpdateModule과
/// 같은 역할 분담이다.
///
/// @available(iOS 16.2, *) 가드가 필요한 이유: staleDate를 포함한
/// ActivityContent API가 16.2부터다(16.1엔 없음). 이 프로젝트의
/// IPHONEOS_DEPLOYMENT_TARGET은 15.1이라 15.x~16.1 기기에서도 앱 자체는
/// 설치/실행돼야 한다 — 그 구간에서는 Live Activity 기능만 조용히 무시한다
/// (JS의 liveTrip.ts가 네이티브 실패를 삼키는 정책과 같은 맥락).
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

  @objc
  func start(_ plan: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    Task {
      do {
        let parsedPlan = try TripPlan(dictionary: plan)
        try await TripLiveActivityController.start(plan: parsedPlan)
        resolve(nil)
      } catch {
        reject("LIVE_ACTIVITY_START_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc
  func refresh(_ resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    Task {
      do {
        try await TripLiveActivityController.refresh()
        resolve(nil)
      } catch {
        reject("LIVE_ACTIVITY_REFRESH_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc
  func end(_ resolve: @escaping RCTPromiseResolveBlock,
           rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    Task {
      await TripLiveActivityController.end()
      resolve(nil)
    }
  }

  @objc
  func getCapability(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(LiveActivityModule.computeCapability())
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  static func computeCapability() -> NSDictionary {
    guard #available(iOS 16.2, *) else {
      return [
        "supported": false,
        "allowed": false,
        "statusBar": false,
        "reason": "OS_TOO_OLD",
      ]
    }

    let info = ActivityAuthorizationInfo()
    if !info.areActivitiesEnabled {
      // 시스템 설정(설정 > Face ID 및 암호 아래 "라이브 활동") 또는 앱별로
      // 꺼져 있는 경우. Android의 areNotificationsEnabled()와 같은 위치의 체크.
      return [
        "supported": true,
        "allowed": false,
        "statusBar": false,
        "reason": "PERMISSION_DENIED",
      ]
    }

    // statusBar: iOS는 Live Activity 자체가 Dynamic Island/잠금화면 표시
    // 수단이고, Android처럼 "상태바 승격 가능 여부"를 별도로 확인하는 API가
    // 없다 — allowed == true면 이미 Dynamic Island를 포함한 표시가 가능하다.
    return [
      "supported": true,
      "allowed": true,
      "statusBar": true,
    ]
  }
}
