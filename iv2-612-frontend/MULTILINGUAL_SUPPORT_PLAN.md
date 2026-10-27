# Multilingual Support Consistency Plan

This document defines a concrete rollout plan to make multilingual behavior consistent across:

- `ILM-facelift`
- `cascade-api`

It is intentionally implementation-focused. The goal is to move from partial multilingual support to one consistent language contract across UI copy, frontend data fetching, and backend responses.

Scope for this plan:

- supplier-context UI only in `ILM-facelift`
- supporting backend language behavior in `cascade-api` for supplier-context flows

For this document, supplier-context UI means both:

- logged-in supplier users with role `org-supplier`
- internal tester users when `viewMode === "supplier-view"`

## Goal

After this rollout:

- The active language is selected once in `ILM-facelift` and used consistently for supplier-context UI text and localized API data.
- `cascade-api` accepts one normalized `lang` contract on language-aware endpoints.
- React Query caches are language-aware, so switching language refetches supplier-context localized data instead of showing stale English results.
- Endpoints that are not localized are explicitly documented instead of silently defaulting to English.

## Current State Summary

### ILM-facelift

Already in place:

- i18n bootstrapping in `src/main.tsx`
- locale registration in `src/i18n/index.ts`
- translation utilities in `src/hooks/useTranslation.ts`
- language selection UI in `src/components/i18n/NavbarLanguageSelector.tsx`

Current gaps:

- Several data hooks still hardcode `lang=en`
- Some queries use `VITE_DEFAULT_LANGUAGE` instead of the actual active i18n language
- Some query keys do not include language, so cache reuse is wrong after language switch
- supplier-context UI text coverage is partial and inconsistent by feature area

### cascade-api

Already in place:

- language catalog endpoint in `src/routes/languageRoutes.ts`
- language controller/service in `src/controllers/languageController.ts` and `src/services/languageService.ts`
- some language-aware service logic such as `CascadeService.getKPIList(..., lang)`

Current gaps:

- many controllers do not parse or normalize `lang`
- language-aware behavior is inconsistent across route groups
- some code still hardcodes English defaults
- response shapes are not standardized for localized display names

## Canonical Language Contract

Use the same supported language codes in both repos:

- `en`
- `ja`
- `km`
- `my`
- `ne`
- `th`

Rules:

- `ILM-facelift` owns the active UI language via i18next
- the frontend always passes the active language to language-aware supplier-context API calls
- `cascade-api` resolves `req.query.lang` against the supported set
- unsupported or missing values fall back to `en`
- the backend returns one resolved display field for localized resources whenever possible

## Supplier-Context Scope

This plan is intentionally limited to supplier-context UI.

That means work should apply to both:

- users with role `org-supplier`
- users operating in `supplier-view`

In `ILM-facelift`, implementation should follow the existing context pattern used in supplier-facing screens:

- `isSupplier(role) || viewMode === "supplier-view"`

Relevant existing role and view-mode helpers:

- `src/store/viewModeStore.ts`
- `src/utils/account.ts`

This plan does not require first-pass multilingual rollout for:

- buyer-only UI
- recruiter-only UI
- ILM management-only UI
- tester-only UI outside supplier-view mode

## Auto Language Plus Manual Glossary Overrides

This rollout should support both of these behaviors at the same time:

- automatic language selection for the overall app experience
- manual control over specific words, phrases, and business terminology

### Intended behavior

- i18next controls the active app language
- the active language drives localized API requests
- locale JSON files control the exact wording shown for UI labels and controlled terms
- some terms may intentionally remain untranslated if the product or business decision requires that

### Recommended translation structure in ILM-facelift

Use two layers of translation content:

- general UI copy such as buttons, headings, validation, hints, and page text
- a dedicated glossary namespace for controlled business vocabulary

Recommended key groups:

- `common.*`
- `navigation.*`
- `forms.*`
- `validation.*`
- `messages.*`
- `glossary.*`

Example:

```json
{
	"common": {
		"save": "Save"
	},
	"glossary": {
		"remediation": "Remediation",
		"grievance": "Grievance",
		"workerVoice": "Worker Voice"
	}
}
```

