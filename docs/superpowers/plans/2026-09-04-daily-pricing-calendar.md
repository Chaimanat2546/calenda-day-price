# Daily Pricing Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stitch-based daily-pricing calendar backed by Supabase REST APIs for multiple properties.

**Architecture:** The calendar is an interactive Client Component that calls Next.js Route Handlers under `app/api`. Handlers validate requests, call a pricing service, and the service delegates Supabase I/O to focused repositories. `daily_price` stores sparse per-day overrides, so missing dates resolve to the fixed ฿1,500 base price.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Supabase SSR, Zod, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-daily-pricing-design.md`

## Global Constraints

- Use the `Calendar Pricing Day Cell` Stitch project as the visual source of truth; do not redesign its layout or design system.
- No authentication, roles, permissions, or audit identity in this demo; do not deploy it publicly with real data.
- Base price is the exact constant `1500` Thai baht and must not have a settings UI.
- `daily_price` contains only overrides and must enforce `unique(property_id, date)`.
- Use REST paths under `/api`, never `/api/v1`.
- Keep Supabase credentials and database access server-only.

---

### Task 1: Database schema and seed property

**Files:**
- Create: `supabase/migrations/202609040001_create_pricing_tables.sql`
- Create: `supabase/seed.sql`
- Create: `server/types/pricing.ts`

**Interfaces:**
- Produces `Property`, `DailyPrice`, `StatusType`, and a single seeded property.
- `StatusType = 'holiday' | 'promotion' | 'hot_deal' | 'holiday_hot_deal'`.

- [ ] **Step 1: Write the migration with constraints**

```sql
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_price (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  date date not null,
  status_type text not null check (status_type in ('holiday','promotion','hot_deal','holiday_hot_deal')),
  net_price integer not null check (net_price > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, date)
);
```

- [ ] **Step 2: Seed one property idempotently**

```sql
insert into public.properties (name, description)
select 'บ้านพักตัวอย่าง', 'บ้านพักสำหรับทดสอบระบบราคา'
where not exists (select 1 from public.properties);
```

- [ ] **Step 3: Add shared domain types**

```ts
export const STATUS_TYPES = ['holiday', 'promotion', 'hot_deal', 'holiday_hot_deal'] as const
export type StatusType = (typeof STATUS_TYPES)[number]
export const BASE_DAILY_PRICE = 1500
```

- [ ] **Step 4: Apply migration and seed in the local Supabase workflow; verify the unique constraint by attempting a duplicate `(property_id, date)` insert**

- [ ] **Step 5: Commit**

```bash
git add supabase server/types/pricing.ts
git commit -m "feat: add daily pricing schema"
```

### Task 2: Validation, date utilities, and pricing service

**Files:**
- Create: `lib/validation/daily-price.ts`
- Create: `lib/dates.ts`
- Create: `server/repositories/daily-price-repository.ts`
- Create: `server/services/pricing-service.ts`
- Create: `tests/unit/daily-price.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes `StatusType`, `BASE_DAILY_PRICE`.
- Produces `checkDailyPriceConflicts(input)`, `applyDailyPriceRange(input)`, `deleteDailyPriceRange(input)`.

- [ ] **Step 1: Add `vitest` and script `"test": "vitest run"`; write failing tests for invalid price, reversed range, date expansion, and base-price fallback**

```ts
expect(rangeDates('2026-04-15', '2026-04-17')).toEqual([
  '2026-04-15', '2026-04-16', '2026-04-17',
])
expect(resolveDailyPrice(undefined)).toBe(1500)
```

- [ ] **Step 2: Run `npm test -- daily-price` and confirm failure**

- [ ] **Step 3: Implement Zod schemas and pure functions**

```ts
export const rangeInputSchema = z.object({
  startDate: z.string().date(), endDate: z.string().date(),
  statusType: z.enum(STATUS_TYPES), netPrice: z.number().int().positive(),
  description: z.string().trim().max(1000).nullable().optional(),
})
```

- [ ] **Step 4: Implement repository methods for monthly reads, conflict reads, upsert rows, and range deletion; inject the Supabase client as a parameter for tests**

