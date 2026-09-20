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
  warn: "#A84C18"
  text: "#1F182A"
  text-muted: "#726784"
  border: "#CCBFE3"
  surface: "#FFFFFF"
  background: "#F8F6FB"
  placeholder: "#E1DCE9"
  disabled: "#C4BAD6"
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
    textColor: "{colors.accent}"
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
    textColor: "{colors.surface}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: "52px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.surface}"
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
- Two brand colors split by role, not by feature: lime (`primary`) is the fill under an action, purple (`accent`) is the route/itinerary *and* the interface chrome (titles, labels, active tab) — never blended, never decorative
- Lime is a fill only, always under a white label (a deliberate contrast trade — see **The Lime-Fill Rule**); a separate darker step (`primary-deep`) exists for lime-as-foreground (links, spinners) where the bright fill would fail
- Flat by default: borders and tonal fills carry depth, not shadows
- Four shared primitives carry the repeated elements: `Chip` for every pill, `Button` for every full-width CTA, `ScreenHeader` for every back-button bar, `Card` for every bordered surface — screens pass intent, not styling
- System font only — no custom typeface committed yet

## Colors

Two brand hues on a white/near-white base: lime for discovery and primary action, purple for the route/itinerary. Both fill (tonal, dark/white text) and foreground (text-on-white) roles are covered by dedicated steps of each color — a plain 1:1 swap of the old blue for lime was rejected specifically because lime's brightness fails WCAG contrast as a foreground color; splitting it into a fill step and a deep foreground step is what makes the palette usable, not just colorful.

### Primary
- **Fresh Lime** (`#73C322`): the brand-primary fill. Primary CTA buttons (일정 만들기, 다시 만들기), selected day/region/keyword chip fill. Always paired with a white label on top (**The Lime-Fill Rule**), and never used as a foreground color itself.
- **Pressed Lime** (`#66A71B`): pressed/active state of any Fresh Lime fill. Still paired with a white label.
- **Lime Surface** (`#F0F9E7`): a whisper-light tonal wash of Fresh Lime. Used for "recommendation info" tonal surfaces — currently the category-badge chip (`soft` variant).
- **Trailhead Green** (`#367010`): the text-safe deep step of the lime family. Used wherever lime needs to sit as a *foreground* color against white/near-white — links, the keyword-loading spinner, text on Lime Surface, and the Schedule screen's meal-anchor label and border. Fresh Lime itself is never used as text or a small icon; it exists only as a fill. (The active bottom tab used to be listed here; it is chrome, so it is `accent` now — and the code always did that.)

