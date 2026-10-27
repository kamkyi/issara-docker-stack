        # ILM-facelift — Agent Instructions

This file is the authoritative guide for all AI coding agents (GitHub Copilot, Claude, Cursor, etc.) working in this repository. Read it completely before generating any code.

---

## Project Overview

**ILM-facelift** (ILM Cascade) is a React 19 + TypeScript single-page application for Issara Institute's CASCADE platform — a labor market intelligence and supply chain transparency tool. The app serves buyers, suppliers, recruiters, and labor stakeholders.

---

## Shared CASCADE/GD-Lite Integration Board

Keep this section aligned with `gd-lite/AGENTS.md` and `cascade-api/AGENTS.md`.

- `cascade-api` is the source of truth for worker-facing Polls, Message Boards, Worker Notifications, and Worker Verification.
- `ILM-facelift` owns company profile/admin UI, supplier QR/token flows, and management screens. Put Cascade API calls in `src/services/` or `src/utils/` and use `VITE_APP_CASCADE_API_URL`.
- `gd-lite` is the worker app. It must call Cascade with `EXPO_PUBLIC_CASCADE_API_BASE_URL`; service code must normalize the base URL whether the secret includes `/api/v1` or not.
- Worker endpoints use GD auth: `Authorization: Token <token>` plus `profile_id` and, where verification is required, `jobseeker_id`.
- ILM/admin endpoints use WorkOS bearer auth and must not rely on frontend-supplied supplier IDs for authorization.
- Targeted polls, message boards, and worker notifications are visible to GD workers only when `worker_verification_requests.status = "VERIFIED"` and `target_type` / `target_id` match the content target. Untargeted content is broadcast.
- Keep target concepts aligned: `supplier` targets use supplier IDs; `recruiter` targets use recruiter IDs. Do not mix company profile IDs, partner IDs, supplier IDs, and worker profile IDs without an explicit transform.
- If content is missing in GD-Lite, debug in this order: normalized Cascade base URL, GD token header, required query params, target filters, then published/active status in Cascade.
- Worker-Reported Violations / Supplier grievance form (`/worker-reported-issues`): see `docs/worker-reported-violations-redesign.md` for scope, data decisions, backend endpoints, and the cross-feature safety audit. The shared `CollapsibleDataTable` is opt-in per feature via `appearance` (default `"default"`); worker-reported draft input lives in `src/store/grievanceDraftStore.ts`. The grievance backend is the Django app in `ILM-prototype/ilm-server-2/issara/grievance/`, not `cascade-api`.
- Temporary UI hold: the supplier `Workers Management` table inside `/company-profile` -> `User Management` and the `Company QR` tab are hidden for now. The implementation and worker-verification wiring were intentionally left in place in `src/routes/company-profile.tsx`, `src/components/company-profile/UserManagementScreen.tsx`, and `src/components/company-profile/CompanyProfileTabs.tsx`; reopen the worker table by passing `canManageWorkerVerification` to `showWorkerManagement` again, and reopen Company QR by restoring the commented `company-qr` tab value/item, then validate the existing supplier worker-verification flow.

---

## Tech Stack (Non-negotiable)

| Layer                | Technology                     | Version |
| -------------------- | ------------------------------ | ------- |
| UI framework         | React                          | 19      |
| Language             | TypeScript                     | 5.7     |
| Build tool           | Vite                           | 6       |
| Router               | TanStack Router (file-based)   | 1.x     |
| Server state         | TanStack React Query           | 5.x     |
| Client state         | Zustand                        | 5       |
| Styling              | Tailwind CSS v4                | 4.x     |
| Component library    | Radix UI Themes                | 3.x     |
| Animation            | `motion` / `framer-motion`     | 12.x    |
| Charts               | ApexCharts, ECharts, Recharts  | —       |
| Maps                 | React Leaflet                  | 5.x     |
| Auth                 | WorkOS AuthKit                 | —       |
| Linting & formatting | Biome                          | 2.x     |
| Testing              | Vitest + React Testing Library | 3.x     |
| IndexedDB            | Dexie                          | 4.x     |
| Feature flags        | Flagsmith                      | 9.x     |
| i18n                 | i18next                        | 25.x    |

**Never introduce** ESLint, Prettier, Jest, jsdom, or Webpack — they are not in this project.

---

## Path Aliases

Always use these aliases instead of relative paths:

```typescript
"$src/*"        → src/*
"$components/*" → src/components/*
"$pages/*"      → src/pages/*
"$hooks/*"      → src/hooks/*
"$utils/*"      → src/utils/*
"$styles/*"     → src/styles/*
"$queries/*"    → src/queries/*
```

Example: `import { Button } from "$components/button/button";`

---

## Project Structure

```
src/
├── api/              # axios instance configuration
├── assets/           # images, brand assets (issara_group_photo.jpg, logos)
├── components/       # React components by domain
│   ├── navbars/      # AnimatedStickyNavbar, GuestNavbar, AccountNavbar, AdminNavbar
│   ├── routes/       # Full page components (Contact.tsx, etc.)
│   ├── home/         # Landing page sections
│   ├── dashboard/    # Dashboard components
│   ├── labor/        # Labor module components
│   ├── forms/        # Reusable form components
│   ├── tables/       # Data table components
│   ├── ui/           # Generic UI primitives
│   ├── modals/       # Modal dialogs
│   ├── button/       # Button wrapper
│   ├── charts/       # Chart wrappers
│   ├── workplan/     # Workplan module
│   └── [27+ other domain folders]
├── constants/        # App-wide constants
├── db/               # Dexie IndexedDB setup
├── hooks/            # Custom React hooks (useCountries, useCities, useIndustries…)
├── i18n/             # i18next config
├── layouts/          # Layout wrappers (GuestLayout)
├── persisters/       # React Query persisters
├── queries/          # React Query hooks & queryClient
├── routes/           # TanStack Router route files (DO NOT hand-edit routeTree.gen.ts)
├── services/         # API service functions
├── store/            # Zustand stores (auth, membership, dashboard, viewMode)
├── styles/           # Global CSS
├── test/             # Vitest setup and test files
├── types/            # TypeScript type definitions
└── utils/            # Utility functions (auth, config, db-helpers, transforms)
```

---

## Routing

- Uses **TanStack Router** with **file-based routing** via `src/routes/`
- The `src/routeTree.gen.ts` file is **auto-generated** — never edit it manually
- Every route file must use `createFileRoute`:

```typescript
// src/routes/my-page.tsx
import { createFileRoute } from "@tanstack/react-router";
import MyPage from "$components/routes/MyPage";

export const Route = createFileRoute("/my-page")({
  component: MyPage,
});
```

- For lazy routes, use `my-page.lazy.tsx` with `createLazyFileRoute`
- Add the full page component in `src/components/routes/`

---

## Component Conventions

### File Structure

```typescript
// 1. Type imports from framer-motion (use `type` keyword)
import { motion, type Variants, AnimatePresence } from "framer-motion";

// 2. Radix UI imports
import { Container, Flex, Heading, Text, Button } from "@radix-ui/themes";

// 3. React imports
import { useState, useEffect, useRef, useId } from "react";

// 4. Router
import { useNavigate, useLocation } from "@tanstack/react-router";

// 5. Internal path-alias imports
import { authStatus } from "$utils/auth";
import styles from "./MyComponent.module.css"; // only if needed

// 6. TypeScript interfaces/types (at the top, before the component)
interface MyComponentProps {
  title: string;
  onSubmit?: () => void;
}

// 7. Constants (component-level data)
const CATEGORIES = ["Buyer", "Supplier"] as const;

// 8. Component (default export)
export default function MyComponent({ title, onSubmit }: MyComponentProps) {
  // hooks first
  // event handlers next
  // return JSX last
}
```

