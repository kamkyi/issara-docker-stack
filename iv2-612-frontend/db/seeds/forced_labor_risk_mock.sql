-- =============================================================================
--  Mock data: FORCED LABOR RISK → "Open Worker-reported Violations"
--  Target DB: ilm_2  (container: ilm-database-2, MySQL 8.0)
--
--  Import:
--    docker exec -i ilm-database-2 mysql -uroot -ppassword ilm_2 \
--      < db/seeds/forced_labor_risk_mock.sql
--
--  Then hard-refresh /worker-reported-issues. The rows land in the FORCED
--  LABOR RISK open table (the front end classifies a row as forced-labor risk
--  purely by KPI level: 3 or 4 — see isForcedLaborRisk in
--  src/utils/workerReportedKpiTable.tsx).
--
--  Re-runnable: everything is keyed to a fixed id block (see below) which is
--  deleted at the top, so importing twice leaves exactly one copy.
--
--  ---------------------------------------------------------------------------
--  Why each table is needed (mirrors cascade-api
--  src/services/legacyLaborService.ts getSupplierKpis, which is what
--  GET /legacy-labor/supplierkpis runs):
--
--   1. supplier_kpis         the case itself. Needs status_id IN (1,2) = open,
--                            a level 3/4 kpi_id, opened_at inside the page's
--                            date range (default: last 12 months), hide = 0.
--   2. supplier_kpi_updates  the API reads the LATEST update per KPI, matched
--                            with `sku.status_id = sk.status_id`. Without a
--                            row whose status_id equals the parent's, the case
--                            is invisible no matter what supplier_kpis says.
--                            Affected workers + remediation text come from here.
--   3. cases + cases_kpis    the page sends has_cases=true, which becomes
--                            EXISTS (cases c JOIN cases_kpis ck ...) on the
--                            same supplier_id + kpi_id. No case row → no row.
--   4. kpi_ilo_mapping       optional; fills the "ILO Indicator" column.
--
--  Id block: 990001+ for supplier_kpis / supplier_kpi_updates / cases_kpis,
--  9900001+ for cases. Well clear of live data (max ids at authoring time:
--  supplier_kpis 2670, supplier_kpi_updates 6119, cases 68463, cases_kpis
--  14185) and it makes cleanup exact.
-- =============================================================================

SET NAMES utf8mb4;
SET @seed_lo := 990001;
SET @seed_hi := 990099;
SET @case_lo := 9900001;
SET @case_hi := 9900099;

-- ── 0. Clean any previous import of this seed ────────────────────────────────
DELETE FROM cases_kpis           WHERE id BETWEEN @seed_lo AND @seed_hi;
DELETE FROM cases                WHERE id BETWEEN @case_lo AND @case_hi;
DELETE FROM supplier_kpi_updates WHERE id BETWEEN @seed_lo AND @seed_hi;
DELETE FROM supplier_kpis        WHERE id BETWEEN @seed_lo AND @seed_hi;

-- ── 1. Supply-chain membership (OPTIONAL — comment out if not wanted) ────────
--  The page only queries suppliers that belong to the selected supply chain.
--  Chain 29 ("SP Test buyer - BeneBuyer", strategic_partner_id 28) is the one
--  the front end's test/mock fixtures use, and it ships with no suppliers
--  attached locally. These four suppliers are the same ones the JSON mock uses.
INSERT INTO supply_chains_suppliers (supplychain_id, supplier_id)
SELECT 29, s.id
FROM suppliers s
WHERE s.id IN (394, 178, 227, 1110)
  AND NOT EXISTS (
    SELECT 1 FROM supply_chains_suppliers x
    WHERE x.supplychain_id = 29 AND x.supplier_id = s.id
  );