### Where this applies

In `ILM-facelift`:

- use normal translation keys for supplier-context UI copy
- use glossary keys for terms that must stay consistent across supplier-context screens
- allow locale-specific manual wording for sensitive terms such as remediation, grievance, supplier, worker voice, or legal and compliance phrases

In `cascade-api`:

- use `lang` only to select localized data that actually exists in the source system
- do not invent translations in the API for terms that are intentionally controlled in the frontend glossary
- if a backend field is English-only by design, document it and let the frontend decide whether to display it as-is or map it to a glossary label nearby

### Implementation guidance

- add glossary entries to all locale files in `src/i18n/locales/*.json`
- prefer one canonical glossary key per business term
- avoid duplicating the same term under multiple feature-specific keys unless the wording genuinely differs by context
- if a term should remain in English across all languages, keep the same manual value in every locale file
- if a term needs localized wording, translate it manually per locale instead of relying on automatic inference

### Validation for glossary behavior

- verify language switching changes general UI copy automatically
- verify glossary-controlled terms render the exact manual wording defined in each locale
- verify intentionally non-translated terms stay stable across all locales

## Delivery Strategy

Ship this in four PRs to keep risk low and validation clear.

## PR 1: Frontend Language Source Of Truth

Objective:

- make `ILM-facelift` use one runtime language source for all localized data requests

Supplier-context focus:

- apply this first to supplier-facing and supplier-view-mode screens only

### Changes

Create a shared frontend helper for active language.

Recommended new files:

- `src/i18n/config.ts`
- `src/hooks/useActiveLanguage.ts`

Responsibilities:

- expose supported language codes
- expose a normalization helper
- expose current active language from i18n
- provide a single fallback to `en`

Refactor these files to stop using hardcoded `en` or `VITE_DEFAULT_LANGUAGE` for runtime requests:

- `src/queries/interactionReasons.ts`
- `src/queries/interactionChannels.ts`
- `src/queries/kpis.ts`
- `src/queries/nationalities.ts`
- `src/services/benefitsService.ts`
- `src/services/workerContactReasonsService.ts`
- `src/hooks/useCountries.ts`
- `src/hooks/useStates.ts`
- `src/hooks/useCities.ts`
- `src/hooks/useIndustries.ts`
- `src/hooks/useRatingCriteries.ts`
- `src/components/dropdowns/IssueCategoriesDropdown.tsx`

Supplier-context screens and entry points to prioritize when wiring these queries:

- `src/routes/workforce-polls.tsx`
- `src/routes/cascade-marketplace.tsx`
- `src/components/routes/WorkerReportedIssues.tsx`
- `src/routes/view-worker-feedback.tsx`
- `src/routes/responsible-procurement.tsx`
- supplier-context areas in `src/routes/social-responsibility-overview.tsx`

### Required implementation rules

- query keys must include language when response content depends on language
- service helpers must accept `lang` as an explicit parameter when used outside React hooks
- hooks should read the active language once and pass it through to services
- avoid direct `localStorage` language reads outside i18n initialization

### Validation

- switch language from navbar selector
- verify refetch happens for localized queries
- verify cache keys change with language
- run frontend typecheck
- run targeted frontend tests for touched hooks if present

### Exit criteria

- no language-aware query in the touched set is pinned to English
- no touched query key ignores language

## PR 2: API Language Resolution Layer

Objective:

- give `cascade-api` one reusable way to resolve request language

### Changes

Add a small language utility and middleware-like helper.

Recommended new files:

- `src/utils/language.ts`

Responsibilities:

- define supported language codes
- normalize `req.query.lang`
- return `en` when value is missing or unsupported
- expose helpers such as `resolveLanguage(req)` and `isSupportedLanguage(code)`

Update controllers to use the shared resolver instead of ad hoc parsing.

Priority files:

- `src/controllers/CascadeController.ts`
- `src/controllers/kpiController.ts`
- `src/controllers/kpiCategoryController.ts`
- `src/controllers/countryController.ts`
- `src/controllers/industryController.ts`
- `src/controllers/subindustryController.ts`
- `src/controllers/languageController.ts`