### Key Rules

- **Default exports** for page components; named exports for small utilities
- **PascalCase** for component names and files (`MyComponent.tsx`)
- **camelCase** for hooks (`useMyHook.ts`) and utilities
- **kebab-case** for route files (`my-page.tsx`)
- Type Framer Motion `Variants` as `const fadeUp: Variants = { ... }` to avoid TS errors
- Use `useId()` for accessible form field IDs

---

## Styling Rules

### Priority Order

1. **Tailwind CSS** — default for layout, spacing, typography
2. **Radix UI** components — for interactive elements
3. **CSS Modules** — for complex animations or component-specific overrides
4. **MUI** — only for `DataGrid` tables and existing MUI components; do not introduce new MUI usage

### Design System — Style Guide (Facelift)

All design tokens are declared in `src/styles/global.css` under `:root`. **Use these — do not hardcode hex values.**

#### Color Tokens

| CSS Variable           | Value     | Use                                        |
| ---------------------- | --------- | ------------------------------------------ |
| `--color-primary`      | `#004A60` | Navy — H1/H2/H3, Alt-1 buttons             |
| `--color-secondary`    | `#148696` | Teal — Primary buttons, focus rings, links |
| `--color-bg`           | `#FBF6EC` | Cream — authenticated page background      |
| `--color-ink`          | `#333333` | H4, strong body text                       |
| `--color-body`         | `#56666C` | Paragraph copy                             |
| `--color-caption`      | `#8A979C` | Caption / disabled text                    |
| `--color-border`       | `#D2D2D2` | Input borders, dividers                    |
| `--color-action-coral` | `#FB8379` | Error / destructive                        |
| `--color-action-teal`  | `#A6DFDD` | Active tab bg                              |
| `--color-action-cream` | `#FFF8DE` | Tab hover bg                               |

#### Spacing Scale

| CSS Variable  | Value | Tailwind utility  |
| ------------- | ----- | ----------------- |
| `--space-xs`  | 5px   | `p-xs` / `m-xs`   |
| `--space-s`   | 10px  | `p-s` / `m-s`     |
| `--space-m`   | 15px  | `p-m` / `m-m`     |
| `--space-l`   | 25px  | `p-l` / `m-l`     |
| `--space-xl`  | 40px  | `p-xl` / `m-xl`   |
| `--space-xxl` | 65px  | `p-xxl` / `m-xxl` |

#### Typography Scale — Two-Variant System

Each heading has two size variants. The **smaller size is the default** (longer titles); the **larger size is for short/display titles** — apply `.heading-display` to the element.

| Element   | Default (long title) | Display (short title)                 | Weight  | Color token       |
| --------- | -------------------- | ------------------------------------- | ------- | ----------------- |
| `h1`      | 40px                 | 52px (`.heading-display`)             | 900     | `--color-primary` |
| `h2`      | 32px                 | —                                     | 900     | `--color-primary` |
| `h3`      | 22px                 | 28px (`.heading-display`)             | 900     | `--color-primary` |
| `h4`      | 16px, weight 600     | 20px, weight 900 (`.heading-display`) | 600/900 | `--color-ink`     |
| Paragraph | DM Sans 16px         | —                                     | —       | `--color-body`    |
| Caption   | DM Sans 10px         | —                                     | —       | `--color-caption` |

Global rules for `h1`–`h4` live in `src/styles/global.css`. **Do not add inline heading colors or sizes** — the global rule and `.heading-display` handle it.

`PageHeader.tsx` automatically uses `.heading-display` on its `<h1>` since page titles are always short.

#### Facelift Rules — What to Fix in Any File

1. **h1–h3 heading color & size**: Remove any explicit `text-[#...]`, `text-[Npx]`, `text-gray-*`, `text-blue-*`, `leading-[...]`, `font-black` classes — the global CSS rule covers navy, size, and weight. Use `.heading-display` on the element for short titles instead of `text-[52px]`/`text-[28px]`/`text-[20px]`.
2. **h4 heading color**: The global rule handles ink `#333333`; remove conflicting inline colors.
3. **Body/muted text**: Replace `text-gray-500`/`text-gray-600` → `text-[#56666C]`; `text-gray-400` → `text-[#8A979C]`.
4. **Error/destructive**: Replace `text-red-500` → `text-[#FB8379]`.
5. **Links/hover**: Replace `hover:text-blue-*` → `hover:text-[#148696]`.
6. **Section container padding**: Replace `p-4`/`p-6`/`p-8` on outer wrappers → spacing-scale classes (`p-s`, `p-m`, `p-l`). Do **not** change ECharts internal `padding` config numbers.
7. **Buttons**: Use `.cascade-btn .cascade-btn--primary` (teal fill), `.cascade-btn--alt1` (navy fill), `.cascade-btn--alt2` (outline teal) via `src/components/button/button.tsx`.
8. **Tabs**: Use `.cascade-tab` class on Radix `TabsTrigger`.

#### Key Shared UI Components (reuse before building new)

- `src/components/ui/PageHeader.tsx` — page-level H1
- `src/components/ui/SectionHeader.tsx` — H2/H3 with icon + action slots
- `src/components/ui/SectionCard.tsx` — card wrapper with standard spacing
- `src/components/ui/PageContainer.tsx` — page content wrapper
- `src/components/button/button.tsx` — button with cascade-btn classes

### Brand Colors (Legacy Reference)

| Token         | Hex                       | Usage                                            |
| ------------- | ------------------------- | ------------------------------------------------ |
| Primary teal  | `#148696`                 | Borders, icons, links, CTAs                      |
| Dark teal     | `#00516a`                 | Dark sections, hover states, footer-style blocks |
| Light teal bg | `rgba(20, 134, 150, 0.1)` | Hover fills, subtle backgrounds                  |

Use brand colors with Tailwind arbitrary values:

```tsx
className = "text-[#148696] border-[#148696] bg-[#00516a]";
```

**Never introduce** arbitrary colors outside the brand palette. Do not use random blues, greens, purples, or reds. When in doubt, use `gray-*` Tailwind tokens or brand teal derivatives only.

### Typography

- **Body font**: `DM Sans` (configured in Tailwind `fontFamily.sans`)
- **Headings**: `Fugaz One` (configured in Tailwind `fontFamily.heading`)
- Use `font-heading` Tailwind class for headings

