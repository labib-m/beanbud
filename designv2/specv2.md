# Bean Bud v2: visual and interaction specification

The direction is an editorial café journal on an espresso ground, dark by default with light as the alternative. It is built mobile-first on a 390 × 844 design frame.

All existing functionality is retained unchanged in behaviour: the search, city filter, sort filter and tag filters on Notebook and Feed, the Activity / Directory tabs, the log-a-visit fields, the People directory and profiles, and the bottom navigation labels and order. This document restyles those parts and adds date segmentation, month segmentation and a monthly summary.

---

## 1. Colour

Tokens are set on the app root; `[data-theme="light"]` overrides them. Each token is given as authored plus its flat hex over that theme's background, for platforms that need a flat value.

### 1.1 Dark theme (default)

| Token | Authored | Flat hex | Used for |
| --- | --- | --- | --- |
| `--bg` | `#16140f` | `#16140f` | App background, sheet background |
| `--surf` | `#211e19` | `#211e19` | Featured card, search field, filter pills, segmented track, price pill, note field |
| `--surf2` | `#2b2721` | `#2b2721` | Pressed/hover state of `--surf` elements |
| `--ink` | `#f9f4ed` | `#f9f4ed` | Primary text |
| `--ink2` | `rgba(249,244,237,0.86)` | `#d9d5ce` | Secondary emphasis: stat line, note text, plain-row ratings, criteria labels |
| `--mut` | `rgba(249,244,237,0.58)` | `#9a9690` | Metadata, inactive nav, handles |
| `--lab` | `rgba(249,244,237,0.52)` | `#8c8882` | Section labels, date-group labels |
| `--fai` | `rgba(249,244,237,0.40)` | `#716e68` | Tertiary text: drink-row metadata, carets, footnotes, axis labels |
| `--line` | `rgba(249,244,237,0.09)` | `#2a2823` | Row dividers, group rules, nav top border, bar tracks |
| `--line2` | `rgba(249,244,237,0.20)` | `#43413b` | Chip outlines, empty stars, empty day bars |
| `--acc` | `#f6a06b` | `#f6a06b` | Peach accent: FAB, primary buttons, selected chips, active tab underline, criteria bars, sparkline, filled input stars, title period |
| `--accText` | `#f6a06b` | `#f6a06b` | Accent used as text: star glyphs, active nav, links, "Today" label, featured ratings |
| `--accMuted` | `color-mix(--acc 55%, transparent)` | `#916142` | Day bars older than two days |
| `--accInk` | `#16140f` | `#16140f` | Text on `--acc` |
| `--sage` | `#aebf92` | `#aebf92` | Reserved; avatar tones only |
| `--navBg` | `rgba(22,20,15,0.94)` + 12px backdrop blur | `#16140f` | Bottom navigation |
| `--scrim` | `rgba(0,0,0,0.55)` | `#0a0907` | Behind the log sheet |

### 1.2 Light theme

| Token | Authored | Flat hex |
| --- | --- | --- |
| `--bg` | `#f5ead8` | `#f5ead8` |
| `--surf` | `#ebddc5` | `#ebddc5` |
| `--surf2` | `#e3d3b8` | `#e3d3b8` |
| `--ink` | `#201e1d` | `#201e1d` |
| `--ink2` | `rgba(32,30,29,0.86)` | `#3e3b37` |
| `--mut` | `rgba(32,30,29,0.62)` | `#716b64` |
| `--lab` | `rgba(32,30,29,0.58)` | `#79746c` |
| `--fai` | `rgba(32,30,29,0.46)` | `#938c82` |
| `--line` | `rgba(32,30,29,0.10)` | `#e0d6c5` |
| `--line2` | `rgba(32,30,29,0.22)` | `#c6bdaf` |
| `--acc` | `#c67139` | `#c67139` |
| `--accText` | `#8c491a` | `#8c491a` |
| `--accMuted` | `color-mix(--acc 55%, transparent)` | `#dba781` |
| `--accInk` | `#f9f4ed` | `#f9f4ed` |
| `--sage` | `#56633f` | `#56633f` |
| `--navBg` | `rgba(245,234,216,0.94)` + 12px backdrop blur | `#f5ead8` |
| `--scrim` | `rgba(32,30,29,0.45)` | `#9c948a` |

### 1.3 Avatar tones (both themes)