### Secondary
- **Trail Purple** (`#6B33CC`): the route/itinerary color — literally the Trail Line — and the app's chrome color. As route: Schedule timeline dot and connecting line (line rendered at 35% opacity so it doesn't dominate a long scroll), day headers, timeline time labels, trip-total text, visit-context text, "카카오맵으로 열기" map-open text, the calendar's selected day (a solid purple fill with white type), and secondary actions like the keyword-retry link. As chrome: header titles and back glyphs, screen titles, section/field labels, unselected chip labels, and the active bottom tab. Dark enough at full saturation to pair with white text directly — no separate deep step needed the way lime has one, and it clears 4.5:1 on every light surface in the system (7.07:1 on white).
- **Pressed Purple** (`#452183`): pressed/active state, reserved for a future solid-purple control (none of the current screens use a solid purple fill yet — today's purple usage is all tonal-surface or text/icon).
- **Purple Surface** (`#F0EBF9`): tonal wash of Trail Purple. Trip-total card, visit-context card, map-open button background, and the pressed state of a timeline row (replacing the old lime-tinted press, since the row belongs to the itinerary timeline).

### Neutral

**The neutrals carry the accent's hue (262°), not their own.** They used to sit at 218–228° — a blue bias chosen for the pre-redesign blue primary `#2F6FED` — and that hue was never migrated when the brand moved to lime and purple. Because the neutrals are the most-used tokens in the app (`text` 39 sites, `text-muted` 28, `border` 22, `background` 13), that orphaned blue was what made most screens read as generic grey rather than branded. They were re-hued to 262° **with lightness held fixed**, so every contrast ratio was preserved or improved (`text` 16.51→17.18 on white, `text-muted` 4.83→5.26, dark-on-lime 7.51→7.82). When adding or adjusting a neutral, keep that split: hue is 262°, and the role picks the lightness.

- **Cloud White** (`#FFFFFF`) — `surface`: card, header, footer, and tab-bar backgrounds. The one neutral with no hue to carry.
- **Fog Background** (`#F8F6FB`) — `background`: base screen background, one step darker than surface so cards visibly sit on top of it without a shadow.
- **Trail Hairline** (`#CCBFE3`) — `border`: 1px dividers and card outlines; the system's only depth cue besides tonal fill. The one neutral whose lightness moved as well as its hue: the previous grey measured 1.25:1 on a white card, meaning the app's only depth cue was effectively invisible, so this step was raised to 1.73:1. It is a brand-tinted line by design, not a neutral hairline.
- **Ink Text** (`#1F182A`) — `text`: primary reading color for titles and body content, and the label on a disabled button fill.
- **Muted Slate** (`#726784`) — `text-muted`: secondary/meta text (timestamps, captions, subtitles).
- **Image Placeholder** (`#E1DCE9`) — `placeholder`: empty-image fill on place thumbnails and hero images.
- **Disabled Lavender** (`#C4BAD6`) — `disabled`: disabled primary-button fill (a color swap, not an opacity trick). Being *lavender* rather than a neutral grey is the point: it sits 172° from the active Fresh Lime, so the disabled state reads as a different color instead of a faded one. A lime-tinted grey was rejected for exactly that reason — only ~10° from the active fill, it reads as "a pale lime button" and invites taps.

### Functional
- **Burnt Amber Warn** (`#A84C18`) — `warn`: error/failure text only (keyword-load failure, schedule-generation failure). No warning backgrounds or icons use it yet — text color only. Because this token is *only* ever text, contrast is the constraint that picks its value: the previous Warm Amber (`#F2A65A`) measured 2.02:1 against white, far under the 4.5:1 floor for body text, so it was darkened at the same hue to reach 5.66:1 on white and 5.08:1 on `warnLight`. Read it as "amber, dark enough to be text" — if a future warning *fill* or icon is needed, add a separate lighter step rather than brightening this one back up.

### Named Rules
**The Lime-Fill Rule.** Lime is only ever a *fill*, never a foreground color on its own — as text or a small icon its brightness fails contrast, so `primary-deep` covers that job. Every lime fill carries a **white** label (`primary`/`primary-pressed` + `surface`): primary CTAs, selected chips, the picked-place check. Purple has no restriction at all: `accent` works as fill-with-white-text or as foreground-on-white interchangeably.

**A measured trade, made deliberately.** White on Fresh Lime is 2.20:1, under the 4.5:1 floor for body text and the 3:1 floor for large text — and 2.20:1 is the *ceiling*, because white is the lightest color there is. Anything that passes on this fill has to be near-black, which reads as unstyled default rather than a brand control. The alternatives were all walked and rejected on the device: a deep-green fill with white text changed the app's identity rather than keeping lime; a very dark green label did not read as green at chip size; a lime tint plus border lost the saturated lime. White was chosen with the contrast cost known. Do not "fix" this back to dark text without raising it as a design decision — and if a future change needs a compliant pairing, darken the *fill* rather than the label, since the label has nowhere brighter to go.

**The disabled label is exempt.** A disabled button swaps its fill to `disabled` (a pale lavender), where white would fall to 1.85:1 and the label would effectively vanish. Disabled labels stay `text`, in a separate style from the active label, so changing one never drags the other.

**The Discovery vs. Route Rule.** Lime is the color of *committing* — the fill under a choice being made or an action being taken (a selected chip, the primary CTA). Purple is the color of everything the app says *around* that choice: the trip's route and timeline (the Schedule rail, day/time labels, trip totals, "open in map") **and the interface chrome** (header titles and back glyphs, screen titles, section labels, unselected chip labels, the active tab). So the two are not split by screen or by feature — they are split by whether the pixel is a fill under an action (lime) or type and structure the user reads (purple).

This is wider than purple's original scope, which was the route alone. It was widened deliberately: the neutrals had been carrying the chrome in a leftover blue-grey, which read as unbranded, and moving chrome onto purple is what makes the app look like itself. The boundary that still holds absolutely: **a lime fill never gets purple type on it.** `Chip`'s `selected` and `soft` variants override the purple label for exactly that reason.

**The Chrome-Purple Rule.** Purple for chrome, ink for content, muted for metadata. Concretely — header/screen titles, back glyphs, section labels and unselected chip labels are `accent`; place names, body copy, card titles and dates are `text`; addresses, travel/stay times, subtitles and read-only tags are `text-muted`. When adding a new text style, decide which of those three it is before picking a token; "it looked better" is not one of the three.

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

Flat by design — there is no `shadow`/`elevation` usage anywhere in the codebase. Depth is conveyed two ways instead: a 1px hairline border (`colors.border`) around cards and between chrome regions, and a tonal fill that marks an emphasized or "raised" surface in place of a shadow or scale change — `colors.primary-light` for discovery content (the soft chip variant), `colors.accent-light` for route content (the visit-context card, the trip-total card, the "open in map" button) and for any pressed card.

### Named Rules
**The No-Shadow Rule.** Depth is a border or a tint, never a `box-shadow`. If a new component reaches for elevation, translate it to a tonal fill or a border first.

## Shapes

Four-step radius scale, chosen by role rather than by component:
- **pill (999px):** always used for anything selectable or tag-like — every `Chip`, and the circular back button. The radius is deliberately larger than any real element height so it always resolves to a true half-circle regardless of content-driven height, instead of picking a fixed value per screen.
- **lg (16px):** primary content surfaces — the schedule timeline card, primary buttons, the place-detail hero image's implicit bottom edge.
- **md (12px):** secondary/tonal surfaces and thumbnails — tonal cards, image thumbnails, category-badge context.
- **sm (8px):** the one small, low-emphasis control observed (the keyword-retry button).

Borders are always a 1px line in `colors.border`, and that token is brand-tinted (`#CCBFE3`) rather than a neutral grey — so a default border in this system carries color. Nothing uses a *thicker* border, and no component picks its own border color: the two exceptions that set a border color directly are both deliberate emphasis, not new defaults — the Schedule screen's meal-anchor row (`1.5px` `primary-deep`) and the secondary-button outline (`accent`).

### Named Rules
**The True Pill Rule.** Never hand-pick a radius for a pill-shaped element — use `rounded.pill` so height changes never break the shape.

## Components

### Buttons

Every full-width CTA in the app goes through one component, `src/components/Button.tsx` — the same move `Chip` made for pills. Screens pass `label`, `onPress`, `variant`, `disabled` and `loading`; they do not get to set color, height or radius. The `style` prop exists but is for **placement only** (flex, margin), because letting a caller override the look is exactly how the values drifted apart the first time.

- **Shape:** `rounded.lg` (16px), height **52**. (Schedule's CTAs used to be 50px; they were converged onto 52, which five other screens already used.)
- **Primary:** `colors.primary` (Fresh Lime) fill, `colors.surface` (white) label, `typography.button`. See **The Lime-Fill Rule** for why white, and what it costs.
- **Secondary:** `colors.surface` fill, 1px `colors.accent` border, `colors.accent` label — a Trail Purple secondary action, not lime. Used for "여행 종료" and for "다시 만들기" when a save button is also present.
- **Pressed:** primary swaps its fill to `colors.primary-pressed`; secondary swaps to a tonal `colors.accent-light` background. Every CTA has this now — `PickCondition` and `FestivalPlan` previously had no pressed feedback at all.
- **Disabled:** primary swaps its fill to `colors.disabled` (not an opacity reduction — Schedule used to dim to 0.55 and was converged onto the fill swap) and its label to `colors.text`, because white would be 1.85:1 on that pale lavender. Secondary instead drops its border and label to muted, since its background stays white.
- **Loading:** the label is replaced by an `ActivityIndicator` and the press is blocked, so a second tap during an in-flight request cannot fire it twice. Callers pass `loading`; they no longer branch on it themselves.

Still hand-rolled, and a reasonable next step: the small in-content buttons (the "다시 불러오기" pill on an empty list, the bordered `rounded.sm` retry under a failed keyword load). They are a different shape — auto-width, sitting inside content rather than pinned to a footer — so they were left out rather than bent into this component.

The schedule timeline row still swaps to a tonal background on press and the map-open button still drops to 70% opacity; those two remain unconverged with the button pattern.

### Chips
One shared component (`src/components/Chip.tsx`) renders every pill in the app — keyword picker, day-count picker, region picker, schedule day tabs, place tags, and the category badge. It was built specifically to stop four screens from drifting to four different pill paddings/radii.
- **Shape:** always `rounded.pill`.
- **Sizes:** `md` (8px/12px padding, `typography.small` text) and `sm` (4px/8px padding, `typography.micro` text).
- **Structural variants:** `outline` (1px `colors.border`, `colors.surface` fill, `colors.accent` label — the default; the label is chrome, so it is purple) and `soft` (no border, `colors.primary-light` fill, `colors.primary-deep` text — used for read-only tags like the category badge; the text uses the deep step, not the bright fill color, because bright-on-light-tint fails contrast too). The `sm` size keeps `text-muted` instead, because at that size a chip is a read-only tag — metadata, not chrome.
- **State modifiers, composable on either variant:** `selected` (fills `colors.primary` with a **white** `colors.surface` label, matching the primary button) and `dimmed` (0.4 opacity, used when a selection cap like "max 3 keywords" is reached).
- Every `Chip` use in the app — including the Schedule screen's day tabs — goes through this one selected-state contract (lime fill, white text). Purple is reserved for the itinerary *visualization* itself (the timeline rail, labels, summary cards), not for chip-style pickers, even on the Schedule screen.
- Renders as a plain `View` (not `Pressable`) when it has no `onPress`, so read-only tags don't register as buttons in the accessibility tree.

### Cards / Containers

The bordered card shell lives in one component, `src/components/Card.tsx`. It owns the shell (`colors.surface` fill, 1px `colors.border`, `rounded.lg`) and the press response; callers keep padding and layout, because those genuinely differ by content — the festival card has no padding at all so its image can run edge to edge, while the pick row and timeline row are horizontal with a gap. `onPress` omitted renders a plain `View`, so a display-only card is not a button in the accessibility tree (the same rule `Chip` follows).

- **Pressed:** a tonal `colors.accent-light` fill, on every pressable card. This used to be three different things — the festival card darkened its border to `primary-deep`, the pick row filled with `primary-light`, the timeline row and trip card filled with `accent-light`. They were converged on the purple tonal: it was the plurality, and a tonal fill reads as pressed more clearly than a border going one shade darker.
- **Selected:** `selected` marks a card the user picks rather than navigates through (only the 골라 담기 place row today). It makes the card a `checkbox` in the accessibility tree and turns its border `colors.primary`. Accessibility meaning and appearance sit on one prop so neither can be set without the other.
- **Tonal, lime family:** `colors.primary-light` fill, `colors.primary-deep` text, no border, `rounded.md` — recommendation/discovery info (currently just the category badge chip). Not a `Card`; these are tonal surfaces, not bordered ones.
- **Tonal, purple family:** `colors.accent-light` fill, `colors.accent` text, no border, `rounded.md` — route/itinerary summaries: the visit-context card, the trip-total card, and the "카카오맵으로 열기" map button. Also not a `Card`.
- **Content-specific border emphasis** goes through `style`, not a variant — the Schedule screen's meal-anchor row (1.5px `primary-deep`) marks a meaning, not a selection, so it stays with the screen that understands it. `Card` layers the press response *after* `style`, so a card with an overridden border still shows that it was pressed.
- **Shadow strategy:** none — see Elevation & Depth.

### Inputs / Fields
None exist yet — no `TextInput` appears anywhere in the current implementation. Establish this section's conventions (stroke, focus treatment, error state) when the Search tab's real keyword search input ships, rather than inventing one now.

### Navigation
- **Bottom tab bar:** 64dp height, `colors.surface` fill, 1px top border in `colors.border`. Active/inactive state is a tint swap (`colors.accent` / `colors.text-muted`) on both the Lucide line icon (24px, 1.75 stroke weight — no filled or color-emoji icons) and the `typography.micro` label beneath it. The active tab is chrome, so it takes purple (**The Chrome-Purple Rule**); note this document previously described the active tint as `primary-deep` while the code had always used `accent` — the code was right and the text has been corrected.
- **Screen headers (custom-built, not the native-stack header):** one component, `src/components/ScreenHeader.tsx`, used by every screen that has a back button. `colors.surface` fill, 1px bottom border, a 36×36 back button with a plain "←" glyph, and a `typography.heading` title — glyph and title both `colors.accent`. The title is always clipped to one line, because a long region name wrapping the bar to two lines pushes the content below it. Screens pass `title` and `onBack`; `backLabel` exists only for when going back means something more specific than "back" (골라 담기 reads it as "조건 바꾸기").
- **Two headers stay outside that component**, both deliberately: Place Detail's floating hero back button is the same glyph and color but sits on a `rgba(255,255,255,0.9)` disc over a photo, and 내 여행 is a tab root with no back button at all — it stacks a title over a subtitle with its own padding.
- **Native-idiom note:** because the platform is recorded as adaptive but the current implementation is one shared React Native chrome, none of this navigation yet uses SF Symbols/Material iconography or the Material navigation-bar/rail pattern described in `ios.md`/`android.md`. Treat that divergence as a known gap, not as this system's current voice.

## Do's and Don'ts

### Do:
- **Do** route every pill-shaped element (selection chips, day tabs, tags, category badges) through the shared `Chip` component. Never hand-roll a pill in a screen's `StyleSheet` — that drift is exactly why `Chip` exists.
- **Do** pair every Fresh/Pressed Lime fill with a white (`colors.surface`) label, and keep that one pairing everywhere a lime fill appears — buttons, selected chips, the picked check (**The Lime-Fill Rule**).
- **Do** use `primary-deep`, not `primary`, whenever lime needs to be a foreground color on a light background (links, active tab, icons/spinners) — the bright fill color fails contrast there.
- **Do** reserve purple for the trip's route/itinerary *and* the interface chrome — the Schedule timeline and its labels, summary cards, route actions like opening the map, plus header/screen titles, section labels and unselected chip labels (**The Discovery vs. Route Rule**, **The Chrome-Purple Rule**). Reserve lime for the fill under an action — picking, selecting, submitting.
- **Do** sort every new text style into chrome / content / metadata before choosing a token, and keep content on `text` and metadata on `text-muted` — turning body copy or a place name purple is what tips this palette from branded into noisy.
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
