package com.planit.mobile.liveupdate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 알람 발화, 부팅 완료, 시스템 시간/시간대 변경, "여행 종료" 액션을 받는다.
 *
 * 이 리시버 자체에도 여행 도메인 로직은 없다 — 무슨 일이 일어났든
 * LiveUpdateModule.render(now)를 다시 부르거나(지금 시각 기준으로 상태를
 * 처음부터 다시 계산) endTrip을 부를 뿐이다. "재부팅 후 알람이 안 울렸으면?",
 * "기기 시간이 바뀌었으면?" 같은 예외 상황을 전부 "다시 렌더한다"는 동일한
 * 경로로 흡수하기 위해서다.
 */
class TripAlarmReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_ALARM_FIRED = "com.planit.mobile.liveupdate.ACTION_ALARM_FIRED"
        const val ACTION_END = "com.planit.mobile.liveupdate.ACTION_END"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_END -> LiveUpdateModule.endTrip(context)

            ACTION_ALARM_FIRED,
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            -> LiveUpdateModule.render(context, System.currentTimeMillis())

            else -> Unit
        }
    }
}
