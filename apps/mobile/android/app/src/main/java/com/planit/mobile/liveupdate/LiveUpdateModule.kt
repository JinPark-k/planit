package com.planit.mobile.liveupdate

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

// TODO: Notification.ProgressStyle(Android 16+) 기반 Live Update 구현.
// 필요: POST_NOTIFICATIONS 권한 요청, NotificationManager로 progress 스타일 알림 표시/갱신.
class LiveUpdateModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LiveUpdateModule"

    @ReactMethod
    fun start(status: ReadableMap, promise: Promise) {
        promise.reject("NOT_IMPLEMENTED", "LiveUpdateModule.start is not implemented yet")
    }

    @ReactMethod
    fun update(status: ReadableMap, promise: Promise) {
        promise.reject("NOT_IMPLEMENTED", "LiveUpdateModule.update is not implemented yet")
    }

    @ReactMethod
    fun end(promise: Promise) {
        promise.reject("NOT_IMPLEMENTED", "LiveUpdateModule.end is not implemented yet")
    }
}
