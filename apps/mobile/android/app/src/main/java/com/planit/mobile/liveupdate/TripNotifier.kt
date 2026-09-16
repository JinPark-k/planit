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
import androidx.core.graphics.drawable.IconCompat
import com.planit.mobile.MainActivity
import com.planit.mobile.R
import kotlin.math.roundToInt

/** 여행 진행 상황 알림을 만들고, 갱신하고, 지운다. */
object TripNotifier {
    const val CHANNEL_ID = "planit.trip.live"
    const val NOTIFICATION_ID = 4200 // 이 앱 안에서 이 기능 전용으로 예약해 둔 ID.
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
     * 마지막으로 만든 알림이 승격 가능한 모양이었는지. 케이블 없이 실기기를
     * 진단해야 해서(logcat을 볼 수 없다) 값을 들고 있다가 화면으로 꺼낸다.
     */
    var lastPromotable: Boolean? = null
        private set

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

    /** 알림 객체만 만든다. 포그라운드 서비스가 startForeground에 넘겨야 해서 분리했다. */
    fun build(
        context: Context,
        plan: LiveTripPlan,
        frame: LiveTripFrame,
        now: Long,
    ): android.app.Notification {
        ensureChannel(context)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_trip_notification)
            .setContentTitle(frame.title ?: plan.title) // setContentTitle은 승격 필수 조건.
            .setContentText(frame.body)
            .setOngoing(true) // setOngoing(true)도 승격 필수 조건.
            // setOnlyAlertOnce만으로 "갱신할 때 다시 알리지 않는다"가 충족된다.
            // setSilent(true)는 쓰지 않는다 — 조용함은 채널에서 소리/진동을 끄는
            // 것으로 이미 확보돼 있는데, setSilent는 알림을 "조용한 알림" 등급으로
            // 내려 버린다. NowBar는 주목해야 할 진행 중 활동을 올리는 자리라
            // 그렇게 내려간 알림을 후보에서 뺄 여지가 있다(갤럭시 실기기에서
            // canPostPromotedNotifications()가 false였다).
            .setOnlyAlertOnce(true)
            // AOSP 문서에는 카테고리 요구가 없다(에뮬레이터에서는 이것 없이도
            // 승격됐다). 하지만 갤럭시 NowBar는 활동 종류별로 카드를 분류하는
            // UI라, 카테고리가 없으면 어디에 놓을지 몰라 후보에서 빠지는 것으로
            // 보인다 — 실기기에서 알림은 떴는데 NowBar 토글 목록에 앱 자체가
            // 나타나지 않았다. 여행 일정 진행은 "오래 도는 작업의 진행"이므로
            // PROGRESS가 가장 정직하다.
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(contentIntent(context))
            .addAction(endAction(context))

        applyProgress(context, builder, frame, now)

        return builder.build()
    }

    fun post(context: Context, plan: LiveTripPlan, frame: LiveTripFrame, now: Long) {
        if (Build.VERSION.SDK_INT < 26) return
        val notification = build(context, plan, frame, now)
        context.getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)

        if (Build.VERSION.SDK_INT >= 36) {
            // 승격(상태바 칩/NowBar) 성공 여부를 기기에서 바로 확인할 방법이
            // 마땅치 않다 — 이 로그가 원인 추적의 유일한 단서.
            lastPromotable = notification.hasPromotableCharacteristics()
            Log.d(TAG, "hasPromotableCharacteristics=$lastPromotable")
        }
    }

    /** 지금 게시돼 있는 알림이 실제로 승격됐는지. 없으면 null. */
    fun postedPromoted(context: Context): Boolean? {
        if (Build.VERSION.SDK_INT < 36) return null
        val manager = context.getSystemService(NotificationManager::class.java)
        val posted = manager.activeNotifications.firstOrNull { it.id == NOTIFICATION_ID }
            ?: return null
        return (posted.notification.flags and android.app.Notification.FLAG_PROMOTED_ONGOING) != 0
    }

    /** 채널 중요도. 승격 실격 조건(IMPORTANCE_MIN)에 걸렸는지 확인용. */
    fun channelImportance(context: Context): Int {
        if (Build.VERSION.SDK_INT < 26) return -1
        val manager = context.getSystemService(NotificationManager::class.java)
        return manager.getNotificationChannel(CHANNEL_ID)?.importance ?: -1
    }

    fun cancel(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
    }

    /**
     * 진행 막대와 승격 요청을 붙인다.
     *
     * NotificationCompat.ProgressStyle은 내부에 Api36Impl을 들고 있어 구버전에서
     * 알아서 일반 진행바로 낮춰 준다 — 여기서 SDK_INT 분기를 할 필요가 없다.
     *
     * 승격 요청을 NotificationCompat으로만 할 수 있는 이유: 플랫폼 쪽에는 요청
     * 수단이 없다. API 36 android.jar의 Notification.Builder에는
     * setRequestPromotedOngoing이 없고 EXTRA_REQUEST_PROMOTED_ONGOING 상수도
     * 공개돼 있지 않다(javap으로 확인). Notification.FLAG_PROMOTED_ONGOING은
     * 존재하지만 그건 시스템이 승격 "결과"로 켜 주는 플래그이지 요청 수단이
     * 아니다 — 앱이 직접 세워도 승격되지 않는다.
     */
    private fun applyProgress(
        context: Context,
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
        // 진행 막대 위를 따라가는 표식. NowBar/상태바에서 카드가 "살아 있는 활동"
        // 으로 보이게 하는 요소라, 실제로 NowBar에 뜨는 앱들이 공통으로 쓴다.
        style.setProgressTrackerIcon(
            IconCompat.createWithResource(context, R.drawable.ic_trip_notification),
        )

        // 삼성 전용 extra. One UI의 Ongoing Activity가 읽는 값으로 알려져 있다
        // (매니페스트의 com.samsung.android.support.ongoing_activity와 짝).
        // 표준 AOSP에는 없는 키라 다른 기기에서는 그냥 무시된다.
        builder.addExtras(
            android.os.Bundle().apply { putInt("android.ongoingActivityNoti.style", 1) },
        )

        builder.setStyle(style)
        // 상태바 칩에 들어갈 짧은 문구. 자리가 좁아 TS가 미리 줄여 보낸다.
        frame.shortText?.let { builder.setShortCriticalText(it) }
        builder.setRequestPromotedOngoing(true)
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