### Required implementation rules

- every language-aware controller resolves language the same way
- no controller passes raw `req.query.lang` deeper into services without validation
- response behavior for unsupported languages is deterministic and documented

### Validation

- add unit tests for language normalization helper
- add controller/service tests for missing `lang`, valid `lang`, and unsupported `lang`

### Exit criteria

- one shared language parser is used across the touched endpoints
- backend behavior for `lang` is consistent and test-covered

## PR 3: Localized Data Endpoints And Response Shape Cleanup

Objective:

- make the endpoints used by `ILM-facelift` behave consistently for localized lookup data

Supplier-context focus:

- prioritize only the endpoints used by supplier-facing and supplier-view-mode flows

### cascade-api target areas

Routes:

- `src/routes/cascadeRoutes.ts`
- `src/routes/countryRoutes.ts`
- `src/routes/industryRoutes.ts`
- `src/routes/subindustryRoutes.ts`
- `src/routes/kpiRoutes.ts`
- `src/routes/kpiCategoryRoutes.ts`

Controllers:

- `src/controllers/CascadeController.ts`
- `src/controllers/countryController.ts`
- `src/controllers/industryController.ts`
- `src/controllers/subindustryController.ts`
- `src/controllers/kpiController.ts`
- `src/controllers/kpiCategoryController.ts`

Services to inspect and align:

- `src/services/cascadeService.ts`
- `src/services/countryService.ts`
- `src/services/industryService.ts`
- `src/services/subindustryService.ts`
- `src/services/kpiService.ts`
- `src/services/kpiCategoryService.ts`
- `src/services/workerVerificationHelpers.ts`

### What to standardize

- if an endpoint supports localized labels, it must accept `lang`
- if a record has multiple language columns or translated lookup rows, the API should return one resolved display name for the requested language
- if an endpoint is English-only because the upstream source is English-only, document that explicitly in code comments or API docs

### Frontend alignment in ILM-facelift

After backend changes, update consumers if response shapes are simplified.

Priority files:

- `src/hooks/useIndustries.ts`
- `src/queries/kpis.ts`
- `src/queries/interactionChannels.ts`
- `src/queries/interactionReasons.ts`
- `src/hooks/useCountries.ts`
- `src/hooks/useStates.ts`
- `src/hooks/useCities.ts`
- `src/queries/nationalities.ts`

### Validation

- API tests comparing `en` and one non-English language for the same endpoint
- frontend smoke test proving language switch updates dropdown data

### Exit criteria

- localized lookup endpoints follow one contract
- frontend callers no longer need special-case language handling per endpoint

## PR 4: UI Copy Coverage And Regression Protection

Objective:

- remove remaining English-only UI hotspots in `ILM-facelift` and protect the flow with tests

Supplier-context focus:

- only supplier-facing and supplier-view-mode UI in this rollout phase

### Priority frontend surfaces

Current multilingual usage already exists in some grievance flows, so start by expanding from there.

Audit and complete coverage in:

- `src/components/routes/GrievanceSelfDiagnostic.tsx`
- `src/components/Grievance/**`
- supplier-context route-level pages under `src/components/routes/**`
- supplier-context shared dropdowns and selectors
- supplier-context static page headings, button labels, form hints, and validation copy

High-priority supplier-context screens:

- `src/routes/workforce-polls.tsx`
- `src/routes/cascade-marketplace.tsx`
- `src/components/routes/WorkerReportedIssues.tsx`
- `src/routes/view-worker-feedback.tsx`
- `src/routes/responsible-procurement.tsx`
- supplier-specific sections in `src/routes/social-responsibility-overview.tsx`

### Implementation rules

- new visible strings must use translation keys
- translation keys should be grouped by feature instead of dumping all new keys into one flat section
- use the same key name in all locale files

Locale files to update:

- `src/i18n/locales/en.json`
- `src/i18n/locales/ja.json`
- `src/i18n/locales/km.json`
- `src/i18n/locales/my.json`
- `src/i18n/locales/ne.json`
- `src/i18n/locales/th.json`