| Person | Tone | Glyph |
| --- | --- | --- |
| You (@labib) | `#ffc6a5` | 🫘 |
| Zeba (@beepbeep) | `#ccdbb2` | 🌊 |
| Kakku (@kakku) | `#ffc6a5` | ☀️ |
| Nuzhat (@nuzhat) | `#e1eecc` | 🌿 |

New users are assigned from the set `#ffc6a5`, `#ccdbb2`, `#e1eecc`, `#ffe1d0`, `#f0fae1`.

### 1.4 Colour rules

- Rating number: `--accText` in a featured card and in the detail header; `--ink2` in plain rows. The star glyph is always `--accText`.
- Trend glyph on a notebook row: `▲` in `--accText` when the last visit scored more than 0.05 above the one before; `▼` in `--mut` when more than 0.05 below; nothing otherwise.
- Friend comparison delta: `--accText` when the difference from your score is 0.25 or more; otherwise "same as you" in `--fai`.
- Overlap score (profile): `--accText` when it differs from yours by 0.5 or more; otherwise `--ink2`.
- Price-rise note on a coffee row: `--accText`. Its neutral usage line is `--fai`.
- The date-group label reading "Today" is `--accText`; all other date-group labels are `--lab`.
- No green, red or gradient anywhere.

---

## 2. Type

### 2.1 Families

- Display: `Caprasimo`, weight 400 only. Stack: `Caprasimo, Georgia, serif`.
- Functional: `Figtree`, weights 400, 500, 600, 700. Stack: `Figtree, "Noto Sans Bengali", "Noto Sans Thai", system-ui, sans-serif`.
- `Noto Sans Bengali` and `Noto Sans Thai` exist in the stack only to render `৳` and `฿`.
- `font-variant-numeric: tabular-nums` on every rating, price, count, date and stat line.

### 2.2 Display roles (Caprasimo 400)

Caprasimo is limited to these roles. It is not used for café names in lists, usernames, ratings, metadata or navigation.

| Role | Size | Line-height | Letter-spacing | Colour |
| --- | --- | --- | --- | --- |
| Profile title ("You.", "Kakku.") | 46px | 0.95 | −0.01em | `--ink`, period `--acc` |
| Screen title ("Notebook.", "Feed.", "People.") | 42px | 0.95 | 0 | `--ink`, period `--acc` |
| Café name, detail header | 32px | 1.02 | 0 | `--ink`, `text-wrap: balance` |
| Empty-state headline | 26px | 1.12 | 0 | `--ink` |
| Month heading (summary block, month divider) | 24px | 1.05 | 0 | `--ink`; year in `--fai` |
| Month divider in lists | 20px | 1.05 | 0 | `--ink`; year in `--fai` |

### 2.3 Functional roles (Figtree)

