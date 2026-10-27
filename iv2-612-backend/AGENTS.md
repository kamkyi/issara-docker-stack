# Agent Notes

## Reopened Supplier KPI Forms

- Do not carry old remediation, payment, systems-change, assignment, retaliation, or closure values into a reopened Supplier KPI.
- Reopened Supplier KPI current state must be reset in `issara/ilm_server_2/signals.py` before saving, so the `SupplierKpiUpdate` snapshot created by `kpis/signals.py` is also clean.
- Old KPI values should remain preserved only in `supplier_kpi_updates` history for review, not copied into the editable reopened KPI form.
- The paired frontend flow is in `/Volumes/portable/work/ILM-fronted/ilm-client-2/src/views/suppliers/kpiupdates/SupplierKpiDetailsSubPanel.js` and `KpiUpdateForm.js`.

## Business KPI Updates Date Filter

- `SupplierKpiFilterSet` and `SupplierKpiUpdateFilterSet` both need the `opened_at_range` filter because `/admin/businesskpiupdates` applies the same opened date range to the current KPI table and the open/reopen cycle table.
- The frontend sends `opened_at_range_after` and `opened_at_range_before`; keep backend filters aligned with those parameter names.

## Supplier KPI List Performance

- The `/api/v2/supplierkpis/` list serializer relies on the viewset prefetches. Avoid adding serializer methods that call related managers with `values()` or `values_list()` per row.
- The `updates` field only serializes update IDs; keep its prefetch limited to `id` and `supplier_kpi_id` unless the API response changes.

## CSO Organization Profile

- `Organization` is both the referral-target dropdown source and the record CSOs edit at `/cascade/organizations/me/`. The endpoint resolves the org from the caller's `UserOrganization` link and never takes an id, so scoping cannot be bypassed by guessing one.
- Core focus areas, stakeholder groups and NACE codes live in their own one-row-per-value tables but are exposed as flat lists of keys. A PATCH replaces the whole set for a field it names, and leaves untouched any field it omits.
- The NACE classification itself belongs to cascade-api (`nace_codes`, seeded from `migrations/nace2.1-codes.json`), so only the code string is stored here and only its shape is validated. Never store the label.
- Vocabularies live in `choices.py` and are served by `/cascade/organizations/profile-options/`; the CSO UI maps each key onto its own translated label.
- `languages` is shared with legacy translations and Marketplace. Preserve existing IDs and legacy operational codes; CSO options use only `is_profile_selectable` rows, while `organization_languages_supported` stores their IDs and the API exposes canonical codes.
- Organization gallery images live in `organization_images` and are exposed only through caller-scoped `/cascade/organizations/me/images/` list/upload/delete endpoints. Never accept an organization id from the client. Enforce ownership, a maximum of three files, JPEG/PNG/WebP, and 5 MB per file.
- The separate CSO profile logo lives on `Organization.logo` and is replaced through caller-scoped `/cascade/organizations/me/logo/`. It does not consume one of the three gallery slots. Never accept an organization id for logo uploads; allow JPEG/PNG/WebP up to 5 MB and delete the replaced file from storage.
- API tests for this feature drive the views through `APIRequestFactory`, not `APIClient`: the debug toolbar middleware is active under the local settings and breaks full request/response cycles.
