"""Telling a partner organization that a Worker Voice call was referred to it.

Step 5 of the CSO Worker Voice form can hand a call to another partner
organization (`cases.refer_to_org`). That referral is the whole point of the
field: the receiving organization gets read access to the call and a follow-up
task, and this is what tells them it is there.

The mail carries the same case detail the legacy referral mail carries -- the
KPIs recorded on the call, each with its description and level, rendered by the
very filter the legacy mail renders them with
(`referral_kpi_email_replace_tokens`) from the same admin-managed
`KpiEmailNotificationTemplate(type="OZ")` body. What differs is the wrapper:
Cascade referrals go out in their own template, badged as coming from ILM
Cascade, so a coordinator reading their inbox can tell at a glance which system
raised the referral.

Nothing here writes to the legacy path. `org_cso_user_email` in
`issara.ilm_server_2.views` keeps rendering `emails/kpi_referral_org.html`
exactly as it did; this module only reads the same template row, and reads it
defensively -- no migration seeds the `OZ` row, so an unseeded install (which
would make the legacy path raise) still gets a complete Cascade mail from
`DEFAULT_BODY`.

The mail deliberately carries no worker PII -- no nickname, no contact details,
no issue narrative. Referral email lands in ordinary inboxes, while the call
itself sits behind a login that already scopes it to the receiving
organization, so the mail says a referral is waiting, which KPIs it is about,
and where to read the rest.
"""

import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from issara.ilm_server_2.utils import EmailMailgun
from kpis.models import KpiEmailNotificationTemplate

logger = logging.getLogger(__name__)

# Named in the subject, the header and the footer. The receiving organization
# also gets legacy referral mail from the old CSO screens, and the two arrive
# in the same inbox about the same kind of thing.
SOURCE_LABEL = "ILM Cascade"

SUBJECT = (
    f"[{SOURCE_LABEL}] A worker voice call has been referred to your organization"
)

# The body of the mail when no `KpiEmailNotificationTemplate(type="OZ")` row has
# been written. It uses the same tokens the admin-managed body uses and is
# expanded by the same filter, so a seeded install and an unseeded one differ in
# wording only -- never in whether the KPI detail is there. The KPI half is left
# off a call that records none, rather than heading an empty list.
DEFAULT_BODY = "{{case_org}} has referred a worker voice call to {{org_referred}}."
DEFAULT_BODY_KPIS = "\n\nThe KPIs recorded on the call are:\n\n{{kpis}}"


def referral_recipients(organization):
    """Deliverable addresses for every active user of an organization."""
    return list(
        User.objects.filter(
            organization_user__organization_id=organization.id,
            is_active=True,
        )
        .exclude(email__isnull=True)
        .exclude(email__exact="")
        .values_list("email", flat=True)
        .distinct()
    )


def referral_kpis(case):
    """The call's Supplier KPIs in the shape the legacy token reads.

    The notification must identify the actionable ``supplier_kpis`` records,
    not the raw KPI catalogue rows selected on step 4. A case can contain both
    relations, and including ``cases.kpis`` here produces two entries for the
    same issue with different IDs. The receiving team uses the Supplier KPI ID
    to find the issue on ILM's KPI Updates page.
    """
    return list(case.supplier_kpis.select_related("kpi").all())


def referral_body(kpis):
    """The admin-managed `OZ` body the legacy mail uses, or ours.

    Read with `filter(...).first()` rather than `get`, because no migration
    seeds the row: the legacy path breaks without it, and a referral going
    unannounced is not an acceptable way for Cascade to inherit that.
    """
    template = KpiEmailNotificationTemplate.objects.filter(type="OZ").first()
    if template and template.text:
        return template.text
    return DEFAULT_BODY + (DEFAULT_BODY_KPIS if kpis else "")


def referral_context(case, referred_by):
    """What the mail says: who referred what, which KPIs, and where to read it.

    Every lookup is read defensively -- `cases` is the shared legacy table and
    almost all of it is nullable, and a missing label must not cost the
    receiving organization its notification. The organization names are kept as
    strings for the same reason the legacy filter needs them to be: it
    `str.replace`s them into the body, so `None` there would raise.
    """
    case_org = ""
    creator = case.case_created_by
    if creator is not None:
        link = getattr(creator, "organization_user", None)
        if link is not None:
            case_org = link.organization.name

    kpis = referral_kpis(case)

    return {
        # The three tokens `referral_kpi_email_replace_tokens` expands.
        "kpis": kpis,
        "org_referred": case.refer_to_org.name if case.refer_to_org else "",
        "case_org": case_org,
        "body_text": referral_body(kpis),
        "source_label": SOURCE_LABEL,
        "case_id": case.pk,
        "referred_by": (
            f"{referred_by.first_name} {referred_by.last_name}".strip()
            or referred_by.username
            or referred_by.email
            if referred_by is not None
            else None
        ),
        "interacted": case.interacted.date() if case.interacted else None,
        "referral_action": (
            case.referral_action.name if case.referral_action else None
        ),
        # FRONTEND_URL is the ILM frontend. Link to the page that owns the
        # Supplier KPI IDs shown in this message instead of Team Tasks, where a
        # referred case cannot be found.
        "case_url": (
            f"{settings.FRONTEND_URL.rstrip('/')}/admin/businesskpiupdates"
        ),
    }


def notify_referral_organization(case, referred_by=None):
    """Email the receiving organization that a call was referred to it.

    Never raises: a mail server that is down, unreachable or unconfigured must
    not fail the save that the officer just made, and the referral itself is
    already recorded on the case. Returns the addresses written to, so the
    caller and the tests can see what happened.
    """
    if case.refer_to_org is None:
        return []

    try:
        recipients = referral_recipients(case.refer_to_org)
        if not recipients:
            logger.info(
                "Worker voice case %s referred to organization %s, which has "
                "no user with an email address; nothing sent.",
                case.pk,
                case.refer_to_org_id,
            )
            return []

        html_message = render_to_string(
            "emails/worker_voice_referral.html",
            {"context": referral_context(case, referred_by)},
        )
        EmailMailgun().send_email(
            {
                "to": recipients,
                "subject": SUBJECT,
                "text": strip_tags(html_message),
                "html": html_message,
            }
        )
        return recipients
    except Exception:
        logger.exception(
            "Could not email organization %s about the worker voice referral "
            "on case %s.",
            case.refer_to_org_id,
            case.pk,
        )
        return []
