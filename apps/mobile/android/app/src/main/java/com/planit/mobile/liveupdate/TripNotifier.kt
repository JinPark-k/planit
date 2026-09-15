package com.planit.mobile.liveupdate

// ⚠️ setColorized(true) / setCustomContentView(...) / setGroupSummary(true)는
// Android 16(API 36) 승격 알림(Live Updates) 실격 조건이다. 절대 쓰지 않는다.
// 앱 테마색을 통 배경에 칠하고 싶어지더라도 색은 setColor(...)(세그먼트/아이콘
// 틴트)까지만 — Builder에 그 이상의 커스터마이즈를 허용하면 승격이 조용히
// 실패한다(예외 없이 그냥 일반 알림으로 남는다).

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.planit.mobile.MainActivity
import com.planit.mobile.R
import kotlin.math.roundToInt

/** 여행 진행 상황 알림을 만들고, 갱신하고, 지운다. */
object TripNotifier {
    const val CHANNEL_ID = "planit.trip.live"
    private const val NOTIFICATION_ID = 4200 // 이 앱 안에서 이 기능 전용으로 예약해 둔 ID.
    private const val REQUEST_CODE_CONTENT = 1
    private const val REQUEST_CODE_END_ACTION = 2
    private const val TAG = "TripNotifier"

    // 디자인 시스템/브랜드 컬러가 아직 정해지지 않아 직접 고른 값이다.
    // 채워진 구간 = 진한 파랑, 안 채워진 구간 = 옅은 회색. 나중에 브랜드 컬러가
    // 나오면 이 두 상수만 바꾸면 된다.
    private const val FILLED_SEGMENT_COLOR = 0xFF2F6FED.toInt()
    private const val UNFILLED_SEGMENT_COLOR = 0xFFD9DDE3.toInt()

    private var channelCreated = false

    /**
     * 알림 채널을 지연 생성한다. Application.onCreate에서 만들지 않는 이유:
     * 여행을 한 번도 시작하지 않은 사용자의 시스템 알림 설정에 "여행 진행 상황"
     * 채널이 유령처럼 남으면 안 된다. start() 시점, 즉 실제로 알림을 처음
     * 띄우기 직전에만 만든다.
     */
    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26 || channelCreated) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "여행 진행 상황",
            // IMPORTANCE_MIN은 승격 실격 조건이라 쓰지 않는다. DEFAULT를 쓰되
            // 소리/진동만 꺼서 "조용하지만 승격 가능한" 채널로 만든다.
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "지금 일정과 다음 일정을 잠금화면/상태바에 보여줍니다."
            setSound(null, null)
            enableVibration(false)
        }
        manager.createNotificationChannel(channel)
        channelCreated = true
    }

    fun post(context: Context, plan: LiveTripPlan, frame: LiveTripFrame, now: Long) {
        if (Build.VERSION.SDK_INT < 26) return
        ensureChannel(context)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_trip_notification)
            .setContentTitle(frame.title ?: plan.title) // setContentTitle은 승격 필수 조건.
            .setContentText(frame.body)
            .setOngoing(true) // setOngoing(true)도 승격 필수 조건.
            .setOnlyAlertOnce(true) // 갱신마다 다시 알리지 않는다 — 조용한 채널 정책과 짝.
            .setSilent(true)
            .setContentIntent(contentIntent(context))
            .addAction(endAction(context))

        applyProgress(builder, frame, now)

        val notification = builder.build()
        context.getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)

        if (Build.VERSION.SDK_INT >= 36) {
            // 승격(상태바 칩/NowBar) 성공 여부를 기기에서 바로 확인할 방법이
            // 마땅치 않다 — 이 로그가 원인 추적의 유일한 단서.
            Log.d(TAG, "hasPromotableCharacteristics=${notification.hasPromotableCharacteristics()}")
        }
    }

    fun cancel(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
    }

    /**
     * 진행 막대와 승격 요청을 붙인다.
     *
     * NotificationCompat.ProgressStyle은 내부에 Api36Impl을 들고 있어 구버전에서
     * 알아서 일반 진행바로 낮춰 준다 — 여기서 SDK_INT 분기를 할 필요가 없다.
     */
    private fun applyProgress(
        builder: NotificationCompat.Builder,
        frame: LiveTripFrame,
        now: Long,
    ) {
        val segments = frame.segments ?: return
        val progress = interpolatedProgress(frame, now)

        val style = NotificationCompat.ProgressStyle()
        var totalLength = 0
        segments.forEach { segment ->
            val length = segment.minutes.roundToInt().coerceAtLeast(0)
            totalLength += length
            style.addProgressSegment(
                NotificationCompat.ProgressStyle.Segment(length)
                    .setColor(if (segment.filled) FILLED_SEGMENT_COLOR else UNFILLED_SEGMENT_COLOR),
            )
        }
        // ProgressStyle에는 setProgressMax가 없다 — 세그먼트 길이의 합이 곧
        // 최댓값이다(getProgressMax()도 read-only). 그래서 TS가 보낸 progressMax를
        // 그대로 넘기지 않고 실제로 쌓은 세그먼트 합으로 clamp한다. 분 단위를
        // 반올림하면서 둘이 1~2 어긋날 수 있는데, 그때 범위 밖 값이 들어간다.
        style.setProgress(progress.coerceIn(0, totalLength))

        builder.setStyle(style)
    }

    /** progressAt + 프레임 시각 이후 경과 시간 * progressPerMinute을 [0, progressMax]로 clamp. */
    private fun interpolatedProgress(frame: LiveTripFrame, now: Long): Int {
        val progressAt = frame.progressAt ?: return 0
        val perMinute = frame.progressPerMinute ?: 1.0
        val elapsedMinutes = (now - frame.at) / 60000.0
        val value = progressAt + elapsedMinutes * perMinute
        val max = frame.progressMax ?: Double.MAX_VALUE
        return value.coerceIn(0.0, max).roundToInt()
    }

    private fun contentIntent(context: Context): PendingIntent {
        // 딥링크로 특정 화면까지 보내는 건 이번 범위가 아니다 — 앱만 열면 된다.
        // MainActivity가 launchMode="singleTask"라 기존 태스크로 복귀한다.
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            context,
            REQUEST_CODE_CONTENT,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    private fun endAction(context: Context): NotificationCompat.Action {
        val intent = Intent(context, TripAlarmReceiver::class.java).apply {
            action = TripAlarmReceiver.ACTION_END
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_END_ACTION,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Action.Builder(
            R.drawable.ic_trip_notification,
            "여행 종료",
            pendingIntent,
        ).build()
    }
}
