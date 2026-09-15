package com.planit.mobile.liveupdate

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/**
 * 다음 프레임 시각에 알람을 "항상 1개만" 건다. 알람이 발화하면
 * TripAlarmReceiver가 LiveUpdateModule.render()를 다시 불러 그 시점 기준
 * 다음 프레임을 새로 계산해 다시 건다 — 그래서 미리 여러 개를 걸어 둘 필요가
 * 없고, 프로세스가 죽었다 살아나도(예약은 AlarmManager/시스템이 들고 있으므로)
 * 자연히 이어진다.
 *
 * setExactAndAllowWhileIdle 대신 setAndAllowWhileIdle(비정확 알람)을 쓰는 이유:
 * 정확 알람은 Android 12(API 31)+에서 SCHEDULE_EXACT_ALARM 특수 권한이 필요하고,
 * 권한 없이도 예외적으로 허용되는 USE_EXACT_ALARM은 알람시계/캘린더류 앱 전용이라
 * 이 앱 성격상 Play 정책에 걸릴 소지가 있다. 일정 전환 간격이 보통 30분 이상이라
 * Doze 상태에서 알람이 다소 밀리더라도(비정확) 체감상 문제가 없다.
 */
object TripAlarms {
    private const val REQUEST_CODE = 100

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, TripAlarmReceiver::class.java).apply {
            action = TripAlarmReceiver.ACTION_ALARM_FIRED
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    fun set(context: Context, atMillis: Long) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent(context))
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.cancel(pendingIntent(context))
    }
}
