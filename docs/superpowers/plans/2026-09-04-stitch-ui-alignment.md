# Stitch UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing pricing calendar visually and interactively match the four approved Stitch reference screens without changing current pricing APIs or rules.

**Architecture:** Keep `PricingCalendar` as the stateful client container and preserve all REST calls. Move no business logic into UI. Improve the presentational components (`CalendarDayCell`, `StatusLegend`, `PricingEditor`) and their stylesheet states so desktop follows the two Stitch desktop screens, while the existing accessible mobile drawer follows the two mobile screens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, CSS in `app/globals.css`, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-stitch-ui-alignment-design.md`

## Global Constraints

- The four named screens in Stitch project `Calendar Pricing Day Cell` are the visual source of truth.
- Keep the fixed base price at exactly ฿1,500; do not add per-day base-price persistence or a settings UI.
- Preserve current REST contracts, range selection, conflict confirmation, delete confirmation, and Hot Deal lead-time behavior.
- Preserve `daily_price` special-price state and Hot Deal overlay; do not reintroduce a single combined status enum.
- Browser components call only `/api/...`; no repository, service, or Supabase client imports in UI.
- All cell status cues must remain available in Thai accessible names and not depend on color alone.
- Preserve the user’s pre-existing dirty files: `CONTEXT.md`, `docs/superpowers/plans/2026-09-04-hot-deal.md`, `supabase/.gitignore`, `supabase/config.toml`, and `supabase/migrations/20260904095533_grant_pricing_api_access.sql`.

---

### Task 1: Stitch day-cell and legend visual states

**Files:**
- Modify: `components/pricing/calendar-day-cell.tsx`
- Modify: `components/pricing/status-legend.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/pricing-calendar.test.tsx`

**Interfaces:**
- Consumes: existing `CalendarDayPrice { date, status_type, net_price, is_hot_deal }` and `BASE_DAILY_PRICE = 1500`.
- Produces: a day button whose price treatment and cues distinguish normal, holiday, promotion, Hot Deal, and overlay states.

- [ ] **Step 1: Write failing component assertions for normal, promotion + Hot Deal, and holiday + Hot Deal day-cell content**

```tsx
expect(within(day).getByText("฿1,500")).toBeTruthy();
expect(within(day).getByRole("img", { name: "โปรไฟลุก" })).toBeTruthy();
expect(within(day).getByRole("img", { name: "โปรโมชั่น" })).toBeTruthy();
expect(within(day).getByText("฿1,500")).toBeTruthy();
```

- [ ] **Step 2: Run the focused test and verify it fails because normal cells omit the reference price and Hot Deal is named in English**

Run: `npm test -- pricing-calendar`

Expected: FAIL on the new price/cue assertions.

- [ ] **Step 3: Update `CalendarDayCell` so normal cells show the compact base price, special/Hot Deal cells show the original base price as a secondary value, and all icon names are Thai**

```tsx
const displayPrice = calendarPrice?.net_price ?? BASE_DAILY_PRICE;
const isOverride = Boolean(calendarPrice?.status_type || calendarPrice?.is_hot_deal);

