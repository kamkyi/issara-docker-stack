from django.utils.translation import ugettext_lazy as _

KPI_LEVEL_CHOICES = (
    (1, "1"),
    (2, "2"),
    (3, "3"),
    (4, "4"),
    (5, "5"),
)

# Note: Okay was deliberately removed.
KPI_UPDATE_CLOSED_QUALITY_CHOICES = (
    ("Poor", "Poor"),
    ("Fair", "Fair"),
    ("Good", "Good"),
    ("Excellent", "Excellent"),
)

KPI_UPDATE_SOURCE_CHOICES = (
    ("supplierkpiupdateform", "supplierkpiupdateform"),
    ("caseupdate", "caseupdate"),
)

KPI_UPDATE_PROGRESS_CHOICES = (
    ("None", "None"),
    ("A little", "A little"),
    ("A lot", "A lot"),
)

TASK_SOURCE_TYPE = (
    ("Call", "Call"),
    ("Business Response", "Business Response"),
    ("KPI UPDATE", "KPI UPDATE"),
)

SHARED_FILE_TYPES = (
    ("NF", "FlagIcon"),
    ("SP", "Strategic Partner"),
    ("RA", "Recruitment Agency"),
    ("S", "Supplier"),
    ("SR", "Supplier Reports"),
    ("IS", "Issara Staff"),
    ("O", "Other"),
    ("SPW", "Strategic Partner Workplan"),
    ("SVA", "Supplier Video Attachment"),
    ("SPA", "Supplier Photo Attachment"),
)

SHARED_FILE_PERMISSION_BOTH = "Both"
SHARED_FILE_PERMISSION_SUPPLIER = "Supplier Only"
SHARED_FILE_PERMISSION_SUPPLIER_ISSARA = "Supplier + Issara"
SHARED_FILE_PERMISSION_SP = "SP Only"
SHARED_FILE_PERMISSIONS = (
    (SHARED_FILE_PERMISSION_BOTH, "Both"),
    (SHARED_FILE_PERMISSION_SUPPLIER, "Supplier Only"),
    (
        SHARED_FILE_PERMISSION_SUPPLIER_ISSARA,
        "Supplier + Issara",
    ),
    (SHARED_FILE_PERMISSION_SP, "SP Only"),
)

SPWORKPLAN_FP_TITLES = (
    ("mr", "Mr"),
    ("mrs", "Mrs"),
    ("ms", "Ms"),
    ("others", "Others"),
)

SPWORKPLAN_STEPS = (
    ("introduction", "Introduction"),
    ("doc_submission", "Document Submission"),
    ("main_goals", "Main Goals and Priority Partnership Areas"),
    ("progress_indicators", "Progress Indicators"),
    ("workplan_activities", "Priority Workplan Activities"),
    ("finalization", "Review and Finalize Annual Workplan"),
)

SPWORKPLAN_STATUSES = (
    ("confirmed", "Confirmed"),
    ("saved", "Saved"),
)

SPWORKPLAN_DOCUMENT_TYPES = (
    ("supply_chain", "Supply Chain"),
    ("human_rights", "Human Rights"),
    ("migrant_worker_policy", "Migrant Worker Policy"),
    ("ethical_recruitment", "Ethical Recruitment"),
    ("worker_voice", "Worker Voice"),
    ("audit_reports", "Audit Reports"),
    ("others", "Others"),
)

SPWORKPLAN_ACTIVITY_AREAS = (
    ("worker_voice", _("Worker Voice")),
    ("labour_recruitment", _("Labour Recruitment")),
    ("working_conditions", _("Working Conditions")),
)

SPWORKPLAN_PROGRESS_ACTIVITY_AREAS = SPWORKPLAN_ACTIVITY_AREAS + (
    ("notes_and_remarks", _("Notes and Remarks")),
)

SPWORKPLAN_ACTIVITY_PRIORITY = (
    ("not_priority", "Not Priority"),
    ("priority", "Priority"),
)

SPWORKPLAN_ACTIVITY_PRIORITY_STATUS = (
    ("not_started", "Not Started"),
    ("in_progress", "In Progress"),
    ("complete", "Complete"),
)


EMAIL_RECEIVING_PREFERENCE = (
    ("direct", "Direct"),
    ("cc", "CC"),
    ("bcc", "BCC"),
)

GRAY = "Gray"
YELLOW = "Yellow"
GREEN = "Green"

SUPPLIER_PROGRESSS_CHOICES = (
    (GRAY, "Not yet initiated"),
    (YELLOW, "Partial progress"),
    (GREEN, "Completed/ongoing"),
)

SUPPLIER_ACTIVITY_CHOICES = (
    ("not yet", "Not yet initiated"),
    ("partial progress", "Partial progress"),
    ("completed", "Completed/ongoing"),
)

REASON_CHOICE = (
    ("add", "Add"),
    ("change", "Change"),
    ("deleted", "Deleted"),
)

PROGRESS_ACTIVITY_STATUS = (
    ("not yet", "Not yet"),
    ("partial progress", "Partial progress"),
    ("completed", "Completed"),
)


# --------------------------------------------------------------------------
# CSO organization profile (CSO UI v1)
#
# Stored as stable string keys rather than lookup-table rows: the vocabularies
# are fixed by Issara, never edited at runtime, and the CSO UI renders them
# through its own i18n layer keyed on these same values. Keeping the key in the
# column avoids seeded IDs drifting between local/staging/prod.
# --------------------------------------------------------------------------

ORGANIZATION_TYPE_CHOICES = (
    ("international_ngo", "International NGO"),
    ("national_ngo", "National NGO"),
    ("regional_cso", "Regional CSO"),
    ("grassroots_cbo", "Grassroots / Community-based organization"),
    ("academic_research", "Academic / Research Institution"),
    ("other", "Other"),
)

ORGANIZATION_CORE_FOCUS_AREA_CHOICES = (
    ("human_rights", "Human rights"),
    ("forced_labor", "Forced labor"),
    ("ethical_recruitment", "Ethical / responsible recruitment"),
    ("responsible_sourcing", "Responsible sourcing"),
    ("gender", "Gender"),
    ("living_wage", "Living wage"),
    ("climate_resilience", "Climate resilience"),
)

ORGANIZATION_STAKEHOLDER_GROUP_CHOICES = (
    ("cross_border_migrant_workers", "Cross-border migrant workers"),
    ("internal_migrant_workers", "Internal migrant workers"),
    ("informal_sector_workers", "Informal sector workers"),
    ("women_workers", "Women workers"),
    ("indigenous_ethnic_minority_workers", "Indigenous & ethnic minority workers"),
    ("factory_personnel", "Factory personnel"),
    ("worker_committees", "Worker committees"),
    ("general_workers", "General workers"),
)