- [ ] **Step 5: Implement the service so `confirmed: false` returns `CONFLICT` with dates and never writes; `confirmed: true` upserts one row per date**

- [ ] **Step 6: Run `npm test -- daily-price` and commit**

### Task 3: REST API route handlers

**Files:**
- Create: `app/api/properties/route.ts`
- Create: `app/api/properties/[propertyId]/daily-prices/route.ts`
- Create: `app/api/properties/[propertyId]/daily-prices/conflicts/route.ts`
- Create: `app/api/properties/[propertyId]/daily-prices/range/route.ts`
- Create: `server/http/api-error.ts`
- Create: `tests/integration/pricing-api.test.ts`

**Interfaces:**
- `GET /api/properties` returns `{ data: Property[] }`.
- Monthly GET returns `{ data: DailyPrice[] }`.
- Conflict POST returns `{ data: { dates: string[] } }`.
- Range PUT returns `{ data: DailyPrice[] }` or `409 { error: { code: 'CONFLICT', details: { dates } } }`.

- [ ] **Step 1: Write failing route tests for GET month, conflict POST, unconfirmed conflicting PUT, confirmed PUT, and DELETE**

```ts
expect(response.status).toBe(409)
expect(await response.json()).toMatchObject({ error: { code: 'CONFLICT' } })
```

- [ ] **Step 2: Run `npm test -- pricing-api` and confirm failure**

- [ ] **Step 3: Implement `apiError(code, status, details?)` and route handlers using `RouteContext<'/api/properties/[propertyId]/daily-prices'>` where applicable**

- [ ] **Step 4: Validate every query/body with Zod; use `Response.json`; return `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, or `INTERNAL_ERROR` without database internals**

- [ ] **Step 5: Run `npm test -- pricing-api` and commit**

### Task 4: Calendar UI from the Stitch reference

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `components/features/pricing/pricing-calendar.tsx`
- Create: `components/features/pricing/cell-inspector.tsx`
- Create: `components/features/pricing/bulk-pricing-dialog.tsx`
- Create: `components/features/pricing/pricing-types.ts`
- Create: `tests/ui/pricing-calendar.test.tsx`

**Interfaces:**
- `PricingCalendar({ property }: { property: Property })` loads a selected month from the monthly GET endpoint.
- `BulkPricingDialog` calls conflict POST first and range PUT only after confirmation.

- [ ] **Step 1: Write failing UI tests for default ฿1,500 rendering, selecting a day, opening Bulk Pricing, conflict confirmation, and disabling the save button while pending**

```tsx
await user.click(screen.getByRole('button', { name: /bulk pricing/i }))
expect(screen.getByRole('dialog')).toBeVisible()
```

- [ ] **Step 2: Run `npm test -- pricing-calendar` and confirm failure**

- [ ] **Step 3: Recreate the Stitch desktop structure: its sidebar, monthly header, cue legend, calendar grid, and right Cell Inspector; recreate its mobile bottom sheet at the matching responsive breakpoint**

- [ ] **Step 4: Add date selection, month navigation, and REST fetch states. Preserve the Stitch visual states for holiday, hot deal, holiday hot deal, promotion, selected, and keyboard focus**

- [ ] **Step 5: Implement Bulk Pricing form with `startDate`, `endDate`, `statusType`, `netPrice`, and `description`; show conflict dates and require explicit overwrite confirmation**

- [ ] **Step 6: Run `npm test -- pricing-calendar`, `npm run lint`, and `npm run build`; commit**

### Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`
- Modify: `CONTEXT.md`

- [ ] **Step 1: Document required Supabase variables, migration/seed commands, REST endpoints, and the warning that the demo has no authentication**

- [ ] **Step 2: Update `CONTEXT.md` from planned to implemented architecture only after each item exists**

- [ ] **Step 3: Manually verify: fetch seeded property, load a month, create a 3-day promotion, preview then overwrite a conflicting day, delete the range, and confirm all deleted days display ฿1,500**

- [ ] **Step 4: Run final verification**

```bash
npm test
npm run lint
npm run build
```

- [ ] **Step 5: Commit documentation**

```bash
git add README.md CONTEXT.md
git commit -m "docs: document daily pricing calendar"
```
