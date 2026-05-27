## Smart Selling Admin Dashboard

Build a new admin section dedicated to Bundles, Cross-Sells, and Upsells, with its own dark-themed sidebar layout, mock data, and full CRUD. This is a self-contained module — it won't touch the existing storefront, checkout, or current admin analytics.

### Routes (new)

```
/selling                    → Dashboard overview
/selling/products           → Product catalog (read-only picker source)
/selling/bundles            → Bundle list + create/edit slide-over
/selling/cross-sells        → Cross-sell rules
/selling/upsells            → Upsell rules
/selling/settings           → Global strategy settings
```

All routes live under a shared `_selling` layout with a collapsible sidebar (shadcn `Sidebar`). Admin-only — guarded by `useAuth().isAdmin`, redirect non-admins to `/`.

### Data model (localStorage-backed mock store)

To keep scope tight and avoid schema churn, mock data lives in a typed Zustand-style store persisted to `localStorage` (`src/lib/selling-store.ts`). Real `products` from Supabase feed the product picker (read-only).

Entities: `Bundle`, `CrossSellRule`, `UpsellRule`, `SellingSettings`. Each has full CRUD + duplicate + reorder.

### Design system

- Accent: **Emerald** (`#10B981`) — added as `--selling-accent` token in `src/styles.css`, scoped to `.selling-shell` so it doesn't affect the existing storefront theme.
- Dark surface tokens (`--selling-bg`, `--selling-surface`, `--selling-border`) scoped the same way.
- shadcn components: `Sidebar`, `Card`, `Table`, `Sheet` (slide-over forms), `Dialog`, `Badge`, `Switch`, `Tabs`, `Input`, `Select`, `Button`, `DropdownMenu`, `Tooltip`, `Sonner` toasts.
- `framer-motion` for page transitions and list reorder. Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`.
- `recharts` (already installed) for the dashboard performance chart.

### Module breakdown

**Sidebar (`_selling` layout)**
Collapsible icon sidebar with: Dashboard, Products, Bundles, Cross-Sells, Upsells, Settings. Active route highlight, mobile drawer.

**Dashboard (`/selling`)**
Six stat cards (active bundles, cross-sell rules, upsell rules, bundle revenue mock, top bundle, top cross-sell pair, top upsell). Bar chart of 14-day performance (mock). Quick Actions row linking to create flows.

**Products (`/selling/products`)**
Searchable table of real products from Supabase — used as the picker source elsewhere. Read-only here.

**Bundles (`/selling/bundles`)**
- Table: thumbnail, name, # products, original price, discounted price, savings, status, visibility toggle, actions menu (edit / duplicate / delete).
- Drag-to-reorder rows.
- Slide-over form: name, product picker (multi-select with search), auto-computed original total, discount mode (fixed price OR %), cover image URL, description, active toggle, badge label, start/end dates, display locations (multi-checkbox: product / cart / checkout / homepage).

**Cross-Sells (`/selling/cross-sells`)**
- Table: trigger product, # suggestions, display location, status, last modified.
- Filters: by trigger product, by status.
- Slide-over: trigger product picker (single), suggested products picker (multi, drag-reorder for priority), section title, display style (Grid/Carousel/List), max suggestions (2–4), display location, per-suggestion label.

**Upsells (`/selling/upsells`)**
- Table: trigger, type tag, headline, suggested product, price diff, location, status toggle, actions.
- Slide-over: trigger product, upsell type (Upgrade Version / Quantity Deal / Limited Edition / Bundle Upgrade), headline, persuasion note, suggested product or bundle, price comparison, badge, optional countdown end date, display position.

**Settings (`/selling/settings`)**
Form with: default section titles (3 inputs), default suggestion count, master toggles per strategy, currency code + format preview, default display positions, zero-sales alert threshold (days).

### UX polish
- Toast (sonner) on every save / delete / toggle.
- Empty states with primary CTA when no rules exist.
- Confirm dialog for delete.
- All forms validated with simple inline errors (no zod dependency added).

### Files to create

```
src/routes/_selling.tsx                       (layout + sidebar + guard)
src/routes/_selling.index.tsx                 (dashboard)
src/routes/_selling.products.tsx
src/routes/_selling.bundles.tsx
src/routes/_selling.cross-sells.tsx
src/routes/_selling.upsells.tsx
src/routes/_selling.settings.tsx
src/components/selling/SellingSidebar.tsx
src/components/selling/StatCard.tsx
src/components/selling/ProductPicker.tsx
src/components/selling/EmptyState.tsx
src/components/selling/BundleForm.tsx
src/components/selling/CrossSellForm.tsx
src/components/selling/UpsellForm.tsx
src/lib/selling-store.ts                      (typed localStorage store + hooks)
src/lib/selling-types.ts
```

### Files to edit
- `src/styles.css` — add scoped `.selling-shell` dark tokens + emerald accent.
- `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### Out of scope (won't change)
- Existing storefront, cart, checkout, product detail pages.
- Existing `/admin` analytics dashboard.
- Supabase schema — no migrations; selling data lives in `localStorage`. (If you later want it persisted server-side, that's a follow-up migration.)
- i18n strings for the new admin section (English only, matches existing admin).

### Confirm before I build
1. **Accent: Emerald** ✅ (you can switch to indigo later — one token).
2. **Storage: localStorage mock** (fast, no schema work). Say the word if you'd rather persist to Supabase from the start.
3. **Mount path: `/selling`** — separate from your existing `/admin` so the two dashboards don't fight. Want me to nest under `/admin/selling` instead?
