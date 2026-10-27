# Internationalization (i18n) Setup

This project uses react-i18next for **static UI strings**, and **Google Translate** for
generating those locale files and for translating **dynamic server content** on the
Supplier UI. See [Google Translate Integration](#google-translate-integration) below.

## Supported Languages
- **English (en)** - Default / source language
- **Japanese (ja)** - 日本語
- **Khmer (km)** - ខ្មែរ (Cambodia)
- **Myanmar (my)** - မြန်မာ
- **Nepali (ne)** - नेपाली
- **Thai (th)** - ไทย
- **Vietnamese (vi)** - Tiếng Việt

## Setup

### 1. Install Dependencies
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### 2. Initialize i18n in your main app file
```typescript
// In your main.tsx or App.tsx
import './i18n';
```

### 3. Wrap your app with React.Suspense (optional but recommended)
```typescript
import React, { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Your app components */}
    </Suspense>
  );
}
```

## Usage Examples

### Basic Translation
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Using Custom Hook
```typescript
import useTranslation from '$src/hooks/useTranslation';

function MyComponent() {
  const { tCommon, tMessage, formatDate } = useTranslation();
  
  return (
    <div>
      <h1>{tCommon('welcome')}</h1>
      <p>{tMessage('saveSuccess')}</p>
      <span>{formatDate(new Date())}</span>
    </div>
  );
}
```

### Language Selector Component

`NavbarLanguageSelector` renders the language dropdown in the navbar and takes no props
(it reads/sets the active language via i18next internally).

```typescript
import NavbarLanguageSelector from '$src/components/i18n/NavbarLanguageSelector';

function Header() {
  return (
    <div>
      <NavbarLanguageSelector />
    </div>
  );
}
```

### Translation with Parameters
```typescript
const { t } = useTranslation();

// Translation: "Minimum {{count}} characters required"
const message = t('validation.minLength', { count: 5 });
```

### Pluralization
```typescript
// Add to translation files:
// "item": "item",
// "item_plural": "items"

const { t } = useTranslation();
const count = 5;
const message = t('item', { count }); // Will show "items" for count > 1
```

## File Structure
```
src/
├── i18n/
│   ├── index.ts              # i18n initialization / resources
│   ├── config.ts             # SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, helpers
│   ├── locales/
│   │   ├── en.json          # English translations
│   │   ├── ja.json          # Japanese translations
│   │   ├── km.json          # Khmer translations
│   │   ├── my.json          # Myanmar translations
│   │   ├── ne.json          # Nepali translations
│   │   ├── th.json          # Thai translations
│   │   └── vi.json          # Vietnamese translations
│   └── README.md            # This file
├── components/
│   └── i18n/
│       ├── NavbarLanguageSelector.tsx
│       └── TranslatedText.tsx
└── hooks/
    ├── useTranslation.ts
    ├── useActiveLanguage.ts
    └── useLanguages.ts
```

## Translation Keys Structure

### Common Keys
- `common.*` - General UI elements (buttons, labels, etc.)
- `navigation.*` - Navigation menu items
- `forms.*` - Form field labels
- `validation.*` - Form validation messages
- `messages.*` - Success/error messages

### Adding New Translations

1. Add the key to all language files in the same structure
2. Use nested objects for organization:
```json
{
  "user": {
    "profile": {
      "title": "User Profile",
      "edit": "Edit Profile"
    }
  }
}
```

3. Access nested keys with dot notation:
```typescript
t('user.profile.title')
```

## Best Practices

1. **Consistent Key Naming**: Use descriptive, hierarchical keys
2. **Avoid Hardcoded Text**: Always use translation keys
3. **Context-Aware Keys**: Group related translations together
4. **Parameter Usage**: Use interpolation for dynamic content
5. **Fallback Language**: English is set as fallback
6. **Testing**: Test all languages for UI layout issues

## Language Detection

The system automatically detects language from:
1. localStorage (user's previous choice)
2. Browser language settings
3. Falls back to English

## RTL Support

Currently configured for LTR languages. To add RTL support:
1. Add RTL language codes to the `isRTL` array in `useTranslation.ts`
2. Add RTL-specific CSS classes
3. Update component layouts accordingly

---

# Google Translate Integration

Translation is powered by Google Translate in **two layers**. Static UI copy stays in
react-i18next (fast, offline, cached in the bundle); free-form **server content** on the
Supplier UI is translated at runtime through a backend proxy.

```
┌─ Static UI strings ─────────────┐     ┌─ Dynamic server content (Supplier UI) ─┐
│ en.json  ──build-time script──▶ │     │ <TranslatedText text={serverString} /> │
│ ja/km/my/ne/th/vi.json (commit) │     │   └▶ useTranslateText (react-query)     │
│ react-i18next  t('key')         │     │       └▶ POST /api/v1/translate (proxy) │
└─────────────────────────────────┘     └────────────────────────────────────────┘
```

The Google Translate **API key never reaches the browser**. It is used only:
- server-side by the build script (`GOOGLE_TRANSLATE_API_KEY`, a non-`VITE_` env var), and
- behind the cascade-api proxy endpoint for runtime calls.

## 1. Static UI strings — build-time locale generation

`en.json` is the single source of truth. The script `scripts/translate-locales.mjs`
translates its strings into the other six languages and writes the locale JSONs, which are
**committed to git**. i18next then serves them at runtime exactly as before — no runtime
API calls for static copy.

The script protects i18next `{{variable}}` placeholders (they are masked before sending to
Google and restored afterwards, so interpolation never breaks).

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run i18n:fill` | Translate only **missing/empty** keys (incremental). Errors if the key is unset. |
| `npm run i18n:check` | **CI sync check** — exit 1 (listing gaps) if any locale is missing/empty keys vs `en.json`, exit 0 if in sync. Never calls the API, so **no key required**. |
| `npm run i18n:regenerate` | **Re-translate every key** from scratch (`--force`). Use for a full rebuild of all locales. |
| `predev` / `prebuild` | Auto-run `--auto` before `npm run dev` / `npm run build`. |

### CI enforcement

CI runs `npm run i18n:check` in the `Test` job (`.github/workflows/Build Test Deploy
Frontend.yml`). If you add a key to `en.json` without translating it into the other locales,
**CI fails and lists the missing keys** — no more silent English `missingKey` fallbacks
shipping to production. To fix: run `npm run i18n:fill` locally (with
`GOOGLE_TRANSLATE_API_KEY` set) and **commit the updated locale JSONs**. The check itself is
deterministic and network-free, so the paid Google API is never on the build path, and the
key is never exposed to CI (it stays server-side, never `VITE_`-prefixed).

### Auto-prefill (dev, docker, CI)

`predev` and `prebuild` run `node scripts/translate-locales.mjs --auto` automatically. In
`--auto` mode the script is **build-safe**: if the API key is missing or there are no gaps,
it prints a notice and exits 0 (never fails the build) and the committed JSONs are used. So
new keys added to `en.json` are auto-filled on the next dev start / build **when the key is
present**, and everything still works when it isn't.

### One-time full regeneration

```bash
GOOGLE_TRANSLATE_API_KEY=<key> npm run i18n:regenerate
git add src/i18n/locales/*.json && git commit -m "Regenerate locales via Google Translate"
```

### Preview without spending quota

```bash
node scripts/translate-locales.mjs --dry            # list gaps for all languages
node scripts/translate-locales.mjs --dry --force th # list every key for Thai
```

### Environment variable

Add to your shell / `.env` (and CI/Docker build env if you want auto-prefill on deploy):

```bash
# NOT VITE_-prefixed — stays server-side, never in the client bundle
GOOGLE_TRANSLATE_API_KEY=<your key>
```

## 2. Dynamic server content — runtime translation (Supplier UI only)

Server-generated free text (worker-reported issue descriptions, remediation notes, etc.)
never lived in the locale JSONs, so it is translated on demand.

### Frontend

Wrap the server string with `<TranslatedText>`:

```tsx
import TranslatedText from "$src/components/i18n/TranslatedText";

// Renders the string translated into the active language; shows the original
// English while loading and for English.
<TranslatedText text={row.description} />
```

- `src/components/i18n/TranslatedText.tsx` — the component.
- `src/queries/useTranslateText.ts` — react-query hook, keyed `["translate", target, text]`,
  long `staleTime`; results ride the app's IndexedDB persister so they **survive reloads**
  with no extra API calls.
- `src/services/translationService.ts` — POSTs `{ q, target }` to
  `${VITE_APP_CASCADE_API_URL}/translate` via the shared axios `api` instance (which attaches
  the WorkOS bearer token). No-ops for English / empty input.

Only apply it to **Supplier UI** pages when a page explicitly opts in to runtime translation.
Keep static labels on `t()`.

### Backend proxy

Lives in **cascade-api** (`/Users/zinminkhant/Documents/Issara/cascade-api`), Express + TS:

- Endpoint: `POST /api/v1/translate`, protected by `workosAuth`.
- `src/routes/translateRoutes.ts`, `src/controllers/translateController.ts` (zod-validates
  `{ q: string[], target }`), `src/services/translateService.ts` (calls Google Translate v2
  with `env.GOOGLE_TRANSLATE_API_KEY`), returns `{ translations: string[] }`.
- Set `GOOGLE_TRANSLATE_API_KEY` in `cascade-api/.env`.

### Confirmed runtime flow

Now that the API is working, the end-to-end runtime translation path is:

```text
TranslatedText
  -> useTranslateText
  -> translationService.translateText / translateBatch
  -> POST ${VITE_APP_CASCADE_API_URL}/translate
  -> cascade-api /api/v1/translate
  -> Google Translate v2
```

Relevant files:
- `src/components/i18n/TranslatedText.tsx` — wraps backend/server strings for display
- `src/queries/useTranslateText.ts` — react-query cache keyed by `['translate', target, text]`
- `src/services/translationService.ts` — posts `{ q, target }` to the Cascade proxy
- `cascade-api/src/routes/translateRoutes.ts` — protected route
- `cascade-api/src/controllers/translateController.ts` — request validation
- `cascade-api/src/services/translateService.ts` — Google Translate REST call

Runtime translations are cached for one week in React Query and persisted by the app's
IndexedDB query persister, so previously translated strings survive reloads.

### Backend data currently translated

There are currently no active runtime translation call sites for `/worker-reported-issues`
or `/view-worker-feedback`. Those pages now render backend strings as-is.

Static UI labels, buttons, headings, and other product copy should continue to use i18next
locale keys via `t()`. Runtime translation should only be used for future backend free-form
text when a page explicitly opts in.

Smoke test (needs a valid bearer token):

```bash
curl -X POST http://localhost:3000/api/v1/translate \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"q":["Hello"],"target":"th"}'
# → {"translations":["สวัสดี"]}
```

## Security notes

- The API key is server-side only. Verify it is absent from a production build:
  `npm run build && grep -r "AIza" dist/` should return nothing.
- The runtime endpoint is auth-protected to prevent public abuse of the paid API.
- Restrict the key in Google Cloud (Cloud Translation API only) as defence in depth.