package com.planit.mobile.liveupdate

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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

    /**
     * 승격 알림 설정 화면을 연다. 사용자가 앱별로 Live Updates를 꺼 두면
     * 잠금화면 알림은 떠도 상태바/NowBar로는 올라가지 않는데, 앱 안에서는
     * 그 사실만 알릴 수 있을 뿐 켜 줄 수는 없다 — 설정으로 데려다주는 게
     * 우리가 할 수 있는 전부다.
     */
    @ReactMethod
    fun openPromotionSettings(promise: Promise) {
        // 화면을 순서대로 시도한다. 승격 전용 설정은 AOSP에만 있고 OEM 설정 앱이
        // 처리하지 않을 수 있다 — 갤럭시에서 버튼을 눌러도 아무 반응이 없었던 것이
        // 그 경우다(startActivity가 ActivityNotFoundException으로 떨어졌다).
        // 그럴 때 아무 데도 못 가는 것보다 앱 알림 설정이라도 열어 주는 게 낫다.
        val candidates = buildList {
            if (Build.VERSION.SDK_INT >= 36) {
                // 상수 이름은 ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS다.
                // 문서/블로그에 도는 ACTION_MANAGE_APP_PROMOTED_NOTIFICATIONS는
                // 실제 SDK에 없다(android-36 android.jar를 javap으로 확인).
                add(
                    Intent(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName),
                )
            }
            add(
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName),
            )
            add(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", reactApplicationContext.packageName, null)),
            )
        }

        for (intent in candidates) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                reactApplicationContext.startActivity(intent)
                promise.resolve(intent.action)
                return
            } catch (_: Exception) {
                // 이 기기가 처리하지 못하는 화면이다. 다음 후보로.
            }
        }
        promise.reject("LIVE_UPDATE_SETTINGS_FAILED", "열 수 있는 설정 화면이 없습니다")
    }

    /**
     * 실기기 진단용. 케이블이 없어 logcat을 볼 수 없는 상황에서, 승격이 왜
     * 막혔는지를 기기가 직접 답하게 한다. 화면에서 안내 카드를 길게 눌러 본다.
     */
    @ReactMethod
    fun getDiagnostics(promise: Promise) {
        val context = reactApplicationContext
        val manager = context.getSystemService(NotificationManager::class.java)
        val result = Arguments.createMap()
        result.putInt("sdkInt", Build.VERSION.SDK_INT)
        result.putBoolean("notificationsEnabled", manager.areNotificationsEnabled())
        result.putInt("channelImportance", TripNotifier.channelImportance(context))
        if (Build.VERSION.SDK_INT >= 36) {
            result.putBoolean("canPostPromoted", manager.canPostPromotedNotifications())
        }
        TripNotifier.lastPromotable?.let { result.putBoolean("promotable", it) }
        TripNotifier.postedPromoted(context)?.let { result.putBoolean("postedPromoted", it) }
        promise.resolve(result)
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

            if (Build.VERSION.SDK_INT >= 36) {
                // 승격은 요청일 뿐 보장이 아니다. 사용자가 앱별로 Live Updates를
                // 꺼 둘 수 있어서, 화면에 "상태바에도 보여요"라고 말하기 전에
                // 실제로 가능한지 물어본다.
                val canPromote = manager.canPostPromotedNotifications()
                result.putBoolean("supported", true)
                result.putBoolean("allowed", true)
                result.putBoolean("statusBar", canPromote)
                if (!canPromote) result.putString("reason", "PROMOTION_DISABLED")
                return result
            }

            result.putBoolean("supported", true)
            result.putBoolean("allowed", true)
            result.putBoolean("statusBar", false)
            return result
        }
    }
}