<span className="pricing-day__price">{formatCompactBaht(displayPrice)}</span>
{isOverride ? <span className="pricing-day__base-price">฿1,500</span> : null}
```

Use `role="img" aria-label="โปรไฟลุก"` for fire and `role="img" aria-label="โปรโมชั่น"` for the tag. Keep holiday semantic text in the button `aria-label`.

- [ ] **Step 4: Update `StatusLegend` with four visual combinations**

```tsx
const statuses = [
  { type: "normal", label: "วันปกติ", mark: "" },
  { type: "holiday", label: "วันหยุด", mark: "☀" },
  { type: "promotion", label: "ราคาพิเศษ", mark: "✦" },
  { type: "hot-deal", label: "โปรไฟลุก", mark: "🔥" },
] as const;
```

- [ ] **Step 5: Replace only the day-cell/legend CSS with Stitch-aligned compact price hierarchy and visual tokens**

Implement these class states: `.pricing-day--holiday` yellow surface, `.pricing-day--promotion` rose/pink surface and tag, `.pricing-day--hot-deal` fire cue with active border, `.pricing-day--holiday.pricing-day--hot-deal` yellow + fire, `.pricing-day--selected` indigo focus. Add `.pricing-day__base-price` as a muted line-through reference price.

- [ ] **Step 6: Run the focused test and verify it passes**

Run: `npm test -- pricing-calendar`

Expected: PASS with existing interaction tests and the new state assertions.

- [ ] **Step 7: Commit the isolated day-cell work**

```bash
git add components/pricing/calendar-day-cell.tsx components/pricing/status-legend.tsx app/globals.css tests/components/pricing-calendar.test.tsx
git commit -m "feat: align pricing day cells with Stitch"
```

### Task 2: Desktop VillaRate calendar shell and inspector hierarchy

**Files:**
- Modify: `components/pricing/pricing-calendar.tsx`
- Modify: `components/pricing/pricing-editor.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/pricing-calendar.test.tsx`

**Interfaces:**
- Consumes: existing `PricingCalendar` REST state and `PricingEditorProps` callbacks.
- Produces: a desktop header/sidebar/calendar/Cell Inspector arrangement visually matching the two desktop Stitch screens.

- [ ] **Step 1: Write failing desktop assertions using `matchMedia().matches = false`**

```tsx
expect(screen.getByRole("button", { name: "Bulk Pricing" })).toBeTruthy();
expect(screen.getByText("CELL INSPECTOR")).toBeTruthy();
expect(screen.getByRole("button", { name: "-฿200" })).toBeTruthy();
expect(screen.getByRole("button", { name: "+฿200" })).toBeTruthy();
```

- [ ] **Step 2: Run the focused test and verify the new desktop controls are absent**

Run: `npm test -- pricing-calendar`

Expected: FAIL on `Bulk Pricing` and price-stepper controls.

- [ ] **Step 3: Rework the desktop frame in `PricingCalendar` without changing fetch/mutation logic**

Add a top property strip (`ACTIVE VILLA`, property name), label the active calendar context, and add a `Bulk Pricing` button that focuses the existing inspector and starts a fresh range selection. Keep the existing sidebar navigation display-only. Do not add user/role APIs.

```tsx
<button className="bulk-pricing-trigger" onClick={handleOpenBulkPricing} type="button">
  <span aria-hidden="true">tune</span> Bulk Pricing
</button>
```

`handleOpenBulkPricing` must set `selectedRange` to `null`, clear messages/conflicts, and open the editor on mobile through the existing `openMobileEditor` path.

- [ ] **Step 4: Add Stitch inspector controls to `PricingEditor` using existing callbacks**

```tsx
function changePrice(delta: number): void {
  const next = Math.max(1, Number(netPrice || "0") + delta);
  onPriceChange(String(next));
}

<div className="price-stepper">
  <button onClick={() => changePrice(-200)} type="button">-฿200</button>
  <button onClick={() => changePrice(200)} type="button">+฿200</button>
</div>
```

Render mode tabs as `ราคาพิเศษ` and `🔥 โปรไฟลุก`, selected-date/status-pill context, and rename the existing destructive action as a reset-to-base-price action while retaining the exact `onDelete` behavior.

- [ ] **Step 5: Update desktop CSS at the existing 1024px breakpoint**

Use the Stitch design-system colors: indigo primary `#4F46E5`, amber secondary `#F59E0B`, emerald tertiary `#059669`, slate neutral `#64748B`. Style the sidebar, top property strip, calendar card, cue legend, inspector tab row, price-stepper, and action hierarchy. Do not change mobile drawer focus styles in this task.

- [ ] **Step 6: Run desktop-focused tests and verify they pass**

Run: `npm test -- pricing-calendar`

Expected: PASS, including the new desktop controls and existing fetch/overwrite behavior.

- [ ] **Step 7: Commit the desktop alignment work**

```bash
git add components/pricing/pricing-calendar.tsx components/pricing/pricing-editor.tsx app/globals.css tests/components/pricing-calendar.test.tsx
git commit -m "feat: align desktop pricing calendar with Stitch"
```

### Task 3: Stitch mobile calendar and bottom-sheet inspector

**Files:**
- Modify: `components/pricing/pricing-calendar.tsx`
- Modify: `components/pricing/pricing-editor.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/pricing-calendar.test.tsx`

