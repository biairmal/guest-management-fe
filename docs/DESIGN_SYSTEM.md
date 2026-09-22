# Design System

Cross-cutting layout/theming/component foundation for `guest-management-fe`. Not tied to one backend feature story, so it lives here rather than under `guest-management-be/docs/DEVELOPMENT_PLAN.md`. Read this before implementing any shared layout or component; read the matching `DEVELOPMENT_PLAN.md` item's `#### UX Design` for a specific screen's content.

Visual reference (canvas): pages **"Theme pair — light/dark"**, **"Layout — public shell"**, **"Layout — app shell + sidebar"**, **"Patterns — breadcrumb + filter/sort"**, **"Components — button + modal"**. The previously-settled style direction lives on **"Style directions v2"** (direction D, "Full Dark Elevated").

## 1. Theme: light + dark token pairs

Direction D ("Full Dark Elevated"): elevation built from stepped surfaces, not shadows. Three neutral steps, each theme's steps get *brighter* as they get more "elevated" — same directionality in both themes, just mirrored into a different neutral range. IBM Plex Sans (UI text) + IBM Plex Mono (used sparingly, e.g. reference/ID strings).

| Role | Dark | Light |
|---|---|---|
| Canvas (page background, `Layout.Content`) | `#111116` | `#EEEFF5` |
| Chrome (Sider, Header, cards/`Table` container, `Modal` surface, footers) | `#1A1A22` | `#F8F8FC` |
| Pop (table header row, search input fill, any "raised within raised" strip) | `#212129` | `#FFFFFF` |
| Border / hairline | `#2A2A34` | `#E2E2EC` |
| Text (primary) | `#F1F1F5` | `#17171F` |
| Text (muted/secondary) | `#93939F` | `#6B6B78` |
| Primary (indigo) | `#4F46E5` fill; `#A5B4FC` for text/icon-on-dark | `#4F46E5` fill; `#4338CA` for text-on-tint |
| Primary tint (active nav/row bg) | `rgba(129,140,248,0.16)` | `rgba(79,70,229,0.08)` (≈ `#EEF2FF`) |
| Accent (teal) | `#2DD4BF` | `#0F766E` |
| Accent tint | `rgba(45,212,191,0.14)` | `rgba(15,118,110,0.10)` |
| Danger | `#FF7875` (outline style on dark) | `#FF4D4F` (solid fill on light) |
| Warning | `#E8B339` | `#D48806` (reuses the app's existing gold tag color) |
| Danger text (inline field/row errors, error status text) | `#FF7875` | `#CF1322` (`#FF4D4F` is under 4.5:1 as text on chrome/pop; keep it for fills, borders, icons) |
| Warning text (inline non-blocking warnings) | `#E8B339` | `#AD6800` (`#D48806` is under 4.5:1 as text on light surfaces) |
| Elevation shadow (modals only) | `0 12px 28px rgba(0,0,0,0.45)` | `0 12px 28px rgba(16,24,40,0.14)` |

Rule of thumb when adding a new surface: which of the three steps does it sit at (canvas / chrome / pop)? Pick that step's hex for the active theme — don't invent a fourth gray.

Indigo primary needs no lightness change between themes (`#4F46E5` reads on both black and white). Teal and the semantic colors do change — a color tuned to sit on a dark ground reads washed-out or over-bright on white and vice versa; always check the pair table above rather than reusing a hex across themes by habit.

**Applied, not just theoretical:** every Auth + User-management `.dc.html` screen (`Main`/`ForcedPasswordChange`/`UserList`/`UserListCollapsed`/`CreateUser`/`UserDetail`/`ResetUserPassword`/`TransferMaster`/`DeleteUserConfirm`/`ChangeMyPassword`) has been retoned to this table — light updated in place (replacing the old flat `#f5f5f5`/all-white "Indigo × Plex" scheme), dark added as a `*Dark.dc.html` twin per screen. Canvas pages: `auth`/`users` (light, updated) and `auth-dark`/`users-dark` (new). Danger is solid-fill red in light and outline (border+text, no fill) in dark throughout, including on confirm buttons in modals (Delete user, Transfer ownership), not just the Danger-zone trigger button.

## 2. Sidebar: multi-level navigation

Extends the real `app/_components/AppShell.tsx` (`Layout.Sider collapsible collapsedWidth={80}` + antd `Menu`) — do not build a parallel nav component. Add depth via `Menu`'s nested `items`/`children`, e.g.:

```ts
{
  key: "events",
  icon: <CalendarOutlined />,
  label: "Events",
  children: [
    { key: "events-transactions", label: "Transactions" },
    {
      key: "events-configuration",
      label: "Configuration",
      children: [
        { key: "events-configuration-categories", label: "Categories" },
      ],
    },
  ],
}
```

States to support (all one `Menu` instance, no separate components):
- **Expanded** — full-width rail (220–240px), nested children indent under an expanded parent, active leaf gets the primary tint background + bold `primary`-colored text (see token table).
- **Collapsed to icons** — `Sider` at `collapsedWidth={80}`, labels hidden, hovering a parent with children opens antd `Menu`'s built-in floating submenu popup (not a custom overlay) showing the same nested structure.
- **Submenu open** — a parent (e.g. "Events") expanded inline, its children visible; a child can itself be a parent (e.g. "Configuration" → "Categories"), so nesting must support at least 3 levels, not just one.

## 3. Breadcrumb / back-navigation pattern

One reusable page-header component every inner/detail page uses (user detail, an event's transaction detail, a category/template detail, etc.) instead of each page inventing its own:

- A back button (icon-only, antd `Button` with a back-arrow icon) to the left of...
- A breadcrumb trail (antd `Breadcrumb`) — ancestor labels plain/muted, current page bold, `/` separators.
- Below that: the page title row (`Typography.Title` + right-aligned page-level actions).

Example trail: `Events / Transactions / TXN-10234` (last segment bold = current page). See `BreadcrumbPattern.dc.html` on the "Patterns" canvas page for the full layout.

## 4. Data-list filter + multi-sort toolbar

The least-standard piece — deliberately not antd `Table`'s built-in per-column filter dropdown or single-column sorter, since those only support one field at a time. Two independent popover-based builders anchored to "Filter" and "Sort" buttons in the list toolbar, each button showing a badge with the active condition/key count when closed.

**Filter builder** (`Popover` + custom rows, e.g. via `Form.List`):
- Each row: field `Select` + operator `Select` (options depend on field type — `is`/`is not` for enums, `>`/`</`between` for numbers/dates) + value input + a remove (`×`) button.
- Rows are implicitly ANDed ("Where" on the first row, "And" on subsequent rows).
- "+ Add condition" appends a row; "Clear all" / "Apply" footer actions.

**Multi-sort builder** (`Popover` + custom rows):
- Each row: a drag handle (reorder = priority), a numbered priority pip, a field `Select`, an asc/desc direction toggle, and a remove button.
- Row order in the panel *is* sort priority — reordering rows changes precedence directly, no separate priority field to edit.
- "+ Add sort" appends a row; "Clear all" / "Apply" footer actions.

See `FilterPanelOpen.dc.html` / `SortPanelOpen.dc.html` on the "Patterns" canvas page, both applied to a generic Events list table for a concrete reference.

## 5. Core components

- **Button** — `type="primary"` / `type="default"` (secondary) / `danger` / `type="text"` or `"link"` (ghost), plus the standard `disabled` state (40% opacity of whichever variant). Fill/border/text values per theme: see the legend table on `ComponentsSheet.dc.html`.
- **Modal** — header (title + close `×`) / body / footer (secondary + primary or danger action), elevated with a shadow (not just a border) since it floats above the page in both themes.
- **Sidebar/Navbar states** — see §2 above; both expanded and collapsed states share one `Menu` instance and one `Sider`.

Every component's spec in `ComponentsSheet.dc.html` calls out light *and* dark token values side by side — treat that legend table format as the pattern for documenting any future component too.

## 6. Public/unauthenticated layout

Layout shell only — navbar (wordmark + nav links + login/sign-up) + content area + footer. No marketing copy or sections beyond a placeholder hero are designed; the product has not decided what this area contains yet (`PublicLayoutShell.dc.html`). Build the shell now; content later is a separate pass, not a gap in this one.

## 7. Filter/Sort pattern applied — User List

§4's generic Filter/Sort builder (Popover + custom rows against the abstract Events-list demo) is now wired concretely onto the real User List screen (`UserList.dc.html` / `UserListDark.dc.html`, `users`/`users-dark` canvas pages), scoped to exactly 5 fields:

- **Name** — text `contains`/`is` operators.
- **Email** — text `contains`/`is` operators.
- **Role** — enum `is`/`is not` (Super Admin / Tenant Admin / Tenant Staff).
- **Created date** — date `>`/`<`/`between`.
- **Updated date** — date `>`/`<`/`between`.

Same component shape as §4: a "Filter" toolbar button (badge = active condition count) opens the multi-condition builder anchored beside the search input; a "Sort" button (badge = active key count) opens the multi-key reorderable builder. The List's `Table` header cells also each carry a sort-direction affordance reflecting whichever field is the active top sort key — this is presentational only, the badge-count Sort button remains the source of truth for multi-key ordering, not `Table`'s own per-column sorter (still not used, per §4's rationale).

**Table redesign (replaces the old Email/Role/Tenant master/Password/Created/chevron columns):**

| Column | Notes |
|---|---|
| Name | Row's primary identifier. A small dot badge (gold/warning-color) sits to the left of the name for the tenant master indicator (title="Tenant master"), and a smaller dot after the name for must-change-password (title="Must change password") — both folded into this cell, neither is its own column. |
| Email | Plain text, no longer paired with the name in one cell. |
| Role | `Tag`, unchanged in kind from before. |
| Created date | Renamed from "Created". |
| Updated date | New — wasn't a column before. |

Tenant master and "must change password" are deliberately non-column indicators per explicit product direction — they no longer get dedicated `Table` columns; the old "Password" status column is dropped entirely (folded into the Name-cell dot instead of removed with no replacement).

**Known gap, flagged not silently assumed:** `name` does not exist on the backend `User` entity/API today — `FEATURES.md#users` and `DEVELOPMENT_PLAN.md` B2/B11 model only `email`/`role_id`/`is_tenant_master`/`must_change_password`. The Name column, its sort/filter field, and the Name-cell badges are all designed against this not-yet-existing field on explicit instruction; `solutions-architect`/`backend-developer` need to add it (migration + DTO + API surface) before this list is buildable end-to-end. See `DEVELOPMENT_PLAN.md` B11 Frontend Tasks for the matching flag.
