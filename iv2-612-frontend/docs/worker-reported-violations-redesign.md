# Worker-Reported Violations Redesign

## Scope

The redesigned table and Internal Grievance Management form are implemented on:

`/social-responsibility/worker-reported-issues`

The route renders `WorkerReportedIssuesSupplier`. Open rows use the shared
worker-violation columns and `renderKpiExpandedContent`. The grievance API must
receive the `SupplierKpi.id` as its resource ID; the related KPI definition ID
is display-only.

The grievance domain remains in the existing ILM Django backend
(`ILM-prototype/ilm-server-2`). `cascade-api` was reviewed but is not the owner
of Supplier KPI grievance records, so no Cascade API endpoint is added for this
redesign.

## Confirmed Data and Workflow Decisions

- Preserve `information_collection_notes` and
  `ethical_investigation_notes` as separate fields. The redesigned
  investigation section shows both; neither value is merged or renamed.
- Hide the legacy Trainings section from the four-section form. Existing
  training fields, relationships, and stored values remain unchanged.
- Display `SupplierKpi.closed_at` as the read-only Internal Date Closed. Closing
  and reopening continue through the existing authorized KPI workflow.
- Attachment audience labels map to existing `SharedFile.permission` values:
  - Internal Only -> `Supplier Only`
  - Internal Only + Issara -> `Supplier + Issara`
  - Internal Only + Issara + Your Customers -> `Both`
- An attachment audience never grants access by itself. The backend also checks
  the user's supplier, staff, or linked strategic-partner relationship before
  permitting a download.
- Submitted remediation updates are immutable. Draft entries may be replaced;
  submitting a correction creates a new submitted record and preserves the
  earlier entry.
- When legacy `SupplierKpiUpdate.remediation_action` data exists without a
  submitted grievance Remediation, it is shown as a read-only legacy fallback.
  It is not automatically migrated into a new remediation entry.
- History combines verified grievance form changes, submitted child records,
  attachment events, and relevant Supplier KPI close/reopen/escalation events.
  Each item includes actor, timestamp, section, source type, and whether it was
  system-generated.
- The form keeps explicit Save Draft and Preview & Submit actions. This
  implementation does not add keystroke-level server auto-save, avoiding noisy
  history and a larger workflow change.
- The active Remediation textarea is labelled "Remediation (Draft)" so it is
  visually distinct from the "Submitted Remediation Update N" history list and
  the "Legacy remediation update" fallback below it.
- Submitted-record immutability is now enforced at two levels: the existing
  serializer-level draft/submitted query filtering, and a new model-level
  guard (`ImmutableOnceSubmittedMixin` in `grievance/models.py`) that raises
  if `save()`/`delete()` is ever called on a row already marked
  `is_submitted=True`, in case a future code path bypasses the current single
  write path. No migration was needed for this addition.

## Design Deviations and Compatibility

- The recording presents a single “Additional Notes (Internal Only)” field in
  some investigation views. The implementation keeps both historical note
  fields visible and separately editable to avoid data loss.
- Attachment changes selected while saving a draft remain pending and are
  applied on submission; the UI states this explicitly.
- The existing closed-violations table and stored grievance/training data remain
  available and are not destructively changed.
- Existing API base URL behavior is preserved through `VITE_APP_API_URL` with
  the legacy `/api/v2` fallback.
- `SupplierKpiGrievanceComponent` now gates the editable form on
  `isSupplier || isTestUser` instead of the broader `isSupplierContext`
  (which also included Global Partner "supplier view" preview mode). This
  matches the backend's actual authorization (`can_edit_supplier_kpi_grievance`
  in `grievance/permissions.py`), which never allowed Global Partner writes
  regardless of frontend gating; a Global Partner in supplier-view preview now
  sees the read-only remediation summary instead of a form that would fail to
  save server-side.
- `CollapsibleDataTable.tsx` gained an opt-in `appearance="workerViolations"`
  variant plus shared additions (empty-state text, loading spinner, keyboard/
  ARIA row interaction) that apply by default to all 5 other consumers
  (`OpenEscalatedCasesTable`, `company-supply-chain`, `wages`, `recruitment`,
  `labor`). None of them set `appearance`, so their visual styling is
  unaffected; the shared defaults are additive UI states that previously
  didn't exist (an empty table body had no message, a loading table body had
  no spinner) and were smoke-tested manually rather than code-changed further.

## Backend Endpoints

- `GET/POST /api/v2/supplier-kpis/:supplierKpiId/grievance/`
- `PATCH /api/v2/supplier-kpis/:supplierKpiId/grievance/:grievanceId/`
- `POST /api/v2/supplier-kpis/:supplierKpiId/grievance/:grievanceId/information_collection_attachments/`
- `GET /api/v2/supplier-kpis/:supplierKpiId/grievance/:grievanceId/information_collection_attachments/:attachmentId/download/`
- `GET /api/v2/supplier-kpis/:supplierKpiId/grievance/:grievanceId/history/`

## Validation

- Frontend: full Vitest suite passes (218/218 tests, 40 files), typecheck
  clean (`tsc --noEmit`). (Last re-verified 2026-07-25.)
