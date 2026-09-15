package com.planit.mobile.liveupdate

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap

/**
 * JS(src/native/LiveUpdate.ts)가 부르는 start/refresh/end/getCapability.
 *
 * 여행 도메인 로직(체류/이동 판단, 일차 경계, 야간 처리, 진행률 계산)은 전부
 * TS의 buildFrames()가 미리 끝내고, 절대시각 프레임 목록만 넘어온다. 이 모듈이
 * (그리고 companion object의 render/endTrip이) 하는 일은 딱 두 가지뿐이다:
 *   렌더: frames.last { it.at <= now }
 *   다음 알람: frames.first { it.at > now }?.at
 */
class LiveUpdateModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LiveUpdateModule"

    @ReactMethod
    fun start(plan: ReadableMap, promise: Promise) {
        try {
            val parsedPlan = plan.toLiveTripPlan()
            TripSessionStore.save(reactApplicationContext, parsedPlan)
            render(reactApplicationContext, System.currentTimeMillis())
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LIVE_UPDATE_START_FAILED", e)
        }
    }

    @ReactMethod
    fun refresh(promise: Promise) {
        try {
            render(reactApplicationContext, System.currentTimeMillis())
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LIVE_UPDATE_REFRESH_FAILED", e)
        }
    }

    @ReactMethod
    fun end(promise: Promise) {
        try {
            endTrip(reactApplicationContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LIVE_UPDATE_END_FAILED", e)
        }
    }

    @ReactMethod
    fun getCapability(promise: Promise) {
        promise.resolve(computeCapability(reactApplicationContext))
    }

    companion object {
        /**
         * 렌더 + 알람 재예약. TripAlarmReceiver(알람 발화·부팅·시간변경)와
         * ReactMethod(start/refresh) 양쪽이 같은 진입점을 쓴다 — "지금 상태"를
         * 계산하는 로직이 한 곳에만 있어야 두 경로(알람 발화 vs JS 호출)가
         * 어긋나지 않는다.
         *
         *   render(now):
         *     f = frames.lastOrNull { it.at <= now }
         *     null, HIDE -> 알림 취소
         *     SHOW       -> 알림 표시/갱신
         *     END        -> 취소 + 세션/알람 정리하고 끝
         *     다음 프레임이 있으면 그 시각에 알람 재예약, 없으면 세션 정리.
         */
        fun render(context: Context, now: Long) {
            if (Build.VERSION.SDK_INT < 26) return
            val plan = TripSessionStore.load(context) ?: return
            val frames = plan.frames
            val current = frames.lastOrNull { it.at <= now }

            when (current?.kind) {
                null, "HIDE" -> TripNotifier.cancel(context)
                "SHOW" -> TripNotifier.post(context, plan, current, now)
                "END" -> {
                    TripNotifier.cancel(context)
                    TripSessionStore.clear(context)
                    TripAlarms.cancel(context)
                    return
                }
            }

            val next = frames.firstOrNull { it.at > now }
            if (next != null) {
                // 알람은 항상 1개만 — 발화할 때마다 render()가 다시 건다.
                TripAlarms.set(context, next.at)
            } else {
                TripSessionStore.clear(context)
            }
        }

        /** "여행 종료" 액션, JS의 end() 양쪽에서 호출하는 즉시 종료 경로. */
        fun endTrip(context: Context) {
            TripNotifier.cancel(context)
            TripSessionStore.clear(context)
            TripAlarms.cancel(context)
        }

        fun computeCapability(context: Context): WritableMap {
            val result = Arguments.createMap()

            if (Build.VERSION.SDK_INT < 26) {
                result.putBoolean("supported", false)
                result.putBoolean("allowed", false)
                result.putBoolean("statusBar", false)
                result.putString("reason", "OS_TOO_OLD")
                return result
            }

            val manager = context.getSystemService(NotificationManager::class.java)
            if (!manager.areNotificationsEnabled()) {
                result.putBoolean("supported", true)
                result.putBoolean("allowed", false)
                result.putBoolean("statusBar", false)
                result.putString("reason", "PERMISSION_DENIED")
                return result
            }

            result.putBoolean("supported", true)
            result.putBoolean("allowed", true)
            result.putBoolean("statusBar", false)
            return result
        }
    }
}