-- ── 2. The cases (six open forced-labor violations) ─────────────────────────
--  opened_at is expressed as "N days ago" so the rows stay inside the default
--  12-month filter and keep their status colour whenever you re-import:
--     status_id 1 = No Progress, 2 = Some Progress
--     <15d green · 16-59d amber · 31-59d No Progress purple · 60+ red/amber
--  Levels: 3 = forced-labor risk, 4 = severe (both land in the same table).
INSERT INTO supplier_kpis
  (id, supplier_id, kpi_id, status_id, open, opened_at, closed_at, hide,
   affected_workers, kpi_update_source, remediation_notes, remediation_action,
   remediation_validation, remediation_results, remediation_sp_recommendation,
   remediation_documents_owed, remediation_documents_provided,
   remediation_owed_baht, remediation_owed_kyat, remediation_owed_ringitt,
   remediation_owed_usd, remediation_paid_baht, remediation_paid_kyat,
   remediation_paid_ringitt, remediation_paid_usd, remediation_workers_paid,
   issue_escalated_to_buyer)
VALUES
  -- 1. Debt bondage · Fish Seafood Co. · 8 days · No Progress (green, <15d)
  (990001, 178, 9, 1, 1, DATE_SUB(CURDATE(), INTERVAL 8 DAY), NULL, 0,
   24, 'Worker Voice', 'Workers report recruitment debts deducted at source.',
   'Issara raised the case with HR; debt schedule requested.',
   NULL, NULL, 'Suspend deductions pending review.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),

  -- 2. Threats by broker · Sunshine Seafood · 22 days · Some Progress (amber)
  (990002, 227, 2, 2, 1, DATE_SUB(CURDATE(), INTERVAL 22 DAY), NULL, 0,
   12, 'Worker Voice', 'Broker threatened workers who asked about wage slips.',
   'Employer agreed to end the broker contract.',
   'Worker interviews scheduled for next visit.', NULL,
   'Terminate broker agreement and communicate to all workers.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),

  -- 3. Deceptive job information · Crabby Seafoods · 41 days · No Progress (purple)
  (990003, 394, 16, 1, 1, DATE_SUB(CURDATE(), INTERVAL 41 DAY), NULL, 0,
   65, 'Worker Voice',
   'Job scope and pay differ materially from what was promised at recruitment.',
   NULL, NULL, NULL, 'Re-issue contracts in workers native language.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),

  -- 4. Pay documents withheld · Very Huge Electronics Co. · 74 days · Some Progress (amber, 60+)
  (990004, 1110, 21, 2, 1, DATE_SUB(CURDATE(), INTERVAL 74 DAY), NULL, 0,
   130, 'Worker Voice',
   'Payslips not provided; workers cannot verify overtime calculations.',
   'Payroll system being reconfigured to print bilingual payslips.',
   NULL, NULL, 'Provide 3 months of back payslips to all affected workers.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),

  -- 5. Child labour (level 4) · Fish Seafood Co. · 97 days · No Progress (red, 60+)
  (990005, 178, 34, 1, 1, DATE_SUB(CURDATE(), INTERVAL 97 DAY), NULL, 0,
   3, 'Worker Voice',
   'Age verification gaps found for three workers in the packing line.',
   NULL, NULL, NULL,
   'Independent age-verification audit and remediation plan required.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),

  -- 6. Trafficking / online scamming (level 4) · Sunshine Seafood · 5 days · Some Progress (green, <15d)
  (990006, 227, 92, 2, 1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL, 0,
   9, 'Worker Voice',
   'Two workers recruited through an online scam route; passports held.',
   'Passports returned; workers moved to safe accommodation.',
   'Issara case worker confirmed with the workers directly.', NULL,
   'Immediate safeguarding review of all recruitment channels.',
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

-- ── 3. Latest update per case (status_id MUST match supplier_kpis.status_id) ──
--  opened_at / closed_at are copied onto the update row on purpose: the API's
--  date filter (opened_at_range_after / _before, which the page always sends —
--  default last 12 months) is applied to supplier_kpi_updates.opened_at, NOT to
--  supplier_kpis.opened_at. Leave it NULL and the case is silently filtered out
--  even though every other condition matches.
INSERT INTO supplier_kpi_updates
  (id, supplier_kpi_id, status_id, overview_date, opened_at, closed_at,
   affected_workers, kpi_update_source, closed_quality, closed_notes,
   remediation_notes, remediation_action, remediation_validation,
   remediation_results, remediation_sp_recommendation,
   remediation_documents_owed, remediation_documents_provided,
   remediation_owed_baht, remediation_owed_kyat, remediation_owed_ringitt,
   remediation_owed_usd, remediation_paid_baht, remediation_paid_kyat,
   remediation_paid_ringitt, remediation_paid_usd, remediation_workers_paid,
   issue_escalated_to_buyer)
SELECT
  sk.id, sk.id, sk.status_id, CURDATE(), sk.opened_at, sk.closed_at,
  sk.affected_workers, sk.kpi_update_source, NULL, NULL, sk.remediation_notes,
  sk.remediation_action, sk.remediation_validation, sk.remediation_results,
  sk.remediation_sp_recommendation, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  sk.issue_escalated_to_buyer
FROM supplier_kpis sk
WHERE sk.id BETWEEN @seed_lo AND @seed_hi;

-- ── 4. Cases, so has_cases=true matches ─────────────────────────────────────
INSERT INTO cases (id, created, last_modified, supplier_id, description)
SELECT
  @case_lo + (sk.id - @seed_lo), CURDATE(), CURDATE(), sk.supplier_id,
  CONCAT('[MOCK] Worker-reported forced-labor risk, KPI ', sk.kpi_id)
FROM supplier_kpis sk
WHERE sk.id BETWEEN @seed_lo AND @seed_hi;

INSERT INTO cases_kpis (id, case_id, kpi_id)
SELECT sk.id, @case_lo + (sk.id - @seed_lo), sk.kpi_id
FROM supplier_kpis sk
WHERE sk.id BETWEEN @seed_lo AND @seed_hi;

-- ── 5. ILO indicators for the "ILO Indicator" column (OPTIONAL) ──────────────
--  Every seeded KPI already maps to indicator 5 only. Adding indicator 2
--  ("Forced Labour Prevention") makes the column read sensibly for these rows.
--  Note this edits shared KPI reference data, not just the seeded cases.
INSERT INTO kpi_ilo_mapping (kpi_id, ilo_id)
SELECT DISTINCT sk.kpi_id, 2
FROM supplier_kpis sk
WHERE sk.id BETWEEN @seed_lo AND @seed_hi
  AND NOT EXISTS (
    SELECT 1 FROM kpi_ilo_mapping m
    WHERE m.kpi_id = sk.kpi_id AND m.ilo_id = 2
  );

-- ── 6. Verify ───────────────────────────────────────────────────────────────
SELECT sk.id, s.name AS supplier, k.level, kc.name AS category,
       LEFT(k.description, 45) AS kpi, st.name AS status,
       sk.opened_at, DATEDIFF(CURDATE(), sk.opened_at) AS days_active,
       sk.affected_workers
FROM supplier_kpis sk
JOIN suppliers s  ON s.id  = sk.supplier_id
JOIN kpis k       ON k.id  = sk.kpi_id
JOIN kpi_categories kc ON kc.id = k.kpi_category_id
JOIN supplier_kpi_update_statuses st ON st.id = sk.status_id
WHERE sk.id BETWEEN @seed_lo AND @seed_hi
ORDER BY sk.id;

-- =============================================================================
--  Removing this seed again:
--
--    DELETE FROM cases_kpis           WHERE id BETWEEN 990001 AND 990099;
--    DELETE FROM cases                WHERE id BETWEEN 9900001 AND 9900099;
--    DELETE FROM supplier_kpi_updates WHERE id BETWEEN 990001 AND 990099;
--    DELETE FROM supplier_kpis        WHERE id BETWEEN 990001 AND 990099;
--    -- and, if you ran section 1 / 5:
--    -- DELETE FROM supply_chains_suppliers
--    --   WHERE supplychain_id = 29 AND supplier_id IN (394,178,227,1110);
--    -- DELETE FROM kpi_ilo_mapping WHERE ilo_id = 2 AND kpi_id IN (2,9,16,21,34,92);
-- =============================================================================