### Validation

- render tests for a few representative multilingual screens
- one integration test that changes language and verifies both translated UI labels and localized data refresh

### Exit criteria

- priority user-facing screens do not mix translated labels with unrelated English defaults
- multilingual regressions are caught by tests

## File Checklist By Repo

### ILM-facelift

Core i18n files:

- `src/main.tsx`
- `src/i18n/index.ts`
- `src/hooks/useTranslation.ts`
- `src/components/i18n/NavbarLanguageSelector.tsx`

Primary query and service files to refactor:

- `src/queries/interactionReasons.ts`
- `src/queries/interactionChannels.ts`
- `src/queries/kpis.ts`
- `src/queries/nationalities.ts`
- `src/services/benefitsService.ts`
- `src/services/workerContactReasonsService.ts`
- `src/hooks/useCountries.ts`
- `src/hooks/useStates.ts`
- `src/hooks/useCities.ts`
- `src/hooks/useIndustries.ts`
- `src/hooks/useRatingCriteries.ts`

UI copy audit targets:

- supplier-context files in `src/components/routes/**`
- `src/components/Grievance/**`
- supplier-context files in `src/components/dropdowns/**`

### cascade-api

Language contract files:

- `src/routes/languageRoutes.ts`
- `src/controllers/languageController.ts`
- `src/services/languageService.ts`
- `src/utils/language.ts`

Primary route/controller/service targets:

- `src/routes/cascadeRoutes.ts`
- `src/routes/countryRoutes.ts`
- `src/routes/industryRoutes.ts`
- `src/routes/subindustryRoutes.ts`
- `src/routes/kpiRoutes.ts`
- `src/routes/kpiCategoryRoutes.ts`
- `src/controllers/CascadeController.ts`
- `src/controllers/countryController.ts`
- `src/controllers/industryController.ts`
- `src/controllers/subindustryController.ts`
- `src/controllers/kpiController.ts`
- `src/controllers/kpiCategoryController.ts`
- `src/services/cascadeService.ts`
- `src/services/countryService.ts`
- `src/services/industryService.ts`
- `src/services/subindustryService.ts`
- `src/services/kpiService.ts`
- `src/services/kpiCategoryService.ts`
- `src/services/workerVerificationHelpers.ts`

## Testing Plan

### ILM-facelift

- add focused tests for language-dependent hooks
- add one integration test that switches language and verifies data refetch
- run typecheck after each PR

### cascade-api

- add unit tests for language normalization
- add controller or service tests for localized endpoints
- compare outputs across `en` and one non-English language where data exists

## Risks

- some upstream data sources may not actually have non-English content even if they accept `lang`
- language-aware cache fixes may surface stale assumptions in components that expect a single cached dataset
- inconsistent API response shapes may require small frontend adapter changes
- locale files may be incomplete, causing mixed-language pages until all keys are added
- some screens may visually appear supplier-related but still use role-only gating instead of supplier-context gating

## Definition Of Done

This effort is complete when:

- `ILM-facelift` uses one active language source for both UI and localized data fetching
- localized React Query caches are keyed by language
- `cascade-api` resolves `lang` consistently on all priority endpoints
- priority lookup endpoints return language-consistent display values
- priority supplier-context screens in `ILM-facelift` are translated and do not silently fall back to English because of hardcoded request parameters
- tests exist in both repos to prevent regression

## Suggested Ownership Split

If different engineers handle frontend and backend separately:

- Backend owner: PR 2 and backend portion of PR 3
- Frontend owner: PR 1 and frontend portion of PR 3 plus PR 4
- Shared QA: language switch validation across one English and one non-English path

## Recommended First Implementation Slice

If you want the smallest valuable first slice, do this first:

1. add frontend active-language helper
2. refactor `interactionReasons`, `interactionChannels`, and `kpis` in `ILM-facelift`
3. add backend shared language resolver in `cascade-api`
4. standardize KPI-related endpoints first

That slice gives visible user impact quickly and establishes the pattern for the rest of the rollout.

For this scoped rollout, use that first slice on supplier-context screens before widening to other roles or view modes.