| Role | Weight | Size | Line-height | Letter-spacing | Colour |
| --- | --- | --- | --- | --- | --- |
| Section label ("RECENTLY VISITED") | 700 | 11px | 1 | 0.14em, uppercase | `--lab` |
| Date-group label ("TODAY", "18 SEP") | 700 | 10.5px | 1 | 0.13em, uppercase | `--lab` / `--accText` |
| Café-name input (log sheet) | 700 | 22px | 1.2 | −0.01em | `--ink` |
| Detail score | 700 | 24px | 1.1 | −0.01em | `--accText`; star 16px |
| Profile name | 700 | 19px | 1.2 | −0.01em | `--ink` |
| Featured-row café name | 700 | 17px | 1.25 | −0.01em | `--ink` |
| Feed café name | 700 | 16px | 1.25 | −0.01em | `--ink` |
| Plain-row café name, people name | 700 | 15.5px | 1.25 | −0.01em | `--ink` |
| Sheet title ("New visit") | 700 | 15px | 1.2 | 0 | `--ink` |
| Primary button | 700 | 14.5px (15px in sheet) | 1.2 | 0 | `--accInk` |
| Row rating number | 700 | 14–14.5px | 1 | 0 | per §1.4 |
| Visit-log date, friend name, overlap café | 700 | 14–14.5px | 1.3 | 0 | `--ink` |
| Drink name | 600 | 14.5px | 1.3 | 0 | `--ink` |
| Stat line ("5 cafés · 7 visits · 1 city") | 400 | 14.5px | 1.4 | 0 | `--ink2` |
| Search input | 500 | 14px | 1.2 | 0 | `--ink`; placeholder `--fai` |
| Note text in detail, textarea | 400 | 13.5–14px | 1.5–1.55 | 0 | `--ink2` / `--ink` |
| Sort tab | 600 | 13.5px | 1 | 0 | `--ink` active / `--mut` inactive |
| Criteria label, details key/value | 400 | 13.5px | 1.45 | 0 | `--ink2` / `--mut` key |
| Drink-row rating | 600 | 13.5px | 1 | 0 | `--ink2` |
| Row metadata (area, city · date) | 400 | 13px | 1.4 | 0 | `--mut` |
| Feed note excerpt | 400 | 13px | 1.5 | 0 | `--ink2`, clamp 2 lines |
| Feed author line | 400, name 700 | 13px | 1.4 | 0 | `--mut`, name `--ink` |
| Average line ("★ 3.5 average · usually…") | 400, number 600 | 13px | 1.4 | 0 | `--mut`, number `--ink` |
| Link ("All 7 visits", "Open in Maps ↗", "‹ People") | 600 | 12.5–13.5px | 1.2 | 0 | `--accText` |
| Segmented option | 700 | 12.5px | 1 | 0 | `--accInk` active / `--mut` |
| Drink-row metadata, featured extra line | 400 | 12.5px | 1.5 | 0 | `--fai` / `--ink2` |
| Filter pill (city, sort) | 700 | 12px | 1 | 0 | `--ink` |
| Tag chip | 600 | 12px | 1 | 0 | per chip state |
| Result count ("12 visits from 4 notebooks") | 400 | 12.5px | 1.3 | 0 | `--mut` |
| Friend meta, comparison line | 400 | 12px | 1.4 | 0 | `--mut` |
| Nav label | 600 inactive / 700 active | 11.5px | 1 | 0 | `--mut` / `--accText` |
| Row star glyph | — | 10.5–11px | 1 | 0 | `--accText`, 3px left margin |
| Axis labels, footnotes | 400 | 10.5–12px | 1.3 | 0 | `--fai` |

The minimum text size is 10.5px, used only for date-group labels, axis labels and star glyphs.

---

## 3. Spacing

The base unit is 2px. The scale in use:

**2 · 3 · 4 · 6 · 7 · 8 · 9 · 10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 34 · 36 · 44 · 48**

Components use small internal spacing and large spacing between sections.

| Tier | Values | Applies to |
| --- | --- | --- |
| Inside a row | 2–4px | Name → metadata (3px), metadata → price (2px), star margin (3px) |
| Row internals | 6–12px | Chip gap 6px, avatar-to-text 12–14px, rating-to-price 12px, note top margin 7px, featured extra line 9–10px |
| Row padding | 10–15px | See §7 |
| Header stack | 14–22px | Title → identity 22px, identity → stats 16px, title → search 20px, search → filters 12px, filters → count 18px, title → sort tabs 22px, tabs → city chips 12px |
| Between date groups | 18–26px | Profile 18px, Feed 20px, Notebook 26px |
| Between sections | 34–48px | Header → overlap 34px, → Recently visited 36px, → coffee 44px, → month summary 48px; café-detail sections 36px |
| Screen padding | 24px horizontal | Scroll area padding `12px 24px 116px` (café detail top 8px). The bottom 116px clears the nav. |
| Sheet padding | 22px horizontal | Body padding `18px 22px 28px` |

---

## 4. Radii

| Element | Radius |
| --- | --- |
| Log sheet, top corners | 28px |
| Featured card (notebook, feed, profile) | 20px |
| Note textarea | 18px |
| Bars, tracks, day bars, sparkline caps | 999px |
| Buttons, FAB, search field, filter pills, chips, tags, segmented track and options, price pill, avatars, nav dot, toast | 999px |
| Plain rows | 0 (no container) |
| Phone frame (mockup only) | 44px |

Only featured content, the sheet and the note field use large non-pill radii. Repeated content has no container.

---

## 5. Borders, dividers, shadows

