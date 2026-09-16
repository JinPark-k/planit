package com.planit.mobile.liveupdate

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * 여행이 진행되는 동안 떠 있는 포그라운드 서비스.
 *
 * 왜 알림만으로는 부족했는가: 갤럭시(One UI 8, Android 16)에서 알림은 정상으로
 * 떴고 hasPromotableCharacteristics()도 true였지만, 앱별 "실시간 정보" 설정 자체가
 * 나타나지 않았고 canPostPromotedNotifications()가 계속 false였다. 같은 기기에서
 * 배달의민족에는 그 설정이 있었다 — 즉 삼성이 우리를 "실시간 정보" 자격이 있는
 * 앱으로 치지 않았다는 뜻이다.
 *
 * 남은 구조적 차이가 포그라운드 서비스였다. 플랫폼 가이드도 Android 14+에서
 * 오래 도는 live 경험은 타입을 선언한 포그라운드 서비스 위에서 돌고 알림을
 * 노출하라고 말하고, 실제로 NowBar에 뜨는 앱들(배달의민족, 타다)이 전부 그렇게
 * 한다. 삼성의 자격 판단이 여기에 걸려 있는 것으로 보고 서비스를 도입했다.
 *
 * 대가가 하나 있다: 포그라운드 서비스는 도는 동안 알림을 반드시 띄우고 있어야
 * 해서, 야간(HIDE 구간)에 알림을 "내리는" 동작을 더 이상 할 수 없다. 대신 iOS와
 * 같이 조용한 야간 카드("오늘 일정이 끝났어요 / 내일 09:00 ○○부터")를 유지한다.
 * 밤에 서비스를 멈췄다가 새벽 알람으로 다시 켜는 방법은 Android 12+에서
 * 백그라운드 FGS 시작이 막혀 있어 신뢰할 수 없다.
 */
class LiveTripService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val plan = TripSessionStore.load(this)
        val frame = plan?.frames?.lastOrNull { it.at <= System.currentTimeMillis() }

        if (plan == null || frame == null || frame.kind == "END") {
            // 보여줄 게 없으면 서비스를 유지할 이유가 없다.
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = TripNotifier.build(this, plan, frame, System.currentTimeMillis())
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(
                TripNotifier.NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(TripNotifier.NOTIFICATION_ID, notification)
        }

        // 프로세스가 죽어도 시스템이 서비스를 되살리게 한다. 플랜은
        // SharedPreferences에 있으므로 인텐트 없이도 복구된다.
        return START_STICKY
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, LiveTripService::class.java)
            // 앱이 포그라운드일 때(여행 시작 버튼)만 호출된다 — Android 12+는
            // 백그라운드에서의 FGS 시작을 막는다.
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, LiveTripService::class.java))
        }
    }
}