**Never** introduce a third font family. Do not mix Fugaz One and DM Sans in the same prose block. Always use the Tailwind type scale (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`). Use `font-medium` or `font-semibold` — never `font-bold` on body text.

### Biome Formatting (enforced on commit)

- **Tabs** for indentation, width 2
- **Double quotes** for strings
- **Semicolons** always
- **Trailing commas** in objects and arrays
- **Line width**: 80 characters

Do not fight the formatter. Write clean code and let Biome handle style.

---

## UI/UX Consistency — Senior Developer Standards

These rules apply to **every component you generate**. Inconsistent spacing, border radius, or color choices produce unprofessional UI.

### Spacing System — 4px Grid

Always derive spacing from Tailwind's 4px base scale. Never use arbitrary values like `mt-[13px]` or `p-[11px]`.

| Use case                      | Tailwind class           |
| ----------------------------- | ------------------------ |
| Tight padding (badges, chips) | `px-3 py-1`              |
| Button padding                | `px-5 py-2.5`            |
| Card inner padding            | `p-6`                    |
| Section vertical spacing      | `py-16` or `py-24`       |
| Between heading and body      | `mt-4` or `mt-6`         |
| Between sibling cards         | `gap-6` or `gap-8`       |
| Page max-width container      | `max-w-6xl mx-auto px-6` |

Use the **Golden Ratio (~1.618)** for proportions — e.g., a two-column layout where the primary column is `5/8` and the secondary is `3/8` of the width (`grid-cols-5` + `col-span-3` / `col-span-2`).

### Border Radius — Be Consistent

| Element type           | Rule           |
| ---------------------- | -------------- |
| Cards / containers     | `rounded-2xl`  |
| Buttons (standard)     | `rounded-xl`   |
| Pill buttons / badges  | `rounded-full` |
| Input fields           | `rounded-lg`   |
| Tooltips / small chips | `rounded-md`   |
| Modals                 | `rounded-2xl`  |

Never mix `rounded-sm` on cards that sit next to `rounded-2xl` cards. Never use bare `rounded` — always be explicit.

### Shadows & Elevation

| Level               | Class       |
| ------------------- | ----------- |
| Flat / no elevation | (no shadow) |
| Subtle card lift    | `shadow-sm` |
| Card hover          | `shadow-md` |
| Modal / dropdown    | `shadow-xl` |

Default card shadow is `shadow-sm`. Never use `shadow-lg` as a card default — it is too heavy. Pair hover shadow with `transition-shadow duration-200`.

### Borders

- Default card border: `border border-gray-100`
- Active / selected state: `border-2 border-[#148696]`
- Dividers: `divide-y divide-gray-100` or `border-t border-gray-100`
- Never use `border-black` or `border-white` on UI elements

### Interactive States

Every clickable element must have a visible hover and focus state:

```tsx
// Hover lift + shadow
className =
  "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer";

// Focus ring (accessibility — always include)
className =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]";
```

Never suppress focus rings globally. Never create clickable elements with no hover state.

### Glass / Premium Card Pattern (hero sections only)

```tsx
className =
  "bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm p-6";
```

Use sparingly — only in hero or feature highlight blocks, never for data-dense list rows.

### What Agents Must NEVER Generate

- Border radius values inconsistent with the system above
- Colors outside the brand palette (`#148696`, `#00516a`, grays)
- Inline `style={{ color: "red" }}` overrides unless the value is dynamic
- Spacing that breaks the 4px grid
- Inconsistent font sizes — always use Tailwind's type scale
- `font-bold` on body text
- Buttons without accessible labels or `aria-*` attributes
- Hover effects using color alone with no other affordance (border, shadow, translate)
- Decorative gradients, blobs, or blurs not already present in the existing landing-page design system
- Any design element that is inconsistent with adjacent components in the same view

---

## Animation Patterns

Use `motion` from `framer-motion` (v12). Import `type Variants` to satisfy TypeScript:

```typescript
import { motion, type Variants, AnimatePresence } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// Usage
<motion.section variants={staggerContainer} initial="hidden" whileInView="visible">
  <motion.div variants={fadeUp}>content</motion.div>
</motion.section>
```

For conditional mounting/unmounting with animation:

```typescript
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="unique-key"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      content
    </motion.div>
  )}
</AnimatePresence>
```

---

## Data Fetching

Use **TanStack React Query** for all server state:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "$queries/queryClient";

// Always define query keys as constants
const QUERY_KEYS = {
  suppliers: ["suppliers"],
  supplier: (id: number) => ["suppliers", id],
};

// Query hook
const { data, isLoading, error } = useQuery({
  queryKey: QUERY_KEYS.suppliers,
  queryFn: () => fetchSuppliers(),
});
```

Do **not** use raw `axios` in components — create service functions in `src/services/`.

---

## Global Partner Policies & Workplan Files

This flow connects two roles:

- **Global Partner user** updates their own files in `/company-profile`.
- **Supplier user** opens `/member-directory/detail?id=<spId>&type=Global%20Buyer`
  and sees that Global Partner's public files.

Keep these two data sources separate, then merge them only for display:

| Source                                | Updated from                                      | Read from                                                                                        | Frontend mapping        |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| Company Profile Policies & Compliance | `/company-profile` -> `PoliciesComplianceSection` | `GET /cascade/strategic-partners/:id/policies/`                                                  | `getPolicyApiEntries()` |
| Global Partner Work Plan documents    | Workplan document upload flow / legacy API        | `GET /api/v2/strategicpartners/:id/` fields `policy_files`, `compliance_files`, `workplan_files` | `getPolicyEntries()`    |

### Company Profile Policy Setup

- The editor lives in
  `src/components/company-profile/policies/PoliciesComplianceSection.tsx`.
- The owner is passed from `src/routes/company-profile.tsx`.
- Global Partner policies must use:

```typescript
{
  kind: "strategic-partner",
  id: loggedInPartnerId,
}
```

- Supplier policies must use:

```typescript
{
  kind: "supplier",
  id: loggedInSupplierId,
}
```

- Policies support exactly three source types:
  - `text`: requires `text_value`
  - `link`: requires `link_url`
  - `file`: requires either a new `file` upload or an existing
    `shared_file_id`; accepted upload types are PDF, DOC, DOCX
- Use `src/hooks/usePolicies.ts` for all policy CRUD. It posts
  `multipart/form-data` because file policies upload a document.
- For Global Partner owners, `PoliciesComplianceSection` also calls
  `useStrategicPartnerWorkplanPolicyFiles(strategicPartnerId)` and
  prepopulates unsaved file rows from the legacy Strategic Partner detail
  fields `policy_files`, `compliance_files`, and `workplan_files`.
- Work Plan rows must not re-upload or duplicate the file. They keep the
  existing `SharedFile.id` as `shared_file_id`; when the user saves category
  changes, the policy API creates/updates the local `Policy` row and links that
  existing file.
- Policy categories are optional. Legacy Work Plan file rows and saved policy
  rows may be synced with no selected categories; selected categories should be
  saved when users provide them, but must not block the save action.
- Backend writes accept `shared_file_id` only for Strategic Partner Work Plan
  files owned by the same Strategic Partner. Do not bypass that check from the
  frontend.
- The seven category checkboxes are the canonical policy coverage set:
  human rights, forced labor, ethical/responsible recruitment, responsible
  purchasing practices, gender, living wage, and climate resilience.
- De-duplicate Work Plan preview rows against saved policy rows by `file_id`
  first, then by normalized file URL. Once a Work Plan file is saved as a
  policy, only the policy row should remain visible.

### 2026-06-30 Video Investigation Handoff

User-provided evidence:

- `/Users/waihynhtun/Desktop/first.mov` is accepted production behavior. In
  production, editing a policy/link/file row and saving keeps the visible
  `Policies & Compliance` list stable: the updated row remains a single row.
  The footer/category count may be slightly off, but that is secondary.
- `/Users/waihynhtun/Desktop/second Local .mov` shows the local regression. A
  Global Partner edits the file type/details for a Work Plan-backed file, saves,
  and the visible file list duplicates the same underlying item, e.g. repeated
  `Supply Chain File` rows.

Working diagnosis:

- The local UI is intentionally merging two sources: saved company-profile
  policy rows from `/cascade/strategic-partners/:id/policies/` and legacy Work
  Plan file rows from `/api/v2/strategicpartners/:id/`.
- Duplication means the saved policy row created from a Work Plan file is not
  being recognized as the same file as the legacy Work Plan preview row after
  save.
- The likely weak point is identity matching after `shared_file_id` save:
  `PoliciesComplianceSection` compares saved policies by `policy.file_id`,
  `policy.file_url`, and `policy.file_name`, while Work Plan rows use
  `SharedFile.id`, `file_path`, and `name`. If the policy API returns a
  different `file_id`, a differently shaped URL, or omits the original
  `shared_file_id`, the Work Plan row is not filtered out.

Preferred plan for the next conversation:

1. Reproduce on `/company-profile` as a Global Partner and capture both network
   payloads immediately after save:
   `/cascade/strategic-partners/:id/policies/` and
   `/api/v2/strategicpartners/:id/`.
2. Compare identity fields for the duplicated row: saved policy `id`,
   `file_id`, `file_url`, `file_name`, and any `shared_file_id`/source file
   field against Work Plan `id`, `file_path`, `name`, `document_type`, and
   `document_name`.
3. Prefer making the policy API/serializer expose the original Work Plan
   `SharedFile.id` as `shared_file_id` or `source_shared_file_id` for linked
   files. Then de-duplicate by that stable ID first.
4. If backend output cannot change immediately, harden the frontend fallback:
   normalize file URLs to canonical media paths, compare path basename only as a
   last fallback, and add a title/name fallback only when file URL/id are
   unavailable.
5. After `createPolicy`/`updatePolicy`, invalidate the policy query and ensure
   the Work Plan preview rows are rebuilt from fresh policy data before leaving
   edit mode. Do not create a second upload for Work Plan files; keep sending
   `shared_file_id` when no new file was selected.
6. Add focused tests for the failing case: a Work Plan file saved as a policy
   should render once in `PoliciesComplianceSection`, and the supplier-facing
   merge should still render once in `member-directory/detail`.

### Supplier-Facing Display

The supplier-facing Global Partner detail page is assembled in:

- `src/routes/member-directory/detail.tsx`
- `src/components/member-directory/GlobalBuyerDetailView.tsx`
- `src/utils/memberDirectory.ts`

Display rules:

- Fetch the Global Partner detail with `useGlobalBuyerDetail(id)` for workplan
  files.
- Fetch company-profile policies with `usePoliciesByOwner({ kind:
"strategic-partner", id }, { mockMode: "never" })` so the detail page shows
  real saved policy records, not generic mock policy rows.
- Merge rows with:

```typescript
const policyEntries = mergePolicyEntries([
  ...getPolicyEntries(company),
  ...getPolicyApiEntries(profilePolicies),
]);
```

- `getPolicyEntries()` must include all workplan-backed documents from
  `policy_files`, `compliance_files`, and extra `workplan_files`, then
  de-duplicate them.
- `getPolicyApiEntries()` maps company-profile policies into the same
  `PolicyEntry` shape.
- `mergePolicyEntries()` removes duplicate visible actions, preferring the
  first occurrence.

### UI Contract

Render all rows inside the `Policies & Compliance` section of
`GlobalBuyerDetailView`.

- File policies show a document icon, file name, category chips, and
  `Download`.
- Link policies show a link icon, category chips, and `Open Link`.
- Text policies show a text/chat icon, policy description, and category chips.
- Keep this UI visually consistent with `/company-profile`: compact row height,
  restrained font sizes, `rounded-xl` rows, `shadow-sm`, 4px spacing scale, and
  brand teal accents.
- Do not make this section visually heavier than the company profile cards.

When changing this flow, update or add tests in
`src/test/memberDirectory.test.ts`, especially around:

- workplan file mapping
- company-profile policy API mapping
- merge/de-duplication behavior
- Global Partner access rules

---

## State Management

Use **Zustand** for global client state:

```typescript
import { useAuthStore } from "$store/auth";
import { useMembershipStore } from "$store/membership";
```

Use local `useState` / `useReducer` for component-level state.

---

## Environment Variables

All env vars are prefixed `VITE_` and declared in `src/vite-env.d.ts`.

Key variables:

```
VITE_APP_API_URL          — main API
VITE_APP_CASCADE_API_URL  — CASCADE API
VITE_APP_GD_API_URL       — Golden Dreams API
VITE_APP_AUTHKIT_*        — WorkOS auth config
VITE_FLAGSMITH_ENVIRONMENT — feature flags (per-environment key: development / staging / production)
```

Always access via `import.meta.env.VITE_*`, never `process.env`.

---

## Testing

Write tests in `src/test/` or co-located as `*.test.tsx` inside `src/`.

**Framework:** Vitest + React Testing Library + happy-dom

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
});
```

**Rules:**

- Use `screen.getByRole` over `getByTestId` (prefer accessible queries)
- Use `userEvent` over `fireEvent` for realistic interactions
- Do not use `jsdom` — the environment is `happy-dom`
- Tests run on `pre-push` hook and in CI

**Commands:**

```bash
npm run test          # watch mode
npx vitest run        # single run (CI mode)
npm run test:coverage  # with coverage report
```

---

## Git Hooks (Husky)

| Hook         | Command           | When                                         |
| ------------ | ----------------- | -------------------------------------------- |
| `pre-commit` | `npx lint-staged` | Every commit — lints staged files with Biome |
| `pre-push`   | `npx vitest run`  | Every push — runs full test suite            |

Never use `--no-verify` to bypass hooks.

---

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/Build Test Deploy Frontend.yml`

Pipeline order:

1. `npm run lint` (Biome)
2. `npm run typecheck` (tsc --noEmit)
3. `npm run build` (Vite)
4. `npx vitest run` (unit tests)
5. Upload coverage artifact

The pipeline runs on every push and PR to `main`. All steps must pass before merging.

---

## Notification System

### Architecture Overview

Notifications are stored in the `cascade-api` database and fetched by the ILM-facelift frontend. There are **two distinct subsystems** — Marketplace notifications and Message Board notifications — unified under one Zustand store and one notification panel UI.

```
cascade-api  ──→  GET /notifications        ──→  useNotificationStore (Zustand)
                  PATCH /notifications/read        ├── AccountNavbar (bell + badge)
                  POST  /notifications             └── NotificationPanel (slide-in drawer)

ILM-facelift ──→  emitNotifications()       ──→  POST /notifications  (fire-and-forget)
(client-side)      (src/utils/notificationEmit.ts)
```

Key files:

- `src/store/notificationStore.ts` — Zustand store, API calls, types
- `src/utils/notificationEmit.ts` — fire-and-forget emit helper for Message Board events
- `src/utils/auth-utils.ts` — `getNotificationParams()` builds role-scoped query params
- `src/components/navbars/NotificationPanel.tsx` — slide-in drawer UI
- `src/components/navbars/AccountNavbar.tsx` — bell icon + unread count badge

### Notification Types

```typescript
// Marketplace (buyer ↔ supplier)
type MarketplaceNotificationType =
  | "SPONSOR" // buyer paid to sponsor a solution for a supplier
  | "RECOMMEND" // buyer recommended a solution to a supplier
  | "ACCEPT" // supplier accepted a sponsored/recommended solution
  | "DECLINE" // supplier declined a sponsored/recommended solution
  | "PAYMENT_SUCCESS"; // payment for a sponsored solution confirmed

// Message Board (staff ↔ partner)
type MessageBoardNotificationType =
  | "MB_POST" // Cascade staff published a post → partner audience
  | "MB_REPLY" // Cascade staff replied to a comment → partner audience
  | "MB_COMMENT" // partner posted a comment/reply → Issara staff
  | "MB_RSVP" // partner RSVP'd "going" to an event → Issara staff
  | "MB_ACK" // partner acknowledged a post → Issara staff
  | "MB_REMIND"; // Cascade staff reminded a partner to acknowledge/RSVP
```

### NotificationItem Shape

```typescript
interface NotificationItem {
  id: number;
  recipient_id: string; // SP id, supplier id, or "issara-staff" sentinel
  recipient_role: string; // "buyer" | "supplier" | "staff"
  sender_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: {
    sender_name?: string;
    sender_id?: string | number;
    post_id?: string | number; // Message Board deep-link target
    post_title?: string;
    post_type?: string;
    comment_id?: string | number;
    [key: string]: unknown;
  } | null;
  is_read: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Role-Scoped Filtering — `getNotificationParams()`

Every fetch and mark-read call passes query params built by `getNotificationParams()` (`src/utils/auth-utils.ts`):

| Role                                         | Params sent                         | Who receives                                                       |
| -------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `org-supplier`                               | `supplier_id=<id>`                  | Supplier's own SPONSOR/RECOMMEND/ACCEPT/DECLINE notifications      |
| `org-global-partner`                         | `strategic_partner_id=<id>`         | Partner's MB_POST, MB_REPLY, MB_REMIND + marketplace notifications |
| `org-issara-staff` / `org-issara-management` | `staff=1`                           | All MB_COMMENT, MB_RSVP, MB_ACK events from any partner            |
| `org-recruiter` / `org-recruitment-agency`   | _(no extra params)_                 | No marketplace or message-board notifications currently            |
| `org-test-user`                              | _(depends on mock SP/supplier IDs)_ | Resolved to SP 28 / supplier 17792 in mock mode                    |

`cascade-api` uses these params server-side to scope the `notifications` table query. The frontend **never** filters by role itself — it shows whatever the API returns.

### Polling & Refresh

- **AccountNavbar** polls `fetchNotifications(params)` every **60 seconds** while the user is authenticated.
- **NotificationPanel** re-fetches on every open.
- **Message Board route** watches `useNotificationStore` for unread `MB_*` types and calls `queryClient.invalidateQueries([MESSAGE_BOARD_QUERY_KEY])` when new board notifications arrive — this keeps the board list in sync without a full page reload.
- **PlanView** calls `fetchNotifications(params)` after a supplier accepts or declines a pending solution — refreshes the buyer's notification panel immediately.

### Notification Flow by Role

#### Buyer (org-global-partner) — Marketplace

```
Buyer sponsors a solution for supplier(s) in PlanView
  → marketplace API records the SPONSORED entry
  → cascade-api emits SPONSOR notification to supplier_id
  → supplier sees it in their NotificationPanel

Supplier accepts/declines
  → cascade-api emits ACCEPT/DECLINE notification to buyer's strategic_partner_id
  → buyer sees it in their NotificationPanel, deep-links to /cascade-marketplace ?tab=plan
```

#### Supplier (org-supplier) — Marketplace

```
Supplier opens PlanView → ActionRequiredSection shows pending SPONSORED/RECOMMENDED items
Supplier clicks Accept/Decline
  → ACCEPT or DECLINE notification emitted to the buyer
  → fetchNotifications() called immediately to refresh own panel
```

#### Partners (org-global-partner) — Message Board

```
Cascade staff publishes a post (MB_POST)
  → emitNotifications({ recipient_id: strategicPartnerId, recipient_role: "buyer", type: "MB_POST" })
  → partner sees it in NotificationPanel
  → clicking deep-links to /message-board?post=<id>

Cascade staff replies to a comment (MB_REPLY)
  → emitNotifications({ recipient_id: commenter's strategicPartnerId, recipient_role: "buyer", type: "MB_REPLY" })
  → only the specific partner who commented receives it
  → always displayed as sender "ILM Cascade Team" (CASCADE_TEAM_TYPES — individual staff name hidden)

Cascade staff sends a reminder (MB_REMIND)
  → emitNotifications({ recipient_id: strategicPartnerId, ..., type: "MB_REMIND" })
```

#### Issara Staff (org-issara-staff / org-issara-management) — Message Board

```
Partner posts a comment/reply (MB_COMMENT)
  → emitNotifications({ recipient_id: ISSARA_STAFF_RECIPIENT, recipient_role: "staff", type: "MB_COMMENT" })
  → sender_name is the PARTNER ORG NAME, not the individual user

Partner RSVP's "going" (MB_RSVP)
  → emitNotifications({ recipient_id: ISSARA_STAFF_RECIPIENT, recipient_role: "staff", type: "MB_RSVP" })

Partner acknowledges a post (MB_ACK)
  → emitNotifications({ recipient_id: ISSARA_STAFF_RECIPIENT, recipient_role: "staff", type: "MB_ACK" })
  → staff see count: "<N> of <total> partners confirmed" in PostCard
```

### Sender Identity Rules

These rules are enforced in `NotificationPanel.tsx`:

| Notification type                 | Sender shown                          | Reason                                              |
| --------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `MB_POST`, `MB_REPLY`             | `"ILM Cascade Team"` (hardcoded)      | Cascade staff identity is never exposed to partners |
| `MB_COMMENT`, `MB_RSVP`, `MB_ACK` | Partner org name (`data.sender_name`) | Staff need to know which partner acted              |
| Marketplace types                 | `data.sender_name` or omitted         | Buyer/supplier names from marketplace flow          |

### Navigation on Click

| Notification type                                                     | Deep-link destination                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `MB_POST`, `MB_REPLY`, `MB_COMMENT`, `MB_RSVP`, `MB_ACK`, `MB_REMIND` | `/message-board?post=<data.post_id>` (or `/message-board` if no post_id)              |
| All Marketplace types                                                 | `/cascade-marketplace` with `localStorage["cascade-marketplace-target-tab"] = "plan"` |

### emitNotifications() — Client-Side Emit

Message Board notifications cannot be written by Django (the board backend). Instead, the frontend calls `emitNotifications()` (`src/utils/notificationEmit.ts`) **after** each board mutation succeeds. This is **fire-and-forget** — errors are swallowed so the board action is never blocked.

```typescript
import {
  emitNotifications,
  ISSARA_STAFF_RECIPIENT,
} from "$src/utils/notificationEmit";

// Partner action → notify Issara staff
emitNotifications({
  recipient_id: ISSARA_STAFF_RECIPIENT, // "issara-staff" sentinel
  recipient_role: "staff",
  type: "MB_ACK",
  title: `${partnerName} acknowledged a post`,
  message: `${partnerName} acknowledged "${postTitle}"`,
  data: {
    sender_name: partnerName,
    sender_id: actingPartnerId,
    post_id: post.id,
  },
});

// Staff reply → notify the specific partner
emitNotifications({
  recipient_id: String(strategicPartnerId),
  recipient_role: "buyer",
  type: "MB_REPLY",
  title: "Cascade Team replied",
  message: commentSnippet,
  data: { sender_name: "ILM Cascade Team", post_id: post.id },
});
```

Rules:

- **Never** emit a notification for Issara staff actions in the `MB_POST` staff-authoring flow (creating/editing posts does not notify staff).
- **Only** emit `MB_RSVP` for the affirmative "going" status, not "not_going".
- `actingPartnerId` must be `null` for Issara staff — never attribute board actions to a partner org for staff.
- `sender_name` for partner→staff events is the **partner org name** (from `acting_partner_name` / `strategic_partner_name` in the mutation response), never the individual user's name.

### Marking as Read

```typescript
// Single notification (on click in NotificationPanel)
markAsRead(notification.id, getNotificationParams());

// All notifications (Mark all as read button)
markAllAsRead(getNotificationParams());
```

Both calls `PATCH /notifications/read` on cascade-api. `getNotificationParams()` is always passed so the server scopes the mark-read to the correct recipient.

### Token Rotation

`notificationStore.ts` captures rotated JWT tokens from `x-new-access-token` / `x-new-refresh-token` response headers and writes them back to `localStorage` automatically on every notification fetch. Do not remove this logic.

### Adding a New Notification Type

1. Add the string literal to `MarketplaceNotificationType` or `MessageBoardNotificationType` in `notificationStore.ts`.
2. Add an icon entry to `typeIcon` in `NotificationPanel.tsx`.
3. Decide recipient scope: partner (`recipient_id = strategicPartnerId`) or staff (`recipient_id = ISSARA_STAFF_RECIPIENT`).
4. If it's a Message Board type, add it to `MB_TYPES` in `NotificationPanel.tsx` and `BOARD_REFRESH_NOTIFICATION_TYPES` in `message-board.tsx` if it should trigger a board refresh.
5. If it needs to hide the sender identity, add it to `CASCADE_TEAM_TYPES` in `NotificationPanel.tsx`.
6. Call `emitNotifications()` after the mutation `onSuccess` in the triggering component.

---

## What NOT to Do

- Do **not** edit `src/routeTree.gen.ts` — it's auto-generated by the Vite plugin
- Do **not** use `process.env` — use `import.meta.env`
- Do **not** use relative `../../` imports — use path aliases
- Do **not** introduce ESLint, Prettier, or Jest
- Do **not** use `jsdom` — use `happy-dom`
- Do **not** add `any` casts without a comment explaining why
- Do **not** use `console.log` in production code
- Do **not** commit directly to `main` — use feature branches
- Do **not** use `--no-verify` to bypass git hooks
- Do **not** hardcode `#148696` in CSS files if a CSS variable or Tailwind class works

---

## User Roles & Access Control

### Role Slugs

All roles are stored as slugs in `localStorage("auth-storage")` under `state.role` and are retrieved via the `useAuthData()` hook.

| Role slug                | Who it represents              | Default view mode |
| ------------------------ | ------------------------------ | ----------------- |
| `org-test-user`          | CSO / internal tester          | `tester-view`     |
| `org-issara-management`  | Issara management staff        | `ilm-view`        |
| `org-issara-staff`       | Issara regular staff           | `ilm-view`        |
| `org-global-partner`     | Buyer / global partner company | `buyer-view`      |
| `org-supplier`           | Supplier company               | `supplier-view`   |
| `org-recruiter`          | Individual recruiter           | `ra-view`         |
| `org-recruitment-agency` | Recruitment agency             | `ra-view`         |
| `org-cso`                | CSO partner organization       | `cso-view`        |

### CSO Organization Profile

- `/organization-profile` is for `org-cso` plus internal support roles only. Route guards must not implicitly widen access to Supplier, Recruiter, or Global Partner roles.
- Read mode renders plain values and chips; disabled form controls and selection counts are not an acceptable read-only representation.
- NACE uses four dependent inputs (Section → Division → Group → Class). Persist canonical codes only; changing a parent clears its descendants. Reconstruct missing ancestors when reading a legacy deep-only selection.
- Organization images use the caller-scoped Django endpoints under `/cascade/organizations/me/images/`, not the Golden Dreams business-image endpoints. The UI stages uploads and removals until the section Save action.
- The CSO profile logo is separate from gallery images and uses the caller-scoped Django endpoint `/cascade/organizations/me/logo/`; changing it saves immediately and must not consume a gallery slot.

### Reading the Role in a Component

```typescript
import { useAuthData } from "$hooks/useAuthData";

const { role } = useAuthData();
```

Never read directly from `localStorage` inside components — always use the hook.

### Role Helper Utilities (`src/utils/account.ts`)

```typescript
import {
  isSupplier,
  isIssaraManagement,
  isILMManagement,
  isRecruiter,
} from "$utils/account";

isIssaraManagement(role); // true for org-issara-management | org-issara-staff | org-test-user
isILMManagement(role); // true for org-issara-management | org-issara-staff (no tester)
isSupplier(role); // true for org-supplier
isRecruiter(role); // true for org-recruitment-agency
```

Use these helpers instead of inline string comparisons whenever possible.

### View Mode (`src/store/viewModeStore.ts`)

Some roles (Issara management, staff, test-user) can switch between views using the floating gear button. The active view is stored in Zustand and persisted to `localStorage("view-mode-storage")`.

```typescript
import { useViewModeStore } from "$src/store/viewModeStore";

const { viewMode } = useViewModeStore();
// viewMode: "buyer-view" | "supplier-view" | "ra-view" | "tester-view" | "ilm-view" | ""
```

When writing role-gated logic, check **both** `role` and `viewMode` if the feature depends on the currently selected context:

```typescript
const isSupplierContext =
  role === "org-supplier" || viewMode === "supplier-view";
```

### Route-level Auth Guards (`src/utils/auth.ts`)

Route loaders use `createAuthGuard` to protect pages. `org-issara-management`, `org-issara-staff`, and `org-test-user` are always added to the allowed list automatically — you do **not** need to list them explicitly per-route.

---

## Mock Data

### When Mock Data Is Active

Mock data is enabled in two ways:

1. **Flagsmith flag** — the `use_mock_data` flag is on for the current Flagsmith environment (development / staging / production, selected by `VITE_FLAGSMITH_ENVIRONMENT`)
2. **Role-based** — the logged-in user has one of the internal roles:
   - `org-test-user`
   - `org-issara-management`
   - `org-issara-staff`

### User Identifiers (`src/utils/getUserIdentifiers.ts`)

For components that need the user's supplier/partner IDs alongside a mock-data check, use `getUserIdentifiers()` instead of reading `localStorage` directly:

```typescript
import { getUserIdentifiers } from "$utils/getUserIdentifiers";

const { role, supplierId, partnerId, isSupplier, isGlobalPartner, isTestUser } =
  getUserIdentifiers();
// isTestUser is true for org-test-user | org-issara-management | org-issara-staff
// supplierId and partnerId are already hardcoded to mock values (17792 / 28) when isTestUser is true
```

Use `isTestUser` as a secondary guard alongside `useMockData()` when you need the supplier/partner IDs too:

```typescript
const { isTestUser } = getUserIdentifiers();
const shouldUseMockData = useMockData() || isTestUser;
```

Do **not** call `getUserIdentifiers()` outside components or hooks — it reads `localStorage` directly.

### Canonical Check (`src/utils/config.ts`)

Always call `useMockData()` — never duplicate the role logic inline:

```typescript
import { useMockData } from "$utils/config";

const shouldUseMockData = useMockData();
```

`useMockData()` reads `role_slug` (falling back to `groups[0]`) from `localStorage("auth_user")` and returns `true` for the three internal roles listed above, or when the env flag is set.

### Mock Data Files Location

All mock data lives under `src/assets/mock/`. Files are plain JSON or TypeScript exports:

```
src/assets/mock/
├── our-workplace.json
├── timeliness-remediation.json
├── message-board-data.ts
├── hrStaffNames.json
└── ...
```

### Pattern for Using Mock Data in a Route Component

```typescript
import { useMockData } from "$utils/config";
import mockData from "$src/assets/mock/my-data.json";

function RouteComponent() {
  const { role } = useAuthData();
  const shouldUseMockData = useMockData();

  const data = shouldUseMockData ? mockData : apiData;
  // partner / supplier IDs are hardcoded for mock mode:
  const partnerId = shouldUseMockData ? 28 : authUser?.partner ?? null;
  const supplierId = shouldUseMockData ? 17792 : supplierIdFromAuth;
  ...
}
```

**Rules:**

- Never call the real API and fall back to mock inside the same branch — keep the paths clearly separated with `shouldUseMockData`.
- Do **not** call `useMockData()` outside of components or hooks (it reads `localStorage`). For utility/service functions, pass the flag as a parameter.
- Mock partner ID is `28`, mock supplier ID is `17792` — use these constants consistently.

---

## Quick Reference

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck

# Tests (watch)
npm run test

# Tests (CI / single run)
npx vitest run

# Coverage
npm run test:coverage
```

# Codex Instructions: Move GD-Lite Message Board Feature to Cascade API

## Context

GD-Lite is a React Native application for workers. Workers should be able to see:

- Polls
- Message Board posts
- Notifications

However, GD-Lite users must **not** see all content by default.

A GD-Lite worker should only see content related to the Supplier they are verified with.

Supplier verification happens through QR code scanning:

1. `ILM-facelift` generates a Supplier QR code.
2. GD-Lite scans the QR code.
3. The backend validates the QR code.
4. The GD-Lite worker account is linked/verified with the Supplier.
5. After verification, the worker can access only that Supplier’s Polls, Message Board posts, and Notifications.

## Main Goal

Move the entire **Message Board** feature to `cascade-api`.

The existing Message Board implementation from the `golden-dreams_v2` repository should **not** be used as the source of truth anymore.

Going forward:

- `cascade-api` must own the Message Board backend logic.
- GD-Lite should consume Message Board data from `cascade-api`.
- Supplier-based access control must be enforced by `cascade-api`.
- Frontend filtering alone is not acceptable for security.

## Important Repositories

### GD-Lite

React Native mobile application for workers.

Responsibilities:

- QR code scanning
- Worker login/session handling
- Calling Cascade API endpoints
- Displaying verified Supplier-specific Polls, Message Board posts, and Notifications

### ILM-facelift

Existing system that generates Supplier QR codes.

Responsibilities:

- Generate Supplier QR code
- Provide enough encoded or referenced data for backend verification
- QR code must allow Cascade API to identify the related Supplier securely

### cascade-api

New backend source of truth for Message Board.

Responsibilities:

- Validate worker access
- Manage Message Board data
- Return only Supplier-authorized content
- Provide APIs for GD-Lite
- Enforce backend-level access control
- Own Message Board tests

### golden-dreams_v2

Legacy source for Message Board.

Rules:

- Do not build new Message Board features inside this repository.
- Do not rely on this repository as the source of truth.
- Use it only as a reference if needed for understanding old behavior.
- Any reused behavior must be reimplemented cleanly in `cascade-api`.

---

# Required Architecture

## Message Board Ownership

The Message Board domain must live inside `cascade-api`.

Recommended domain ownership:

```text
cascade-api
  └── message-board
      ├── models
      ├── serializers / schemas
      ├── controllers / views
      ├── services
      ├── permissions
      ├── routes
      └── tests
```

Adjust the exact structure according to the existing `cascade-api` conventions.

## Access Control Rule

A worker can only access Message Board content if:

```text
worker.id is linked to supplier.id through a verified worker-supplier relationship
```

The backend must check this relationship on every Message Board API request.

Never trust frontend parameters alone.

Bad pattern:

```text
GET /message-board?supplier_id=123
```

If the backend simply trusts `supplier_id=123`, this is insecure.

Required pattern:

```text
Authenticated worker -> backend resolves verified supplier relationships -> backend filters allowed content
```

## Expected Data Relationship

Recommended conceptual relationship:

```text
Worker User
  -> WorkerSupplierVerification
      -> Supplier
          -> Message Board Posts
```

A worker may have one or more verified Suppliers depending on business rules.

If the current business rule allows only one Supplier per worker, enforce that rule explicitly.

If multiple Suppliers are allowed, all APIs must return content only from the verified Supplier list.

---

# Message Board Feature Requirements

## 1. List Message Board Posts

GD-Lite must be able to fetch Message Board posts from `cascade-api`.

The API must return only posts belonging to the worker’s verified Supplier or Suppliers.

### Required Assertions

Tests must assert that:

- A verified worker can see posts from their verified Supplier.
- A verified worker cannot see posts from unrelated Suppliers.
- An unverified worker cannot see Supplier-specific posts.
- A logged-out user cannot access the endpoint.
- Filtering is enforced by the backend, not only the frontend.
- Passing another Supplier ID manually must not expose unauthorized posts.
- Deleted, inactive, or unpublished posts are not returned unless business rules explicitly allow them.

---

## 2. View Message Board Post Detail

GD-Lite must be able to open a single Message Board post.

The backend must verify that the post belongs to one of the worker’s verified Suppliers.

### Required Assertions

Tests must assert that:

- A verified worker can view detail for an authorized post.
- A verified worker cannot view detail for a post from an unrelated Supplier.
- An unverified worker cannot view Supplier-specific post details.
- A logged-out user receives an authentication error.
- The API must not leak post title, body, Supplier name, or metadata for unauthorized posts.
- Unauthorized detail requests should return the project’s standard permission response, such as `403` or `404`, depending on existing convention.

---

## 3. Message Board Post Categories / Types

If Message Board supports categories, tags, post types, or pinned posts, these must also be served from `cascade-api`.

### Required Assertions

Tests must assert that:

- Categories returned to a worker are only relevant to authorized Supplier content.
- Category filters do not expose unauthorized posts.
- Pinned posts follow the same Supplier access-control rules.
- Type-based filters do not bypass Supplier verification.

---

## 4. Attachments / Images / Files

If Message Board posts support attachments, images, or downloadable files, file access must also be protected.

### Required Assertions

Tests must assert that:

- A verified worker can access attachments for authorized posts.
- A worker cannot access attachments from unrelated Supplier posts.
- Attachment URLs must not allow unauthorized direct access.
- Signed URLs, if used, are generated only after permission checks.
- Attachment metadata is not leaked for unauthorized posts.

---

## 5. Read / Seen Status

If Message Board tracks read status, it should be tracked per worker.

### Required Assertions

Tests must assert that:

- A worker can mark an authorized post as read.
- A worker cannot mark an unrelated Supplier post as read.
- Read status is stored against the correct worker and post.
- One worker’s read status does not affect another worker.
- Unauthenticated users cannot update read status.

---

## 6. Reactions / Acknowledgements

If Message Board supports reactions, likes, acknowledgements, or confirmation buttons, these actions must respect Supplier verification.

### Required Assertions

Tests must assert that:

- A verified worker can react to an authorized post.
- A worker cannot react to an unauthorized post.
- Duplicate reactions follow the expected business rule.
- Reaction counts do not include invalid or unauthorized operations.
- Unauthenticated users cannot react.
- A worker cannot modify another worker’s reaction.

---

## 7. Comments / Replies

If Message Board supports comments or replies, they must be protected by the same Supplier access-control rules.

### Required Assertions

Tests must assert that:

- A verified worker can comment on an authorized post.
- A worker cannot comment on an unauthorized post.
- A worker cannot view comments from unauthorized posts.
- A worker cannot edit or delete another worker’s comments unless explicitly allowed.
- Deleted or hidden comments follow the project’s visibility rules.
- Unauthenticated users cannot create, update, or delete comments.

---

## 8. Notifications for Message Board

Message Board notifications must only be sent to workers verified under the related Supplier.

### Required Assertions

Tests must assert that:

- Workers verified under the target Supplier receive the notification.
- Workers not verified under the target Supplier do not receive the notification.
- Unverified workers do not receive Supplier-specific Message Board notifications.
- Notification payload does not expose unauthorized Supplier or post data.
- Opening a notification still requires backend permission checks.
- If a worker loses verification, they should no longer receive future notifications for that Supplier.

---

## 9. Admin / Supplier-Side Message Creation

If admins, program teams, or Supplier users can create Message Board posts, creation must happen through `cascade-api`.

### Required Assertions

Tests must assert that:

- Authorized admin users can create Message Board posts for allowed Suppliers.
- Unauthorized users cannot create posts.
- A user cannot create a post for a Supplier outside their permission scope.
- Required fields are validated.
- Invalid Supplier IDs are rejected.
- Created posts appear only to verified workers under that Supplier.
- Draft, scheduled, inactive, or published statuses follow the expected business rules.

---

## 10. Update / Delete Message Board Posts

Message Board update and delete operations must be permission-controlled.

### Required Assertions

Tests must assert that:

- Authorized users can update allowed posts.
- Unauthorized users cannot update posts.
- A user cannot update posts belonging to Suppliers outside their scope.
- Authorized users can delete or archive posts according to the business rule.
- Deleted or archived posts are not visible to GD-Lite workers unless explicitly allowed.
- Update and delete actions do not break worker access-control rules.

---

# API Requirements

## Suggested GD-Lite Endpoints

Follow existing `cascade-api` conventions. Example endpoint names:

```text
GET    /api/v1/gd-lite/message-board/posts
GET    /api/v1/gd-lite/message-board/posts/:id
POST   /api/v1/gd-lite/message-board/posts/:id/read
POST   /api/v1/gd-lite/message-board/posts/:id/reactions
DELETE /api/v1/gd-lite/message-board/posts/:id/reactions
```

Admin or management endpoints can be separate, for example:

```text
GET    /api/v1/admin/message-board/posts
POST   /api/v1/admin/message-board/posts
PATCH  /api/v1/admin/message-board/posts/:id
DELETE /api/v1/admin/message-board/posts/:id
```

Use actual route naming based on existing `cascade-api` patterns.

## API Response Rules

The API must:

- Return only authorized data.
- Avoid leaking unauthorized Supplier information.
- Use consistent pagination.
- Use consistent error format.
- Use existing authentication and permission middleware.
- Include only fields required by GD-Lite.
- Avoid exposing internal IDs if the project normally uses UUIDs or public IDs.

## Pagination

List endpoints must support pagination if the existing API pattern requires it.

Tests must assert that:

- Pagination works for authorized posts.
- Pagination does not include unauthorized posts.
- Total counts do not include unauthorized posts.
- Page boundaries do not leak unauthorized records.

---

# Security Requirements

## Backend Enforcement

All authorization must happen in `cascade-api`.

Frontend logic is not security.

Required backend checks:

- Authenticated worker check
- Worker-Supplier verification check
- Supplier-scoped content filtering
- Object-level permission check for detail, update, delete, read, react, comment, and attachment access

## Do Not Trust Client Input

The API must not trust:

- `supplier_id` from frontend
- post ID alone
- QR payload without backend validation
- user role from frontend
- any local app state from GD-Lite

## Unauthorized Access

Tests must cover direct API access attempts.

For example:

```text
Worker A is verified with Supplier A.
Worker B is verified with Supplier B.

Worker A tries to access Supplier B's post by ID.
Expected: denied.
```

---

# QR Verification Requirements

Although this task focuses on Message Board migration, the Message Board access logic depends on worker-Supplier verification.

Codex should check whether `cascade-api` already has a worker-Supplier verification model.

If it does not exist, propose and implement one according to existing project architecture.

## Required Assertions

Tests must assert that:

- A valid QR code can verify a worker with the correct Supplier.
- Invalid QR code is rejected.
- Expired QR code is rejected if expiry is required.
- Reused QR code behavior follows business rules.
- A worker cannot forge Supplier verification from the frontend.
- Verification creates or updates the correct worker-Supplier relationship.
- Message Board access changes correctly after verification.

---

# Migration Rules from golden-dreams_v2

The old `golden-dreams_v2` Message Board implementation is legacy.

Codex may inspect it only to understand previous behavior.

Do not copy code blindly.

When migrating:

1. Identify existing Message Board features in `golden-dreams_v2`.
2. Recreate required features inside `cascade-api`.
3. Match only the behavior that is still needed for GD-Lite.
4. Remove or ignore obsolete behavior.
5. Add complete tests in `cascade-api`.
6. Update GD-Lite API integration to use `cascade-api`.
7. Do not keep GD-Lite dependent on `golden-dreams_v2` APIs.

---

# Testing Instructions for Codex

Codex must write tests for every implemented feature.

Do not consider the task complete without tests.

## Test Coverage Must Include

### Unit Tests

Required for:

- Permission logic
- Supplier verification lookup
- Message Board filtering services
- Notification targeting logic
- Serializer/schema validation
- QR verification service, if implemented

### API / Integration Tests

Required for:

- List posts
- View post detail
- Create post
- Update post
- Delete/archive post
- Mark as read
- React/acknowledge
- Comment/reply, if supported
- Attachment access, if supported
- Notification targeting, if supported
- QR verification flow, if included in scope

### Negative Tests

Required for:

- Unauthenticated access
- Unverified worker access
- Worker accessing unrelated Supplier content
- Invalid post ID
- Invalid Supplier ID
- Manually passing another Supplier ID
- Unauthorized attachment access
- Unauthorized notification opening
- Unauthorized create/update/delete actions

### Regression Tests

Required for:

- A worker verified with Supplier A must never see Supplier B content.
- Pagination totals must not include unauthorized records.
- Detail endpoints must not leak unauthorized object data.
- Notification payloads must not expose unrelated Supplier content.
- Access must still be denied even if the frontend sends manipulated request parameters.

---

# Definition of Done

This task is complete only when:

- Message Board backend is implemented in `cascade-api`.
- GD-Lite consumes Message Board data from `cascade-api`.
- `golden-dreams_v2` is no longer used as the Message Board source of truth.
- Worker-Supplier verification is enforced on all Message Board APIs.
- Workers only see content from verified Suppliers.
- Unauthorized Supplier content is not leaked through list, detail, attachment, notification, read-status, reaction, or comment APIs.
- Tests are added for every feature.
- Negative access-control tests are included.
- Existing test suite passes.
- API behavior follows existing `cascade-api` conventions.
- Code follows existing repository style, linting, formatting, and naming conventions.

---

# Implementation Notes for Codex

Before coding:

1. Inspect `cascade-api` project structure.
2. Identify existing auth, permission, Supplier, worker, poll, and notification patterns.
3. Reuse existing conventions instead of inventing new ones.
4. Inspect `golden-dreams_v2` only as a legacy reference.
5. Inspect GD-Lite API integration patterns.
6. Design the smallest clean migration path.

While coding:

1. Keep Message Board business logic in services where appropriate.
2. Keep permission checks centralized and reusable.
3. Add object-level permission checks.
4. Add test factories or fixtures for workers, Suppliers, verifications, and posts.
5. Add clear API tests for allowed and denied access.
6. Avoid frontend-only access control.
7. Do not expose unauthorized data in error responses.

After coding:

1. Run the full related test suite.
2. Run linting and formatting.
3. Confirm GD-Lite points to `cascade-api` Message Board endpoints.
4. Confirm no GD-Lite Message Board call still depends on `golden-dreams_v2`.
5. Summarize changed files and test results.

---

# Expected Codex Output

When finished, Codex should provide:

- Summary of implemented changes
- List of new or changed API endpoints
- Data models added or changed
- Permission logic summary
- Test cases added
- Test command results
- Any migration notes
- Any remaining risks or follow-up tasks