| Element | Value |
| --- | --- |
| Row divider | `1px solid var(--line)` on the bottom edge; omitted on the last row of each group |
| Date-group rule | 1px line in `--line`, filling the space to the right of the label, 10px gap, vertically centred |
| Sort-tab track | `1px solid var(--line)` bottom border; the active tab carries a `2px solid var(--acc)` underline overlapping it by 1px |
| Detail rows (hours, parking, address) | `1px solid var(--line)` bottom |
| Chip, unselected | `1px solid var(--line2)` |
| Chip, selected | `1px solid var(--acc)`, fill `--acc` |
| Café-detail tag | `1px solid var(--line2)`, no fill |
| Feed filter separator | 1px vertical rule in `--line`, 4px inset top and bottom, 2px side margins |
| Sheet header | `1px solid var(--line)` bottom |
| "More details" expander | `1px solid var(--line)` top and bottom |
| Nav | `1px solid var(--line)` top; background `--navBg`; `backdrop-filter: blur(12px)` |
| Shadows | None in the app UI. The phone frame shadow `0 24px 60px rgba(0,0,0,0.45)` is mockup presentation only |
| Hover (pointer devices) | Rows `opacity: 0.82`; buttons `opacity: 0.9`; the feed café name shifts to `--accText` |
| Focus | `outline: 2px solid var(--acc); outline-offset: 2px` on `:focus-visible` |

---

## 6. Star rating

### 6.1 Display: compact numeric

Every displayed rating is written as the number followed by the glyph: `4.5 ★`.

- The number always has one decimal (`3.0`, not `3`) and uses tabular numerals.
- The glyph is U+2605 `★` in `--accText`, 3px left margin, and never repeated.
- Averages are rounded to one decimal. Individual visit scores are stored in half-star steps.

| Context | Number | Glyph |
| --- | --- | --- |
| Café-detail header | 700 24px `--accText` | 16px, 4px margin |
| Notebook row, featured card, profile visit row | 700 14.5px | 11px |
| Feed item, people row, friend row, visit-log row, overlap row | 700 14px | 10.5px |
| Drink row, coffee row | 600 13.5px | 10.5px |
| Profile average line | ★ 12px **before** the number; number 600 13px `--ink`, followed by "average" | — |

The profile average is the only place the glyph precedes the number. It distinguishes the overall rating from per-item ratings.

### 6.2 Input: tappable stars

Input is the only place stars are drawn as shapes. Each star is its own button.

- **Geometry.** 24 × 24 viewBox, path `M12 2.3l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.36l-5.9 3.1 1.13-6.57L2.45 9.24l6.6-.96z`.
- **Drawing.** An inline-block of `width = height = size`, masked with the path (`mask` and `-webkit-mask`, `0 0 / size size`, no repeat). The background is `linear-gradient(90deg, var(--acc) p, var(--line2) p)`, where `p` is 100% when filled and 0% when empty.
- **Behaviour.** Tapping star *n* sets the value to *n*. Tapping the currently selected star clears the value to 0. Input is whole stars only.

| Context | Star size | Button (hit area) | Fill / empty |
| --- | --- | --- | --- |
| Five criteria rows (Ambiance, Coffee, Food, Service, Crowd) | 22px | 34 × 44px | `--acc` / `--line2` |
| Drink rating | 16px | 22 × 44px | `--acc` / `--line2` |

Each criteria row ends with its value as a number (700 13px `--mut`, 22px wide, right-aligned), or blank when unset.

---

## 7. Components and padding

