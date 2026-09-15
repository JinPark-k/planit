package com.planit.mobile.liveupdate

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONObject

/**
 * 진행 중인 여행 플랜을 SharedPreferences에 JSON 문자열로 저장해 둔다.
 *
 * 왜 인메모리가 아니라 디스크인가: 알람은 프로세스가 죽어 있는 동안에도 발화한다
 * (Doze/앱 종료 후). TripAlarmReceiver가 그 시점에 "지금 뭘 보여줘야 하는지"를
 * 다시 계산하려면 프레임 목록이 어딘가 남아 있어야 한다.
 */
object TripSessionStore {
    private const val TAG = "TripSessionStore"
    private const val PREFS_NAME = "planit_live_trip"
    private const val KEY_PLAN = "plan_json"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, plan: LiveTripPlan) {
        prefs(context).edit().putString(KEY_PLAN, plan.toJson().toString()).apply()
    }

    fun load(context: Context): LiveTripPlan? {
        val raw = prefs(context).getString(KEY_PLAN, null) ?: return null
        return try {
            JSONObject(raw).toLiveTripPlan()
        } catch (e: Exception) {
            // 저장된 JSON이 깨졌으면(예: 과거 포맷과 다른 값) 복구를 포기하고 비운다 —
            // 잘못된 프레임으로 알림을 잘못 띄우는 것보다 안전하다.
            Log.w(TAG, "저장된 여행 플랜 JSON 파싱 실패, 세션을 비운다", e)
            null
        }
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_PLAN).apply()
    }
}
