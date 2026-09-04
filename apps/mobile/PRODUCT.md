# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Domestic Korean travelers planning short domestic city trips (weekend / 2–3 day), typically solo or with friends/partner. Initial city coverage is limited to Seoul, Busan, and Jeju, with more regions planned.

## Product Purpose

Users select interest keywords/tags; PlanIt recommends matching destinations and automatically generates a day-by-day timed schedule (place, time, travel time between stops) — no manual research or planning required.

## Positioning

Unlike inspiration/list-style travel apps (OTA recommendation feeds) or LLM-chat trip planners, PlanIt outputs a structured, ready-to-follow day-by-day schedule directly, produced by a deterministic rule-based algorithm (keyword-tag matching → scoring → greedy regional clustering → time-slot ordering). No LLM cost, latency, or hallucination risk, and the result is immediately actionable rather than something the user still has to assemble themselves.

## Operating Context

- Core loop: pick keywords → get a generated schedule → follow it while traveling.
- Trip data is sourced from TourAPI (Korean government tourism open data), collected via a scheduled batch pipeline (GitHub Actions cron), not fetched live.
- Initial region coverage: Seoul, Busan, Jeju — architecture is designed to add more regions without rework.
- In-app map display uses the Kakao Map JS SDK (markers + straight-line connections between stops). Actual turn-by-turn navigation is delegated to the Kakao Map / Google Maps apps via deep links, not built in-app.
- While traveling, users can see the current/next schedule item on the lock screen (Android Live Updates / iOS Live Activities) without opening the app.

## Capabilities and Constraints

- Schedule generation is rule-based, not LLM-based — a deliberate choice for predictable cost. Output is structured schedule data only (place, time, travel time); no generated descriptions or narrative text.
- Travel time between places is a Haversine-distance approximation with an urban correction factor, shown as "약 n분" — explicitly an estimate, not real routing data.
- Deep-link handoff to Kakao Map / Google Maps for real navigation. The app does not probe `Linking.canOpenURL` (unreliable on Android 11+/iOS without extra native config); it opens the deep link and falls back to the mobile web map on failure, rather than sending users to an app store.
- Backend business logic and deployment adapters are kept separate so hosting can move from Vercel (Hobby tier) to another provider (e.g. Oracle Cloud/AWS) without a rewrite.
- Not yet built, but scoped for later without an architecture change: pinning a specific restaurant reservation to an exact time as a hard schedule anchor; filtering candidate places by whether they're open at the arrival time; deprioritizing outdoor categories in bad weather.

## Brand Commitments

Product/brand name is confirmed as **PlanIt**.

## Evidence on Hand

An incumbent visual foundation already exists in code (`src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`), sourced from a "PLANIT_editable_assets" mockup, but it has no DESIGN.md recording it yet. No testimonials, case studies, press, or benchmark data exist — do not fabricate any in future work.

## Product Principles

1. **Deterministic over generative** — schedule output stays algorithmic and cost-predictable; never LLM-authored.
2. **Actionable over inspirational** — every output is a concrete, followable schedule, not a list the user still has to plan from.
3. **Delegate what's already solved** — real navigation/routing is handed off to Kakao/Google Maps rather than rebuilt in-app.
4. **Infrastructure-portable** — business logic never couples to one hosting platform.
5. **Start narrow, built to expand** — ship Seoul/Busan/Jeju first, but region-specific pieces (batch pipeline, region list) are built so more cities can be added without rework.