| Component | Spec |
| --- | --- |
| **Featured card** | The first item of the first date group only; toggleable. Margin `8px 0 6px`, padding `15px 16px` (feed `14px 15px`), radius 20px, fill `--surf`, no border. Holds name + rating, metadata, and one extra line (drinks, prices, note excerpt) at 12.5px `--ink2`. |
| **Plain row** | Padding `12px 0` (feed `13px 0`, drink `10px 0`, visit log `11px 0`, people `14px 0`). No fill. Bottom divider per §5. Name and rating on one baseline-aligned line (`gap: 8–12px`); metadata below. |
| **Date-group header** | Label + rule on one line, `gap: 10px`, `margin-bottom: 4px` (feed 2px). |
| **Month divider** | Caprasimo 20px heading, `margin: 32px 0 4px`. A right-aligned summary ("7 visits · 5 cafés", Figtree 400 12.5px `--mut`) sits on the same baseline. |
| **Section header** | Label left; optional link right (600 12.5px `--accText`); baseline-aligned. |
| **Search field** | Height 44px, radius 999px, fill `--surf`, padding `0 16px`, `gap: 10px`. Leading ⌕ glyph 14px `--fai`. Input 500 14px. A trailing "Clear" (700 12px `--mut`) appears when the field has text. |
| **Filter row** | Horizontally scrolling, `gap: 6px`, bleeds to the screen edges (`margin: 0 -24px; padding: 0 24px`), scrollbar hidden. Order: city pill, sort pill, 1px separator, tag chips. |
| **Filter pill (city, sort)** | Padding `6px 12px`, radius 999px, fill `--surf`, 700 12px `--ink`, label followed by ` ▾`. Opens the existing option list. |
| **Tag chip** | Padding `5px 11px`, radius 999px, 600 12px, `white-space: nowrap`. Unselected: transparent, `--ink`, `--line2` border. Selected: `--acc` fill and border, `--accInk` text. Multi-select; all selected tags must match (AND). |
| **Segmented control** | Track padding 3px, radius 999px, fill `--surf`. Options padding `7px 14px`, radius 999px, 700 12.5px. Active: `--acc` / `--accInk`. Inactive: transparent / `--mut`. |
| **Sort tabs** | `gap: 18px`, each `flex: none; white-space: nowrap; padding-bottom: 10px`. Underline per §5. |
| **Primary button** | Radius 999px, fill `--acc`, 700 14.5px `--accInk`. Padding 14px vertical at full width, or `13px 24px` inline. |
| **Text link / back link** | 600 13px `--accText`, "‹ " prefix for back, padding `6px 0`. |
| **Avatar** | Circle filled with the person's tone, glyph centred. Sizes: profile 58px (glyph 28px), people row 46px (22px), feed 36px (18px), friend row 30px (15px). |
| **Criteria bar row** | Padding `7px 0`, `gap: 12px`. Label 76px wide; track 4px tall, radius 999px, `--line`; fill `--acc` at value ÷ 5; value 28px wide, right-aligned. |
| **Sparkline** | Shown only with 3 or more visits. viewBox `0 0 300 44`, polyline stroke 2px `--acc`, round joins and caps, end dot r = 4 `--acc`. First and last dates below at 11px `--fai`. |
| **Month activity strip** | 30- or 31-column grid, `gap: 3px`, height 26px, bars bottom-aligned, radius 999px. 0 visits: 4px `--line2` (future days `--line`). 1 visit: 16px. 2+ visits: 26px. Visit bars from today and yesterday are `--acc`; earlier ones are `--accMuted`. The label row uses the same grid: "1 Sep" in column 1, "Today" in today's column (700 `--accText`, centred), and the last day right-aligned in the final column; 10.5px `--fai`, 7px above. |
| **Bottom navigation** | Absolute bottom, padding `8px 10px 24px`, five slots: Notebook · Feed · + · People · You. Each label slot is `flex: 1`, with a 4px dot below: `--acc` when active, transparent otherwise. FAB 50 × 50px, radius 999px, `--acc`, "+" at 26px `--accInk`, not raised above the bar. |
| **Log sheet** | Slides over a `--scrim` backdrop; height 94%, top radii 28px, fill `--bg`. Header: Cancel · New visit · Save, padding `16px 22px 12px`. Body scrolls. |
| **Price pill (sheet)** | Padding `6px 12px`, radius 999px, `--surf`, currency symbol + 48px-wide numeric input, 700 14px. Currency toggles via the "৳ BDT" link beside the Coffee label. |
| **Toast** | 96px above the bottom, padding `10px 18px`, radius 999px, fill `--ink`, text `--bg` 600 13px, 2.4s. |

---

## 8. Screens

### 8.1 Notebook

1. Title "Notebook." with the tally ("5 cafés · 7 visits", 12.5px `--mut`) right-aligned on the title baseline.
2. The existing search bar in the §7 search-field style. Placeholder: "Search your notebook: café, drink or note".
3. The existing filters in the §7 filter row: the city filter (All cities / each city in the notebook), the sort filter (existing options, default Most recent), then the existing tag chips. Behaviour is unchanged.
4. Result count (12.5px `--mut`), 18px below the filters.
5. The café list, segmented as in §9.
   - Each row shows name, trend glyph and rating on one line.
   - The metadata line reads `Area, City · <relative last visit> · N visits · <price band>`.
   - The price band repeats the currency symbol 1–4 times.
