---
name: PlanIt
description: Keyword-driven, day-by-day trip schedules for short domestic trips in Korea
colors:
  primary: "#73C322"
  primary-pressed: "#66A71B"
  primary-light: "#F0F9E7"
  primary-deep: "#367010"
  accent: "#6B33CC"
  accent-pressed: "#452183"
  accent-light: "#F0EBF9"
  warn: "#F2A65A"
  text: "#1B1F27"
  text-muted: "#6B7280"
  border: "#E3E6EC"
  surface: "#FFFFFF"
  background: "#F6F7FB"
  placeholder: "#DDE1E8"
  disabled: "#B8BCC4"
typography:
  display:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "24px"
    fontWeight: "700"
  title:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "20px"
    fontWeight: "700"
  heading:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "17px"
    fontWeight: "700"
  button:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "16px"
    fontWeight: "700"
  body:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "15px"
  body-strong:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "15px"
    fontWeight: "600"
  small:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "14px"
  small-strong:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "14px"
    fontWeight: "600"
  caption:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "13px"
  label:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "13px"
    fontWeight: "700"
  micro:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "12px"
  micro-strong:
    fontFamily: "System (SF Pro Text on iOS, Roboto on Android)"
    fontSize: "12px"
    fontWeight: "600"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
components:
  chip-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip-soft:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: "52px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: "52px"
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: "52px"
  card-bordered:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-tonal-lime:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  card-tonal-purple:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

# Design System: PlanIt

## Overview

**Creative North Star: "The Trail Line"**

PlanIt's signature interaction is the dot-and-connecting-line rail that runs down the Schedule screen: a straight, always-forward line marking one stop after another. The rest of the system takes its cue from that line — sequential, unadorned, and legible at a glance, never decorative for its own sake. The palette now maps directly onto that idea: **lime** is the color of picking a keyword and starting a trip (discovery, energy, "go"), and **purple** is the Trail Line itself — the route, the itinerary, the connective tissue between stops. Nothing else on screen carries color; every other surface stays quiet so those two reads stay clear.

Depth comes from tone and hairline borders, not shadows — there is no `box-shadow` or elevation anywhere in the current implementation. Corners default to a true pill for anything selectable and a moderate 12–16px radius for containers; nothing is sharp-cornered by default, but nothing is heavily rounded either. Type rides the OS system font (SF Pro on iOS, Roboto on Android) with no brand display face yet, so the interface currently reads as a trustworthy utility rather than a branded surface — a deliberate emptiness future work can fill in, not an oversight to "fix" reflexively.

**Key Characteristics:**
- Two brand colors, each with one job: lime (`primary`) for discovery/action, purple (`accent`) for the route/itinerary — never blended, never decorative
- Lime is bright enough to need dark text on its fills; a separate darker step (`primary-deep`) exists specifically for lime-as-foreground (links, active tab) where the bright fill would fail contrast
- Flat by default: borders and tonal fills carry depth, not shadows
- A true-pill radius (999) for every selectable/tag element, routed through one shared `Chip` component
- System font only — no custom typeface committed yet

## Colors

Two brand hues on a white/near-white base: lime for discovery and primary action, purple for the route/itinerary. Both fill (tonal, dark/white text) and foreground (text-on-white) roles are covered by dedicated steps of each color — a plain 1:1 swap of the old blue for lime was rejected specifically because lime's brightness fails WCAG contrast as a foreground color; splitting it into a fill step and a deep foreground step is what makes the palette usable, not just colorful.

### Primary
- **Fresh Lime** (`#73C322`): the brand-primary fill. Primary CTA buttons (일정 만들기, 다시 만들기), selected day/region/keyword chip fill. Always paired with dark text/icon on top — its brightness fails contrast against white text.
- **Pressed Lime** (`#66A71B`): pressed/active state of any Fresh Lime fill. Still paired with dark text.
- **Lime Surface** (`#F0F9E7`): a whisper-light tonal wash of Fresh Lime. Used for "recommendation info" tonal surfaces — currently the category-badge chip (`soft` variant).
- **Trailhead Green** (`#367010`): the text-safe deep step of the lime family. Used wherever lime needs to sit as a *foreground* color against white/near-white — links, the active bottom-tab icon/label, the keyword-loading spinner, and text on Lime Surface. Fresh Lime itself is never used as text or a small icon; it exists only as a fill.

