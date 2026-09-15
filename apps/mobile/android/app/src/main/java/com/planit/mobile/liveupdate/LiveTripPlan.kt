package com.planit.mobile.liveupdate

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONArray
import org.json.JSONObject

/**
 * JS(src/native/types.ts)의 LiveTripPlan / LiveTripFramePayload를 그대로 받아쓰는
 * 네이티브 쪽 데이터 모델.
 *
 * 이 파일에는 여행 도메인 로직이 전혀 없다 — ReadableMap(브리지 인자) <-> Kotlin
 * data class <-> JSON(SharedPreferences 영속화) 사이의 순수한 변환만 담당한다.
 * "지금 뭘 보여줄지/언제 다음 알람을 걸지" 판단은 LiveUpdateModule에 있다.
 */

data class LiveTripSegment(
    val minutes: Double,
    val filled: Boolean,
)

data class LiveTripFrame(
    val at: Long,
    val kind: String, // "SHOW" | "HIDE" | "END" — TS의 유니언을 그대로 문자열로 받는다.
    val title: String?,
    val body: String?,
    val shortText: String?,
    val segments: List<LiveTripSegment>?,
    val progressMax: Double?,
    val progressAt: Double?,
    val progressPerMinute: Double?,
)

data class LiveTripPlan(
    val tripId: String,
    val title: String,
    val frames: List<LiveTripFrame>,
)

// ---- ReadableMap(JS -> 네이티브 브리지 인자) -> Kotlin ----

private fun ReadableMap.optString(key: String): String? =
    if (hasKey(key) && getType(key) != ReadableType.Null) getString(key) else null

private fun ReadableMap.optDouble(key: String): Double? =
    if (hasKey(key) && getType(key) != ReadableType.Null) getDouble(key) else null

private fun ReadableMap.optBoolean(key: String): Boolean =
    if (hasKey(key) && getType(key) != ReadableType.Null) getBoolean(key) else false

private fun ReadableMap.toLiveTripSegment(): LiveTripSegment =
    LiveTripSegment(
        minutes = optDouble("minutes") ?: 0.0,
        filled = optBoolean("filled"),
    )

fun ReadableMap.toLiveTripFrame(): LiveTripFrame {
    // epoch ms(예: 1_800_000_000_000)는 Int 범위(약 21억)를 훌쩍 넘는다.
    // getInt()로 읽으면 조용히 오버플로하니 반드시 getDouble().toLong().
    val at = if (hasKey("at") && getType("at") != ReadableType.Null) getDouble("at").toLong() else 0L
    val segmentsArray: ReadableArray? =
        if (hasKey("segments") && getType("segments") != ReadableType.Null) getArray("segments") else null
    val segments = segmentsArray?.let { arr ->
        // ReadableArray.getMap()은 시그니처상 nullable이지만, segments 배열의
        // 원소는 항상 객체(LiveTripSegment)다 — JS 쪽 타입이 그렇게 보장한다.
        (0 until arr.size()).map { i -> requireNotNull(arr.getMap(i)).toLiveTripSegment() }
    }
    return LiveTripFrame(
        at = at,
        kind = optString("kind") ?: "HIDE",
        title = optString("title"),
        body = optString("body"),
        shortText = optString("shortText"),
        segments = segments,
        progressMax = optDouble("progressMax"),
        progressAt = optDouble("progressAt"),
        progressPerMinute = optDouble("progressPerMinute"),
    )
}

fun ReadableMap.toLiveTripPlan(): LiveTripPlan {
    val framesArray: ReadableArray? =
        if (hasKey("frames") && getType("frames") != ReadableType.Null) getArray("frames") else null
    val frames = framesArray?.let { arr ->
        (0 until arr.size()).map { i -> requireNotNull(arr.getMap(i)).toLiveTripFrame() }
    } ?: emptyList()
    return LiveTripPlan(
        tripId = optString("tripId") ?: "",
        title = optString("title") ?: "",
        frames = frames,
    )
}

// ---- JSON 직렬화/역직렬화 (SharedPreferences 영속화용). 새 의존성을 추가하지
// 않기 위해 플랫폼 내장 org.json만 쓴다.

fun LiveTripPlan.toJson(): JSONObject =
    JSONObject().apply {
        put("tripId", tripId)
        put("title", title)
        put("frames", JSONArray().apply { frames.forEach { put(it.toJson()) } })
    }

private fun LiveTripFrame.toJson(): JSONObject =
    JSONObject().apply {
        put("at", at)
        put("kind", kind)
        title?.let { put("title", it) }
        body?.let { put("body", it) }
        shortText?.let { put("shortText", it) }
        segments?.let { segs ->
            put("segments", JSONArray().apply { segs.forEach { put(it.toJson()) } })
        }
        progressMax?.let { put("progressMax", it) }
        progressAt?.let { put("progressAt", it) }
        progressPerMinute?.let { put("progressPerMinute", it) }
    }

private fun LiveTripSegment.toJson(): JSONObject =
    JSONObject().apply {
        put("minutes", minutes)
        put("filled", filled)
    }

fun JSONObject.toLiveTripPlan(): LiveTripPlan {
    val framesJson = optJSONArray("frames")
    val frames = mutableListOf<LiveTripFrame>()
    if (framesJson != null) {
        for (i in 0 until framesJson.length()) {
            frames.add(framesJson.getJSONObject(i).toLiveTripFrameFromJson())
        }
    }
    return LiveTripPlan(
        tripId = optString("tripId", ""),
        title = optString("title", ""),
        frames = frames,
    )
}

private fun JSONObject.toLiveTripFrameFromJson(): LiveTripFrame {
    val segmentsJson = optJSONArray("segments")
    val segments = if (segmentsJson != null) {
        (0 until segmentsJson.length()).map { i -> segmentsJson.getJSONObject(i).toLiveTripSegmentFromJson() }
    } else {
        null
    }
    return LiveTripFrame(
        at = optLong("at", 0L),
        kind = optString("kind", "HIDE"),
        title = if (has("title")) optString("title") else null,
        body = if (has("body")) optString("body") else null,
        shortText = if (has("shortText")) optString("shortText") else null,
        segments = segments,
        progressMax = if (has("progressMax")) optDouble("progressMax") else null,
        progressAt = if (has("progressAt")) optDouble("progressAt") else null,
        progressPerMinute = if (has("progressPerMinute")) optDouble("progressPerMinute") else null,
    )
}

private fun JSONObject.toLiveTripSegmentFromJson(): LiveTripSegment =
    LiveTripSegment(
        minutes = optDouble("minutes", 0.0),
        filled = optBoolean("filled", false),
    )