**Interfaces:**
- Consumes: existing mobile media query, drawer focus trap, and `PricingEditor` drawer props.
- Produces: a mobile calendar and bottom sheet with the screen hierarchy of both mobile Stitch references while preserving accessible modal behavior.

- [ ] **Step 1: Write failing mobile tests for compact base-price rendering, bottom-sheet heading, and Hot Deal lead-time presets**

```tsx
expect(within(drawer).getByRole("heading", { name: /ปรับแต่งราคา/ })).toBeTruthy();
expect(within(drawer).getByRole("button", { name: "7 วัน (แนะนำ)" })).toBeTruthy();
await user.click(within(drawer).getByRole("button", { name: "7 วัน (แนะนำ)" }));
expect(screen.getByLabelText("เริ่มแสดงล่วงหน้า")).toHaveValue(7);
```

- [ ] **Step 2: Run the focused test and verify the preset controls are absent**

Run: `npm test -- pricing-calendar`

Expected: FAIL because no Hot Deal lead-time preset button exists.

- [ ] **Step 3: Add the mobile-specific inspector hierarchy while preserving the dialog contract**

Use `isDrawer` to render: handle, `ปรับแต่งราคา (<Thai date>)` heading, weekday/property context, mode tabs, and the same save/reset actions. Retain `role="dialog"`, `aria-modal`, close button, backdrop, Escape behavior, focus trap, and focus restoration.

- [ ] **Step 4: Add Hot Deal lead-time presets using existing `onShowBeforeDaysChange`**

```tsx
const leadTimePresets = [3, 7, 14, 30] as const;
{leadTimePresets.map((days) => (
  <button
    aria-pressed={Number(showBeforeDays) === days}
    key={days}
    onClick={() => onShowBeforeDaysChange(String(days))}
    type="button"
  >
    {days === 7 ? "7 วัน (แนะนำ)" : `${days} วัน`}
  </button>
))}
```

- [ ] **Step 5: Add mobile CSS only under the existing max-width breakpoint**

Make the mobile header compact, preserve a seven-column grid with `min-height: 44px`, show price as compact `฿1.5k`, add the bottom-sheet drag handle and safe scroll area, and keep action buttons reachable without horizontal overflow at 320px.

- [ ] **Step 6: Run mobile interaction tests and verify they pass**

Run: `npm test -- pricing-calendar`

Expected: PASS for drawer opening/closing, focus wrapping/restoration, lead-time preset selection, and conflict confirmation.

- [ ] **Step 7: Commit the mobile alignment work**

```bash
git add components/pricing/pricing-calendar.tsx components/pricing/pricing-editor.tsx app/globals.css tests/components/pricing-calendar.test.tsx
git commit -m "feat: align mobile pricing calendar with Stitch"
```

### Task 4: Visual regression checks and implementation documentation

**Files:**
- Modify: `CONTEXT.md` only if current implemented UI facts differ
- Test: `tests/components/pricing-calendar.test.tsx`

**Interfaces:**
- Consumes: all completed UI components and existing API tests.
- Produces: verified desktop/mobile behavior without API or schema regression.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all unit, integration, and component tests pass.

- [ ] **Step 2: Run static and production checks**

Run: `npx tsc --noEmit`, then `npm run lint`, then `npm run build`, then `git diff --check`.

Expected: every command exits 0.

- [ ] **Step 3: Manually inspect both responsive layouts**

At desktop width, verify dark sidebar, property header, calendar cue legend, Day Cell states, inspector tabs and ±฿200 buttons. At mobile width, verify compact cells, bottom-sheet opening, Hot Deal presets, Tab/Shift+Tab loop, Escape, backdrop and close-button focus restoration.

- [ ] **Step 4: Update only actual UI facts in `CONTEXT.md` if needed**

Add a concise note that the UI is aligned to all four Stitch screens while base price and current REST/data behavior remain unchanged. Do not stage other user changes in `CONTEXT.md`.

- [ ] **Step 5: Commit verification/docs work only when `CONTEXT.md` was changed by this task**

```bash
git add CONTEXT.md
git commit -m "docs: record Stitch UI alignment"
```