### Secondary
- **Trail Purple** (`#6B33CC`): the route/itinerary color — literally the Trail Line. Schedule timeline dot and connecting line (line rendered at 35% opacity so it doesn't dominate a long scroll), day headers, timeline time labels, trip-total text, visit-context text, "카카오맵으로 열기" map-open text, and secondary actions like the keyword-retry link. Dark enough at full saturation to pair with white text directly — no separate deep step needed the way lime has one.
- **Pressed Purple** (`#452183`): pressed/active state, reserved for a future solid-purple control (none of the current screens use a solid purple fill yet — today's purple usage is all tonal-surface or text/icon).
- **Purple Surface** (`#F0EBF9`): tonal wash of Trail Purple. Trip-total card, visit-context card, map-open button background, and the pressed state of a timeline row (replacing the old lime-tinted press, since the row belongs to the itinerary timeline).

### Neutral
- **Cloud White** (`#FFFFFF`) — `surface`: card, header, footer, and tab-bar backgrounds.
- **Fog Background** (`#F6F7FB`) — `background`: base screen background, one step darker than surface so cards visibly sit on top of it without a shadow.
- **Hairline Border** (`#E3E6EC`) — `border`: 1px dividers and card outlines; the system's only depth cue besides tonal fill.
- **Ink Text** (`#1B1F27`) — `text`: primary reading color for titles and body content, and the required dark text on every Fresh/Pressed Lime fill.
- **Muted Slate** (`#6B7280`) — `text-muted`: secondary/meta text (timestamps, captions, subtitles).
- **Image Placeholder** (`#DDE1E8`) — `placeholder`: empty-image fill on place thumbnails and hero images.
- **Disabled Gray** (`#B8BCC4`) — `disabled`: disabled primary-button fill (a color swap, not an opacity trick).

### Functional
- **Warm Amber Warn** (`#F2A65A`) — `warn`: error/failure text only (keyword-load failure, schedule-generation failure). No warning backgrounds or icons use it yet — text color only. Unchanged by the lime/purple redesign.

### Named Rules
**The Lime-Fill, Purple-Text Rule.** Lime is only ever a *fill* paired with dark text (`primary`/`primary-pressed` + `text`) — never a foreground color on its own, because its brightness fails contrast as text or a small icon. Purple has no such restriction: `accent` works as fill-with-white-text or as foreground-on-white interchangeably.

**The Discovery vs. Route Rule.** Lime marks discovery/action moments (making a choice, submitting, the primary CTA). Purple marks anything that is the trip's route or timeline itself (the Schedule rail, day/time labels, trip totals, "open in map"). A control doesn't get to be both — pick the one that matches what the user is doing.

## Typography

**Display/Body/Label Font:** System — SF Pro Text on iOS, Roboto on Android (no custom typeface loaded).

**Character:** Plain and functional; the hierarchy is expressed entirely through a 12-role size/weight scale, not through font pairing or display flourishes.

### Hierarchy
- **Display** (700, 24px): screen-level titles ("여행 일정 만들기").
- **Title** (700, 20px): content titles (a place name).
- **Heading** (700, 17px): header-bar titles ("제주 3일 일정").
- **Button** (700, 16px): all button/CTA labels.
- **Body** (400, 15px): default reading text.
- **Body Strong** (600, 15px): emphasized reading text (a place name in a timeline row).
- **Small** (400, 14px) / **Small Strong** (600, 14px): secondary text and section labels.
- **Caption** (400, 13px): image-placeholder captions and similar low-emphasis notes.
- **Label** (700, 13px): section labels ("위치"), timestamps ("13:44"), the selected day header.
- **Micro** (400, 12px) / **Micro Strong** (600, 12px): the smallest tier — tab-bar labels, small-chip text, meta rows (travel/stay time).

### Named Rules
**The Role, Not Size Rule.** Every text style is chosen by role (`typography.body`, `typography.label`, …), never by picking a raw font size — the 12-role scale exists specifically because nine raw sizes were once scattered ad hoc across screens.

## Layout

Single-column mobile layout throughout; no tablet or multi-column behavior exists yet even though the platform is adaptive (see `PRODUCT.md`). Screens split into two patterns:

- **Scrollable form/content** (Search, Plan Form, Place Detail): outer padding of `spacing.xl` (20px), sections stacked with `spacing.xxl` (24px) between them, generous bottom padding (`spacing.xxxl`, 32px) so content clears the last control.
- **Header/content/footer sandwich** (Schedule): a bordered header and a bordered footer pin to the top and bottom, with a scrollable list between them at `spacing.lg` (16px) horizontal padding. Both header and footer use a 1px border (`colors.border`) against `colors.surface` to separate them from the scroll content, instead of elevation.

The bottom tab bar is fixed at 64dp (raised from React Navigation's 49dp default so the label doesn't crowd the bottom edge) and currently holds only 2 of a planned 4 destinations — the other two are deliberately withheld until their backing APIs exist, rather than shipped as dead taps.

## Elevation & Depth

Flat by design — there is no `shadow`/`elevation` usage anywhere in the codebase. Depth is conveyed two ways instead: a 1px hairline border (`colors.border`) around cards and between chrome regions, and a tonal fill (`colors.primary-light`) that marks an emphasized or "raised" surface (the soft chip variant, the visit-context card, the trip-total card, the "open in map" button, a pressed timeline row) in place of a shadow or scale change.

### Named Rules
**The No-Shadow Rule.** Depth is a border or a tint, never a `box-shadow`. If a new component reaches for elevation, translate it to a tonal fill or a border first.

## Shapes

Four-step radius scale, chosen by role rather than by component:
- **pill (999px):** always used for anything selectable or tag-like — every `Chip`, and the circular back button. The radius is deliberately larger than any real element height so it always resolves to a true half-circle regardless of content-driven height, instead of picking a fixed value per screen.
- **lg (16px):** primary content surfaces — the schedule timeline card, primary buttons, the place-detail hero image's implicit bottom edge.
- **md (12px):** secondary/tonal surfaces and thumbnails — tonal cards, image thumbnails, category-badge context.
- **sm (8px):** the one small, low-emphasis control observed (the keyword-retry button).

Borders are always a 1px hairline in `colors.border`; nothing in the system uses a thicker or colored border.

### Named Rules
**The True Pill Rule.** Never hand-pick a radius for a pill-shaped element — use `rounded.pill` so height changes never break the shape.

## Components

### Buttons
- **Shape:** `rounded.lg` (16px).
- **Primary:** `colors.primary` (Fresh Lime) fill, `colors.text` (dark) label — not `colors.surface`; a white label would fail contrast on lime. `typography.button`, fixed height. Two near-duplicate heights are currently in use — 52px (Plan Form's submit) and 50px (Schedule's restart) — these should converge on one value rather than both being treated as intentional.
- **Pressed:** fill swaps to `colors.primary-pressed`; label stays dark.
- **Disabled:** fill swaps to `colors.disabled` (not an opacity reduction); label stays dark.
- **Pressed states are now wired on both primary CTAs** (Plan Form's submit, Schedule's restart) via the `({pressed}) =>` style-function pattern already used elsewhere in the codebase. The schedule timeline row still swaps to a tonal background on press and the map-open button still drops to 70% opacity — those two remain unconverged with the button pattern; worth revisiting together.
- No secondary/outline/ghost button variant is formalized yet — Plan Form's "다시 시도" retry control (bordered, `colors.surface` fill, `rounded.sm`, `colors.accent` text — a Trail Purple secondary action, not lime) is the closest precedent if one is needed.

### Chips
One shared component (`src/components/Chip.tsx`) renders every pill in the app — keyword picker, day-count picker, region picker, schedule day tabs, place tags, and the category badge. It was built specifically to stop four screens from drifting to four different pill paddings/radii.
- **Shape:** always `rounded.pill`.
- **Sizes:** `md` (8px/12px padding, `typography.small` text) and `sm` (4px/8px padding, `typography.micro` text).
- **Structural variants:** `outline` (1px `colors.border`, `colors.surface` fill — the default) and `soft` (no border, `colors.primary-light` fill, `colors.primary-deep` text — used for read-only tags like the category badge; the text uses the deep step, not the bright fill color, because bright-on-light-tint fails contrast too).
- **State modifiers, composable on either variant:** `selected` (fills `colors.primary`, **dark** `colors.text` label — not white) and `dimmed` (0.4 opacity, used when a selection cap like "max 3 keywords" is reached).
- Every `Chip` use in the app — including the Schedule screen's day tabs — goes through this one selected-state contract (lime fill, dark text). Purple is reserved for the itinerary *visualization* itself (the timeline rail, labels, summary cards), not for chip-style pickers, even on the Schedule screen.
- Renders as a plain `View` (not `Pressable`) when it has no `onPress`, so read-only tags don't register as buttons in the accessibility tree.

### Cards / Containers
Two variants, chosen by emphasis rather than by content type — and now also by which brand color owns the content:
- **Bordered neutral:** `colors.surface` fill, 1px `colors.border`, `rounded.lg` — the schedule timeline row.
- **Tonal, lime family:** `colors.primary-light` fill, `colors.primary-deep` text, no border, `rounded.md` — recommendation/discovery info (currently just the category badge chip).
- **Tonal, purple family:** `colors.accent-light` fill, `colors.accent` text, no border, `rounded.md` — route/itinerary summaries: the visit-context card, the trip-total card, and the "카카오맵으로 열기" map button.
- **Shadow strategy:** none — see Elevation & Depth.

### Inputs / Fields
None exist yet — no `TextInput` appears anywhere in the current implementation. Establish this section's conventions (stroke, focus treatment, error state) when the Search tab's real keyword search input ships, rather than inventing one now.

### Navigation
- **Bottom tab bar:** 64dp height, `colors.surface` fill, 1px top border in `colors.border`. Active/inactive state is a tint swap (`colors.primary-deep` / `colors.text-muted`) on both the Lucide line icon (24px, 1.75 stroke weight — no filled or color-emoji icons) and the `typography.micro` label beneath it. Uses the deep lime step, not the bright fill color — the active tint sits directly on white tab-bar background as a foreground color, where Fresh Lime fails contrast.
- **Screen headers (custom-built, not the native-stack header):** `colors.surface` fill, 1px bottom border, a 36×36 circular back button with a plain "←" glyph, and a `typography.heading` title.
- **Native-idiom note:** because the platform is recorded as adaptive but the current implementation is one shared React Native chrome, none of this navigation yet uses SF Symbols/Material iconography or the Material navigation-bar/rail pattern described in `ios.md`/`android.md`. Treat that divergence as a known gap, not as this system's current voice.

## Do's and Don'ts

### Do:
- **Do** route every pill-shaped element (selection chips, day tabs, tags, category badges) through the shared `Chip` component. Never hand-roll a pill in a screen's `StyleSheet` — that drift is exactly why `Chip` exists.
- **Do** pair every Fresh/Pressed Lime fill with dark (`colors.text`) content, never white or the bright lime itself as text (**The Lime-Fill, Purple-Text Rule**).
- **Do** use `primary-deep`, not `primary`, whenever lime needs to be a foreground color on a light background (links, active tab, icons/spinners) — the bright fill color fails contrast there.
- **Do** reserve purple for the trip's route/itinerary — the Schedule timeline, its labels and summary cards, and route-related actions like opening the map (**The Discovery vs. Route Rule**). Reserve lime for discovery/action moments — picking, selecting, submitting.
- **Do** use a tonal fill (`primary-light` or `accent-light`), not a shadow, to raise emphasis on a surface. Zero `box-shadow`/elevation usage exists today; keep it that way (**The No-Shadow Rule**).
- **Do** reach for `rounded.pill` for anything that must always resolve to a true half-circle regardless of content height (**The True Pill Rule**), and reserve `lg`/`md`/`sm` for fixed-shape corners.
- **Do** pick text styles by role (`typography.body`, `.label`, …) rather than a raw font size (**The Role, Not Size Rule**).

### Don't:
- **Don't** introduce drop shadows, elevation, or glassmorphism — this system's entire depth vocabulary is hairline borders plus tonal fill.
- **Don't** use `primary` (Fresh Lime) as a text or icon color on its own — it was measured at ~2.2:1 against white, well under the 3:1 floor for graphical objects. Use `primary-deep` instead.
- **Don't** put a third brand color into rotation — lime and purple each have one job; a third accent dilutes both (extends **The Discovery vs. Route Rule**).
- **Don't** set a custom font family — the system intentionally rides the OS system font with no override today; a brand display face is an open decision, not something to assume.
- **Don't** add a new pressed/hover treatment ad hoc — the schedule timeline row's tonal-background swap and the map-open button's 70%-opacity dim remain unconverged with the primary-button pressed pattern; converge them before adding a fourth variant.

## Known Gaps

This audit predates the 골라 담기 (PickListScreen) flow and the `excludedPlaces` warning card, both merged separately. When this palette was carried over, the same fill/foreground split (`primary` = fill only, `primary-deep` = foreground) and pressed-state pattern (`primary-pressed` on every primary CTA) were applied to `PickListScreen.tsx` for consistency, but the screen itself — its list-with-header-and-footer layout, its "chip picked" checkmark treatment — was never walked through by this audit the way the other screens were. Revisit it here before treating this document as authoritative for that screen.