6. **Empty state.** No search or filters. The headline "Nothing here yet." is followed by one sentence (14.5px `--mut`, max-width 300px), the primary button "Log your first visit", and the link "See where your friends have been".
7. **One entry.** Search and filters are hidden. The single café renders as a featured card, followed by one 13px `--mut` line: "One café in. Log a second visit here and the notebook starts showing whether it's getting better or worse."
8. **Two or more entries.** Search and filters are shown.

### 8.2 Café detail

The screen is one continuous scroll, top to bottom:

1. **Header**
   - Back link.
   - Café name in the display style.
   - Area, City · price band.
   - Score line: score, then "N visits · today", "N visits · yesterday", or "N visits · last 18 Sep".
   - Trend line: "▲ Up 0.5 on your last visit" or "▼ Down 0.5 on your last visit", 600 12.5px.
   - Tags.
2. **How it scores:** five criteria bar rows, then the sparkline.
3. **Friends here:** avatar, name, visit count, delta vs you, their average.
4. **What you order:** drink name, average price (suffix "avg" when there is more than one price), average rating. Sub-line: "↑ ৳20 since 18 Aug" in `--accText` when the latest price exceeds the earliest; otherwise "N times · last <date>" in `--fai`.
5. **Details:** Hours, Parking, Address rows, then "Open in Maps ↗" linking out. No embedded map.
6. **Your visits:** date rows with rating and caret. Tapping expands drinks with prices, then the note.
7. **Primary button:** "Log another visit here", or "Log your first visit here" when the café is not in your notebook. It opens the sheet pre-filled with this café.

A café that appears only in friends' notebooks shows the header (group average, "from N friends · not in your notebook"), Friends here, Details and the button.

### 8.3 Log a visit

The field order is unchanged: café name, location, date, five criteria stars, coffee with price and its own rating, currency, price band, good-for tags, amenities, parking, note.

1. **Café-name input** with autocomplete from cafés already logged by you or friends. It shows up to 3 suggestion rows: name 700 14.5px, plus meta "Area · N visits" or "Area · friends". Choosing one fills location, currency and price band.
2. **Location / date line:** "Area, City · Today, 23 Sep", 13px `--mut`. Tapping it opens the existing pickers.
3. **Rate it:** five rows with a 1px `--line` divider under each; input stars per §6.2.
4. **Coffee:** horizontally scrolling drink chips plus "Other". Once a drink is chosen, a row shows its name, the price pill and the drink stars. The currency toggle sits beside the section label.
5. **Note:** the textarea.
6. **Optional details:** the expander "Price band, good for, amenities, parking" (collapsed by default) reveals chip groups labelled 12px `--mut`.
7. **Save:** the primary button "Save visit", then the footnote "A name and five taps is a complete visit." (12px `--fai`).

### 8.4 Feed

1. The title "Feed." sits with the Activity / Directory segmented control right-aligned on its baseline.
2. The existing search bar. Placeholder: "Search cafés, drinks, notes, people" on Activity, "Search every café" on Directory. It searches café, drink, note, person name, handle and area.
3. The existing filters in the filter row: city, sort (Most recent / Top rated), then tag chips (Activity only). Existing tags: Late night, Friends, Long stays, Iced americano, Hot Chocolate, Air conditioning, Outdoor seating, Wi-Fi.
4. The result count: "N visits from 4 notebooks", or "N visits match" when a search or filter is active.
5. The **Activity** list is segmented as in §9. Each item has five lines:
   - Avatar, then "**Name** @handle · 6h"; the hours appear only within the last 24h.
   - Rating on the right.
   - Café name (tap opens café detail).
   - Area, City · drink ৳price.
   - Note excerpt, 2 lines.
   - When you have rated the same café: "You gave it **3.5** · you agree / you liked it more / they liked it more". "You agree" means the difference is under 0.25.
