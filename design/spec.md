# Bean Bud — visual specification

Direction: "Bud" (warm, rounded) with inverted feed cards. Mobile-first, 390 × 844 design frame. Two themes, light default.

---

## 1. Colour

Tokens are CSS custom properties set on the app root; `[data-theme="dark"]` overrides them. Alpha values are given as authored plus the composited hex over that theme's own background, for platforms that need a flat value.

### 1.1 Light theme

| Token | Authored | Flat hex | Used for |
| --- | --- | --- | --- |
| `--bg` | `#f5ead8` | `#f5ead8` | App background |
| `--surf` | `#ebddc5` | `#ebddc5` | Cards, tab bar, detail header, sheet panels |
| `--surf2` | `#f9f4ed` | `#f9f4ed` | Nested surfaces: stat tiles, suggestion rows, drink row, usual-order pill |
| `--ink` | `#201e1d` | `#201e1d` | Primary text |
| `--mut` | `rgba(32,30,29,0.60)` | `#757068` | Secondary text, labels, meta lines |
| `--fai` | `rgba(32,30,29,0.42)` | `#9c948a` | Tertiary text: carets, footnotes, locked badge labels |
| `--line` | `rgba(32,30,29,0.14)` | `#d7cdbe` | Hairlines, chip borders, empty star fill |
| `--acc` | `#c67139` | `#c67139` | Terracotta. Primary actions, FAB, score discs ≥ 4.5, filled stars, active nav |
| `--accDeep` | `#8c491a` | `#8c491a` | Accent text at body size (trend labels, price-rise flags) |
| `--accInk` | `#f9f4ed` | `#f9f4ed` | Text/icons on `--acc` |
| `--sage` | `#7a8a5e` | `#7a8a5e` | Second voice. Criteria stars, score discs 4.0–4.4, comparison stars |
| `--sageDeep` | `#56633f` | `#56633f` | Sage text at body size |
| `--tagBg` | `#f0fae1` | `#f0fae1` | Neutral tag fill |
| `--tagInk` | `#3d472b` | `#3d472b` | Text on `--tagBg` |
| `--warmBg` | `#fff2eb` | `#fff2eb` | Price-band tag fill |
| `--warmInk` | `#643312` | `#643312` | Text on `--warmBg` |
| `--inv` | `#16140f` | `#16140f` | Inverted card ground (other people's feed posts) |
| `--invInk` | `#f5ead8` | `#f5ead8` | Text on `--inv` |
| `--invMut` | `rgba(245,234,216,0.58)` | `#979083` | Secondary text on `--inv` |
| `--invLine` | `rgba(245,234,216,0.16)` | `#3a362f` | Hairlines and empty stars on `--inv` |

### 1.2 Dark theme

| Token | Authored | Flat hex | Notes |
| --- | --- | --- | --- |
| `--bg` | `#16140f` | `#16140f` | |
| `--surf` | `#221f1a` | `#221f1a` | |
| `--surf2` | `#2b2721` | `#2b2721` | |
| `--ink` | `#f9f4ed` | `#f9f4ed` | |
| `--mut` | `rgba(249,244,237,0.62)` | `#a39f99` | |
| `--fai` | `rgba(249,244,237,0.42)` | `#75726c` | |
| `--line` | `rgba(249,244,237,0.14)` | `#36332e` | |
| `--acc` | `#f6a06b` | `#f6a06b` | Accent lightens one ramp step on dark ground |
| `--accDeep` | `#ffc6a5` | `#ffc6a5` | On dark, "deep" means lighter — it is the body-size accent |
| `--accInk` | `#16140f` | `#16140f` | |
| `--sage` | `#aebf92` | `#aebf92` | |
| `--sageDeep` | `#ccdbb2` | `#ccdbb2` | |
| `--tagBg` | `#3d472b` | `#3d472b` | |
| `--tagInk` | `#e1eecc` | `#e1eecc` | |
| `--warmBg` | `#643312` | `#643312` | |
| `--warmInk` | `#ffe1d0` | `#ffe1d0` | |
| `--inv` | `#f9f4ed` | `#f9f4ed` | Inversion flips: others' feed cards go cream on the dark ground |
| `--invInk` | `#201e1d` | `#201e1d` | |
| `--invMut` | `rgba(32,30,29,0.58)` | `#7b7874` | |
| `--invLine` | `rgba(32,30,29,0.16)` | `#d6d2cc` | |

### 1.3 Score-disc colour rule

Overall score ≥ 4.5 → fill `--acc`, text `--accInk`.
4.0–4.49 → fill `--sage`, text `--accInk`.
Below 4.0 → fill `--surf2`, text `--ink`.

### 1.4 Trend colour rule

Up or down by more than 0.05 → `--accDeep`. Otherwise "steady" in `--mut`. Trend never uses green or red.

---

## 2. Type

### 2.1 Families

- Display: `Caprasimo`, weight 400 only. Fallback stack: `"Caprasimo", Georgia, serif`.
- Text/UI: `Figtree`, weights 400, 600, 700. Fallback stack: `"Figtree", system-ui, sans-serif`.
- Script coverage: `"Noto Sans Bengali"` and `"Noto Sans Thai"` appended to the Figtree stack so `৳` and `฿` resolve. Full app stack: `Figtree, "Noto Sans Bengali", "Noto Sans Thai", system-ui, sans-serif`.
- Numerals: `font-variant-numeric: tabular-nums` on every score, price, count and date.

### 2.2 Roles

Line-height is 1.1 or tighter for Caprasimo, 1.45–1.55 for Figtree body.

| Role | Family / weight | Size | Line-height | Colour |
| --- | --- | --- | --- | --- |
| App title ("Bean Bud") | Caprasimo 400 | 30px | 1.0 | `--ink` |
| Screen title ("Feed.", "Milestones.") | Caprasimo 400 | 28px | 0.95 | `--ink`, trailing period in `--acc` |
| Milestone hero number | Caprasimo 400 | 34px | 1.0 | `--acc` |
| Cafe name, detail header | Caprasimo 400 | 26px | 1.06 | `--ink` |
| Avatar initial, 64px avatar | Caprasimo 400 | 25px | 1.0 | per-person tone ink |
| Profile name, empty-state headline | Caprasimo 400 | 23px | 1.1–1.15 | `--ink` |
| Score disc, 62px | Caprasimo 400 | 21px | 1.0 | `--accInk` |
| Badge glyph | Caprasimo 400 | 21px | 1.0 | `--accInk` / `--fai` |
| Cafe name, notebook card | Caprasimo 400 | 19.5px | 1.12 | `--ink` |
| Score disc, 54px | Caprasimo 400 | 19px | 1.0 | per disc rule |
| Person name, directory row | Caprasimo 400 | 17px | 1.1 | `--ink` |
| Milestone stat number, stat tile | Caprasimo 400 | 19px | 1.0 | `--ink` |
| Sheet title ("New visit") | Caprasimo 400 | 18px | 1.1 | `--ink` |
| Section heading ("Visit log") | Caprasimo 400 | 17px | 1.1 | `--ink` |
| Feed cafe name | Caprasimo 400 | 17.5px | 1.1 | card ink |
| Odd-fact figure | Caprasimo 400 | 18px | 1.0 | `--acc` |
| Cafe-name input (log sheet) | Caprasimo 400 | 20px | 1.2 | `--ink` |
| Primary button label | Figtree 700 | 14.5–15px | 1.2 | `--accInk` |
| Secondary / pill button label | Figtree 600 | 12–13px | 1.2 | `--ink` or `--acc` |
| Body copy, notes | Figtree 400 | 12.5–13.5px | 1.5–1.55 | `--mut` (`--ink` inside feed cards) |
| Row title (visit date, overlap cafe, book row) | Figtree 700 | 13–14px | 1.3 | `--ink` |
| Criteria label, form field label text | Figtree 400 | 13–13.5px | 1.4 | `--mut` |
| Meta line (location · drink · price) | Figtree 400 | 11.5–12.5px | 1.4 | `--mut` |
| Tag / chip label | Figtree 400 (chips 600) | 11.5–12px | 1.2 | per tag pair |
| Tab bar label | Figtree 600 | 12px | 1.2 | `--acc` active, `--mut` inactive |
| Field label ("Cafe", "How was it") | Figtree 400 | 11px | 1.3 | `--mut` |
| Overline / uppercase label | Figtree 400, `letter-spacing:.08em`, uppercase | 11px | 1.3 | `--mut` |
| Footnote, locked badge label | Figtree 400 | 10.5–11.5px | 1.3 | `--fai` |
| Stat tile caption | Figtree 400 | 10.5px | 1.3 | `--mut` |

Minimum text size anywhere: 10.5px, and only for captions under a number that carries the meaning.

---

## 3. Spacing

Base unit 4px; the scale in use is **4, 6, 7, 9, 11, 13, 14, 16, 18, 20, 22, 26**.

| Purpose | Value |
| --- | --- |
| Gap between tags/chips in a row | 6px |
| Gap between rows in a stacked list (criteria, coffees) | 7–9px |
| Gap between cards in a scroll list | 11–12px |
| Gap between form panels in the log sheet | 13px |
| Screen horizontal padding, headers and sections | 20px |
| Scroll-list horizontal padding (cards carry their own inset) | 14px |
| Log-sheet horizontal padding | 16px |
| Screen top padding | 18–22px |
| Space below a section heading before its content | 10–12px |
| Bottom padding on every scroll region (clears the tab bar) | 96px |
| Label column width, criteria rows | 74–80px |

---

## 4. Radii

| Element | Radius |
| --- | --- |
| Phone shell | 38px |
| Log sheet top corners | 32px |
| Profile header bottom corners | 30px |
| Cafe detail header bottom corners | 28px |
| Milestone jar panel | 28px |
| Notebook card, tab bar top corners | 26px |
| Log-sheet panel, people row | 24px |
| Feed card, sparkline panel | 22px |
| Visit row, coffee-average row, profile book row, odd-fact row | 20px |
| Drink row, stat tile, small inset row | 18px |
| Autocomplete suggestion row | 16px |
| All buttons, chips, tags, inputs, avatars, discs, beans | 999px (full pill / circle) |

Nothing in this direction uses a radius below 16px except the pill rule. No square corners.

---

## 5. Borders and shadows

**Borders.** Only two kinds exist:

- Hairline: `1px solid var(--line)` — used on chip outlines when unselected, the sheet header divider, and the "optional bits" expander button.
- Dashed: `2px dashed var(--line)` — locked milestone badges and the empty-state circle only.

Cards never carry a border; they are distinguished by `--surf` against `--bg`. Inside inverted feed cards the divider is `1px solid var(--invLine)`.

**Shadows.** Two, both warm-tinted:

- Phone shell / top-level elevation: `0 18px 44px rgba(46,43,37,0.26)`
- Floating action button: `0 6px 16px rgba(46,43,37,0.32)`

Cards, tags and inputs have no shadow. If the host design system's tokens are preferred, the equivalents are `--shadow-lg` and `--shadow-md`.

---

## 6. Star rating

Stars are drawn as a single masked element, not as five glyphs, so fractional averages render exactly.

**Geometry.** 24 × 24 viewBox, path:

```
M12 2.3l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.36l-5.9 3.1 1.13-6.57L2.45 9.24l6.6-.96z
```

**Construction.** One inline-block element:

- `width: size × count`, `height: size` (count is 5 for a rating row, 1 for a single tappable star)
- `mask: url(<star svg>) 0 0 / size size repeat-x` (plus `-webkit-mask`)
- `background: linear-gradient(90deg, <fill> <p>, <empty> <p>)` where `p = value / 5 × 100%`

The gradient is a hard stop, so the partial star is clipped vertically — correct for a 4.6 reading as four and a bit.

**Sizes and colours by context.**

| Context | Star size | Fill | Empty |
| --- | --- | --- | --- |
| Notebook card summary | 15px | `--acc` | `--line` |
| Cafe detail criteria rows | 14px | `--sage` | `--line` |
| Feed card headline rating | 12.5px | `--acc` | `--line` / `--invLine` on inverted cards |
| Visit log row, profile book row, overlap rows | 12px | `--acc` (yours) / `--sage` (theirs) | `--line` |
| Coffee average row | 12px | `--sage` | `--line` |
| Feed comparison line ("You rate it") | 11px | `--sage` | `--invLine` |
| Log form, criteria rating | 25px per star, 5 separate buttons, 2px padding each | `--acc` | `--line` |
| Log form, drink rating | 16px per star, 5 separate buttons, 1px padding each | `--sage` | `--line` |

**Input behaviour.** Each of the five stars is its own button; tapping star *n* sets the value to *n*, tapping the current value clears it to 0. Interactive stars are whole-star only (no halves on input); averages are the only place fractions appear. Minimum 44 × 44px hit area on the 25px input stars — pad the button, not the glyph.

---

## 7. Card padding

| Card | Padding |
| --- | --- |
| Notebook cafe card | 16px 18px |
| Feed card (own and inverted) | 15px 17px |
| People directory row | 15px 17px |
| Cafe detail header | 18px 20px 14px |
| Profile header | 18px 20px 20px |
| Log-sheet panel | 14px 16px |
| Log-sheet header bar | 14px 18px 10px |
| Visit log row (collapsed button) | 12px 15px, expanded body 0 15px 14px |
| Coffee average row, profile book row, overlap card | 12–13px 15px |
| Drink row, suggestion row | 9–10px 12–13px |
| Odd-fact row | 12px 15px |
| Stat tile | 10px 6px |
| Milestone jar panel | 18px |
| Tab bar | 11px 22px 16px |
| Tag / small pill | 4px 11px |
| Chip (interactive) | 7px 13px |
| Primary button | 14–15px vertical, full width; inline variant 14px 26px |

---

## 8. Component measurements

| Element | Size |
| --- | --- |
| Score disc, notebook card | 54 × 54px |
| Score disc, cafe detail | 62 × 62px |
| Avatar, feed card | 32 × 32px |
| Avatar, people directory | 46 × 46px |
| Avatar, profile header | 64 × 64px |
| Avatar, app header | 38 × 38px |
| FAB | 54 × 54px, raised 30px above the tab bar |
| Tab bar height | ~80px including safe padding |
| Milestone bean | 1:1 grid cell, 10 per row, 6px gap, 1px border |
| Progress bar | 12px tall, fully rounded, track `--surf` |
| Sparkline | 300 × 54 viewBox, 2.5px stroke `--acc`, round joins, 4.5px end dot |

---

## 9. Fonts on Google Fonts

| Family | On Google Fonts | Notes |
| --- | --- | --- |
| Caprasimo | Yes | Single weight, 400 only. There is no bold — never synthesise one; go up in size instead. |
| Figtree | Yes | Variable, 300–900. This spec uses 400, 600, 700. |
| Noto Sans Bengali | Yes | Needed for `৳`. Load 400 and 700. |
| Noto Sans Thai | Yes | Needed for `฿`. Load 400 and 700. |

All four are available; none need substituting. If Caprasimo cannot be used for licensing or performance reasons, the closest substitutes in order of fidelity are **Baloo 2** (700), then **Chewy**, then **Alfa Slab One** (heavier and more condensed — expect to drop display sizes by ~2px). If Figtree is unavailable, substitute **Manrope**, then **Nunito Sans**; both match its x-height closely enough that the sizes above hold without adjustment.

Suggested single load:

```
https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;700&family=Noto+Sans+Thai:wght@400;700&display=swap
```