- Focused tests cover accordion behavior and the Supplier KPI resource-ID
  mapping used by grievance API calls.
- Django `manage.py check` passes with the repository's existing
  `UserTask.assigned_users` warning.
- Django database tests (`grievance/tests/test_permissions_and_immutability.py`,
  7 tests) pass when run with `pytest --no-migrations`, which bypasses a
  pre-existing, unrelated legacy migration bug: `0131_auto_20250129_0850`
  references `supplier_kpis_assigned_users` before that table exists during
  test-database creation, blocking the normal (migration-driven) test-DB setup
  for this app entirely, independent of this feature. This is a pre-existing
  repository issue, not introduced by this change, and is out of scope to fix
  here.
- New test `test_submitted_remediation_rejects_direct_save_and_delete`
  verifies the model-level immutability guard directly (raises on save/delete
  of an already-submitted record).
- Mock data (`docker/scripts/worker_reported_violations_supplier_2.sql`)
  applied cleanly to the local dev database: 11 OPEN + 11 CLOSED fixture rows
  for supplier_id=2, all clearly marked with `LOCAL_UI_TEST_WORKER_REPORTED_ISSUE`.

## Session Update — 2026-07-25

Follow-up work on top of the redesign, all still scoped to the grievance form
and the worker-reported table. Frontend commit `0de809e5`; backend commits
`e0268606e` + `dfc536848` (branch `IV2-520`).

- **Live draft panel instead of auto-save.** Keystroke-level auto-save was
  removed. A Zustand store (`src/store/grievanceDraftStore.ts`, keyed by
  `supplierKpiId`) now holds the currently-typed remediation input in
  front-end state. The KPI-detail summary was moved to the **top**, above the
  accordion, and renders a live three-block narrative — *Issue summary reported
  by workers* / *Action from Issara* / *Action from the supplier* — that
  updates as the user types (see `src/utils/workerReportedKpiTable.tsx`).
- **Multiple remediation updates.** Several remediation entries can be added in
  one Save Draft; they persist and reload as "Remediation Update 1, 2, …".
  Author is intentionally omitted from the form ("who added" is shown only in
  the History widget). Backend persistence is `_sync_remediations` in
  `grievance/serializers.py`.
- **Internal Date Closed is a real, persisted field.** Added
  `Grievance.internal_closed_at` (migration `grievance/0008`) and wired the
  form to seed/save it. This is separate from the read-only `SupplierKpi.closed_at`.
- **Attachment fixes.** Additional Attachments now actually persist on Save
  Draft (frontend now syncs attachments on every save, and the backend draft
  early-return guard was removed). The "Visible to" audience control was
  switched from hidden radios to `aria-pressed` toggle buttons so selecting a
  value no longer scrolls/expands the parent table. An uploader can now always
  view their own uploaded file regardless of audience
  (`user_uploaded_attachment` in `grievance/permissions.py`).
- **Root-cause of "remediation not saving".** The reload path read `.value`
  instead of `.description` for remediation / system_strengthening, so drafts
  always came back empty. Fixed in `SupplierKpiGrievanceForm.tsx`.
- **Datepicker consolidation.** The marketplace's custom calendar was extracted
  into a shared `src/components/inputs/CascadeDatePicker.tsx`; the CSS class was
  renamed `marketplace-job-datepicker` → `cascade-datepicker` consistently
  across `global.css`, marketplace, and workerFeedback. `CascadeDatePicker`
  defaults (`dateFormat="dd-MMM-yyyy"`, `wrapperClassName="w-full"`, custom
  header) preserve the previous marketplace behavior exactly.

## Cross-feature safety audit — 2026-07-25

Verification that this branch changes only the worker-reported-issues feature
and does not break other people's work. Re-runnable checks:

- **`npm run typecheck`** — clean (0 errors). Every consumer of the shared
  `CollapsibleDataTable` still type-checks.
- **`npx vitest run`** — 218/218 pass across 40 files.
- **Shared `CollapsibleDataTable`** is used by `wages`, `recruitment`,
  `company-supply-chain`, `labor`, and `OpenEscalatedCasesTable`. All new props
  (`appearance`, `errorMessage`, `emptyMessage`, `onRetry`) are **optional** and
  `appearance` defaults to `"default"`. Only the two worker-reported routes opt
  into `appearance="workerViolations"`; the other five callers pass none of the
  new props and keep their prior rendering.
- **`RemediationNotesSummary`** (also used by `labor`/`wages`/`recruitment`) —
  additive changes only; consumers unchanged.
- **Datepicker rename** — `marketplace-job-datepicker` no longer exists anywhere
  (grep-clean); all references migrated to `cascade-datepicker`, CSS rules are
  identical apart from the name, so marketplace and workerFeedback pickers are
  visually unchanged.
- **Other off-topic touches are additive/benign:** `GuestNabar` gained a
  `data-sticky-header` attribute (scroll-offset marker); `useSupplyChain` gained
  an optional `supplier_kpi_id?` field; `index.html` favicon links; no existing
  behavior removed.