6. The **Directory** list shows every café across all notebooks. Each row has three lines:
   - Name, then the group average (the mean of each person's average).
   - Area, City · N people.
   - "You 3.0 · Zeba 3.0 · Kakku 3.5" at 12px `--ink2`.

   Default order is number of people, then average. Top rated sorts by average.
7. **No results:** "Nothing matches that." (700 15px), one line of guidance, and a "Clear filters" link that clears the search, tags and city.

### 8.5 People

The title "People." is followed by "Everyone keeps their own notebook." (13.5px `--mut`). Below it are rows, with You first:

- Avatar 46px.
- "Name @handle" with the average on the right.
- "City · N cafés · N visits".
- The one-line intro (13px `--ink2`).

Tapping a row opens the profile.

### 8.6 Profile (You and others)

1. **Header**
   - You: title "You." with an identity row of the avatar plus name (700 19px) over @handle.
   - Others: back link, title "<Name>.", and an identity row of the avatar plus @handle over the home city.
2. **Stat line:** "N cafés · N visits · N cities", with singular forms where the count is 1.
3. **Average line:** "★ 3.5 average · usually an Americano".
4. **Intro (others only):** 13.5px `--ink2`, 14px above.
5. **Where you overlap (others only):** cafés in both notebooks. Each row shows the café name, "You 3.0" at 12.5px `--mut`, and their score.
6. **Recently visited:** the latest 5 visits, segmented by day (§9). For You, the section header carries the link "All N visits", which opens Notebook. Each row shows café name, rating and "Area, City". The featured card's extra line lists drinks with prices.
7. **Your recent coffee** ("Their recent coffee" for others): the latest 4 drinks. Each row shows the drink name, the price when logged, the rating, and "Café · <relative date>".
8. **Monthly summary (You only):** the current month heading ("September 2026"), the line "N visits · N cafés · N cities", then the month activity strip.

---

## 9. Date and month segmentation

### 9.1 Relative dates

| Age | Display |
| --- | --- |
| Under 24 hours, in feed author lines | "6h" |
| Same calendar day | "Today" |
| Previous calendar day | "Yesterday" |
| Same year | "18 Sep" |
| Earlier years | "18 Sep 2025" |

Metadata lines inside a date group omit the date, because the group label carries it. Drink rows always show the relative date, because that list is not grouped.

### 9.2 Grouping by list

**Notebook**, sorted by most recent. Each café falls in the bucket of its last visit:

- Today
- Yesterday
- This week (2–6 days ago)
- Earlier in <current month>
- <Month> for each previous month, with the year appended outside the current year

**Feed Activity and profile Recently visited**, sorted by most recent:

- One group per calendar day: Today, Yesterday, then "18 Sep" and so on.
- Multiple visits on the same day share one group.

**Any other sort** (Top rated, Most visited): a single group labelled with the sort name. There are no date groups and no month dividers.

### 9.3 Month dividers

In Notebook, Feed Activity and profile lists, a month divider (§7) is inserted before the first group whose date falls in a different month from the group before it.

- The current month never gets a divider.
- The divider's summary counts visits and cafés for that month within the current filters.

### 9.4 Monthly summary

The monthly summary appears on the You profile only, and only for the current month when it has at least one visit.

- Counts are visits, distinct cafés and distinct cities dated in the month.
- The strip renders one column per day of the month.

### 9.5 Filters and segmentation

Search and filters apply first. Segmentation is then computed on the remaining items. Group labels and month summaries reflect the filtered set.

---

## 10. Text handling

- Café names, drink names and metadata lines are single-line with `text-overflow: ellipsis`. Ratings and prices are `flex: none` and never wrap.
- Feed note excerpts are clamped to 2 lines. The featured extra line is clamped to 2 lines in Notebook and to 1 line on profiles.
- Counts are pluralised: café/cafés, visit/visits, city/cities, person/people, friend/friends, time/times.
- Prices carry their own currency symbol with no space (`৳350`, `฿140`). A missing price renders as nothing in rows and as "—" in the coffee average.
- Titles end with a period in `--acc`: "Notebook.", "Feed.", "People.", "You.", "<Name>.".

---

## 11. Fonts on Google Fonts

| Family | Available | Weights to load | Notes |
| --- | --- | --- | --- |
| Caprasimo | Yes | 400 | Single weight; never synthesise bold |
| Figtree | Yes | 400, 500, 600, 700 | Variable 300–900 |
| Noto Sans Bengali | Yes | 400, 700 | Required for ৳ |
| Noto Sans Thai | Yes | 400, 700 | Required for ฿ |

All four families are available on Google Fonts. Substitutes if one cannot be used:

- **Caprasimo:** Baloo 2 at 700, then Chewy.
- **Figtree:** Manrope, then Nunito Sans. Sizes hold without adjustment.

Emoji avatars use the platform emoji font.

Single load:

```
https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;700&family=Noto+Sans+Thai:wght@400;700&display=swap
```
