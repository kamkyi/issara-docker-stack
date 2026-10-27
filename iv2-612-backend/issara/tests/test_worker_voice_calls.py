"""Tests for the CSO Worker Voice call endpoint (IV2-582)."""

from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.forms.models import model_to_dict
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate

from issara.cascade.views import (
    InteractionChannelListAPIView,
    UserListAPIView,
    WorkerVoiceCaseDetailAPIView,
    WorkerVoiceCaseListCreateAPIView,
)
from issara.cascade.views.worker_voice_calls import (
    REFERRAL_TO_PARTNER_ORG_ACTION_ID,
)
from issara.cascade.worker_voice_referral import (
    SOURCE_LABEL,
    notify_referral_organization,
)

# The view reaches the notifier through its own module namespace, so that is
# where it is patched; the notifier's own tests patch the mail client instead.
NOTIFY = "issara.cascade.views.worker_voice_calls.notify_referral_organization"
MAILGUN = "issara.cascade.worker_voice_referral.EmailMailgun"
from issara.ilm_server_2.models import (
    Case,
    ClientType,
    ContractType,
    Country,
    District,
    InteractionChannel,
    InteractionReason,
    CaseStatus,
    Nationality,
    Organization,
    Province,
    ReferralAction,
    SharedFile,
    Supplier,
    SupplierUser,
    UserOrganization,
    UserTask,
)
from kpis.models import (
    Kpi,
    KpiEmailNotificationTemplate,
    KpiTranslation,
    SupplierKpi,
)
from issara.ilm_server_2.models import Language


class WorkerVoiceCaseTestBase(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Partner CSO")
        self.other_organization = Organization.objects.create(name="Other CSO")

        self.user = User.objects.create(username="officer", email="o@cso.org")
        UserOrganization.objects.create(
            user=self.user, organization=self.organization
        )
        self.other_user = User.objects.create(username="rival", email="r@other.org")
        UserOrganization.objects.create(
            user=self.other_user, organization=self.other_organization
        )

        self.nationality = Nationality.objects.create(name="Nepali")
        self.reason = InteractionReason.objects.create(
            name="Coordination with organization", cso_only=True
        )
        self.channel = InteractionChannel.objects.create(
            name="Reported In-person", cso_only=True
        )
        self.client_type = ClientType.objects.create(
            name="Returnee - former worker, exploited", cso_only=True
        )
        self.contract_type = ContractType.objects.create(name="Daily Worker")
        self.country = Country.objects.create(name="Nepal")

        self.factory = APIRequestFactory()

    def payload(self, **overrides):
        data = {
            "client_nationality": self.nationality.id,
            "interaction_reason": self.reason.id,
            "interaction_issara_staff": self.user.id,
            "interaction_channel": self.channel.id,
            "first_time_contacting_issara": "Yes",
            "client_type": self.client_type.id,
            # The form posts a bare date -- see the interacted tests below.
            "interacted": "2026-08-28",
            "interaction_summary": "New case. Unpaid overtime reported.",
            "client_origin_country": self.country.id,
            "client_time_at_job": 14,
            "client_contract_type": self.contract_type.id,
            "issue_workers_affected": 1,
        }
        data.update(overrides)
        return data

    def post(self, data, user=None, format="json"):
        request = self.factory.post(
            reverse("cascade-worker-voice-calls"), data, format=format
        )
        force_authenticate(request, user=user or self.user)
        return WorkerVoiceCaseListCreateAPIView.as_view()(request)

    def get_list(self, user=None, **params):
        request = self.factory.get(
            reverse("cascade-worker-voice-calls"), params
        )
        force_authenticate(request, user=user or self.user)
        return WorkerVoiceCaseListCreateAPIView.as_view()(request)

    def get_detail(self, case_id, user=None):
        request = self.factory.get(
            reverse("cascade-worker-voice-call-detail", args=[case_id])
        )
        force_authenticate(request, user=user or self.user)
        return WorkerVoiceCaseDetailAPIView.as_view()(request, pk=case_id)

    def patch_case(self, case_id, data, user=None, format="json"):
        request = self.factory.patch(
            reverse("cascade-worker-voice-call-detail", args=[case_id]),
            data,
            format=format,
        )
        force_authenticate(request, user=user or self.user)
        return WorkerVoiceCaseDetailAPIView.as_view()(request, pk=case_id)

    def delete_case(self, case_id, user=None):
        request = self.factory.delete(
            reverse("cascade-worker-voice-call-detail", args=[case_id])
        )
        force_authenticate(request, user=user or self.user)
        return WorkerVoiceCaseDetailAPIView.as_view()(request, pk=case_id)


class WorkerVoiceCaseCreateTests(WorkerVoiceCaseTestBase):
    def test_logs_a_call_against_the_callers_organization(self):
        response = self.post(self.payload())

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.case_created_by, self.user)
        self.assertEqual(
            case.interaction_summary, "New case. Unpaid overtime reported."
        )
        self.assertEqual(case.client_time_at_job, 14)

    def test_interacted_accepts_the_date_the_form_collects(self):
        # `cases.interacted` is a DateTimeField, but step 1 asks for a date.
        response = self.post(self.payload(interacted="2026-08-27"))

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.interacted.date().isoformat(), "2026-08-27")
        # Read back as a date so re-opening the call refills the date picker.
        self.assertEqual(response.data["interacted"], "2026-08-27")

    def test_interacted_still_accepts_a_full_timestamp(self):
        response = self.post(self.payload(interacted="2026-08-27T09:30:00Z"))

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.interacted.hour, 9)

    def test_case_created_by_cannot_be_set_from_the_payload(self):
        """Ownership is what scopes a case, so it must never be client-supplied."""
        response = self.post(self.payload(case_created_by=self.other_user.id))

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.case_created_by, self.user)

    def test_new_worker_voice_columns_round_trip(self):
        response = self.post(
            self.payload(
                client_zalo_account="+84 90 000 0000",
                client_other_account="Signal - +66 81 000 0000",
                safeguards_remarks="Worker identity withheld from employer.",
                worker_identification_risk_level="HIGH",
            )
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.client_zalo_account, "+84 90 000 0000")
        self.assertEqual(case.client_other_account, "Signal - +66 81 000 0000")
        self.assertEqual(
            case.safeguards_remarks, "Worker identity withheld from employer."
        )
        self.assertEqual(case.worker_identification_risk_level, "HIGH")

    def test_required_form_fields_are_enforced(self):
        data = self.payload()
        del data["interaction_summary"]
        del data["client_nationality"]

        response = self.post(data)

        self.assertEqual(response.status_code, 400)
        self.assertIn("interaction_summary", response.data)
        self.assertIn("client_nationality", response.data)

    def test_the_number_of_workers_affected_is_required(self):
        # Asked for on both the add and the edit form, because a call with no
        # count cannot be totalled into the issue reporting it feeds.
        data = self.payload()
        del data["issue_workers_affected"]

        response = self.post(data)

        self.assertEqual(response.status_code, 400)
        self.assertIn("issue_workers_affected", response.data)

    def test_the_number_of_workers_affected_cannot_be_nulled_on_an_edit(self):
        case_id = self.post(self.payload()).data["id"]

        response = self.patch_case(case_id, {"issue_workers_affected": None})

        self.assertEqual(response.status_code, 400)
        self.assertIn("issue_workers_affected", response.data)
        self.assertEqual(
            Case.objects.get(pk=case_id).issue_workers_affected, 1
        )

    def test_user_without_an_organization_is_refused(self):
        orphan = User.objects.create(username="orphan", email="x@nowhere.org")

        response = self.post(self.payload(), user=orphan)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Case.objects.exists())


class WorkerVoiceReferralToOrgTests(WorkerVoiceCaseTestBase):
    """Step 5's partner referral: which organization the case was handed to.

    Picking "Referral information provided to the partner organization" is the
    only way a case leaves the logging organization -- `refer_to_org` is what
    the receiving org's users see the case through, and what their follow-up
    task is raised against -- so the two are saved and enforced together.
    """

    def setUp(self):
        super().setUp()
        self.partner_referral = ReferralAction.objects.create(
            pk=REFERRAL_TO_PARTNER_ORG_ACTION_ID,
            name="Referral information provided to the partner organization",
        )
        self.other_action = ReferralAction.objects.create(
            name="No referral made or information provided; none needed"
        )

    def test_partner_referral_stores_the_organization(self):
        response = self.post(
            self.payload(
                referral_action=self.partner_referral.id,
                refer_to_org=self.other_organization.id,
            )
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.refer_to_org, self.other_organization)
        self.assertEqual(
            response.data["refer_to_org_name"], self.other_organization.name
        )

    def test_partner_referral_without_an_organization_is_refused(self):
        response = self.post(
            self.payload(referral_action=self.partner_referral.id)
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("refer_to_org", response.data)
        self.assertFalse(Case.objects.exists())

    def test_other_referral_actions_do_not_need_an_organization(self):
        response = self.post(self.payload(referral_action=self.other_action.id))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(Case.objects.get(pk=response.data["id"]).refer_to_org)

    def test_edit_cannot_drop_the_organization_off_a_partner_referral(self):
        created = self.post(
            self.payload(
                referral_action=self.partner_referral.id,
                refer_to_org=self.other_organization.id,
            )
        )
        case_id = created.data["id"]

        response = self.patch_case(case_id, {"refer_to_org": None})

        self.assertEqual(response.status_code, 400)
        self.assertIn("refer_to_org", response.data)
        self.assertEqual(
            Case.objects.get(pk=case_id).refer_to_org, self.other_organization
        )

    def test_switching_away_from_the_partner_referral_clears_the_organization(self):
        """The form sends both fields together, so the pair stays consistent."""
        created = self.post(
            self.payload(
                referral_action=self.partner_referral.id,
                refer_to_org=self.other_organization.id,
            )
        )
        case_id = created.data["id"]

        response = self.patch_case(
            case_id,
            {"referral_action": self.other_action.id, "refer_to_org": None},
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(Case.objects.get(pk=case_id).refer_to_org)


class CommittedRequestMixin:
    """Run the request's `transaction.on_commit` callbacks.

    The referral email is queued with `on_commit` so nobody is told about a
    call that failed to save. A `TestCase` wraps each test in a transaction
    that never commits, so those callbacks would otherwise never run.
    """

    def post_committed(self, *args, **kwargs):
        with self.captureOnCommitCallbacks(execute=True):
            return self.post(*args, **kwargs)

    def patch_committed(self, *args, **kwargs):
        with self.captureOnCommitCallbacks(execute=True):
            return self.patch_case(*args, **kwargs)


class WorkerVoiceSharedReferralVisibilityTests(
    CommittedRequestMixin, WorkerVoiceCaseTestBase
):
    """What the receiving organization of a referral can see and do.

    A referral hands over the reading of a call so the receiving organization
    can act on it. It does not hand over the record: editing and deleting stay
    with the organization that logged it.
    """

    def setUp(self):
        super().setUp()
        self.partner_referral = ReferralAction.objects.create(
            pk=REFERRAL_TO_PARTNER_ORG_ACTION_ID,
            name="Referral information provided to the partner organization",
        )
        # Logged by `self.user`'s organization, referred to `other_organization`.
        with patch(NOTIFY) as notify:
            self.notify = notify
            created = self.post_committed(
                self.payload(
                    referral_action=self.partner_referral.id,
                    refer_to_org=self.other_organization.id,
                )
            )
        self.assertEqual(created.status_code, 201, created.data)
        self.shared_case_id = created.data["id"]

    def test_receiving_organization_sees_the_call_in_its_list(self):
        response = self.get_list(user=self.other_user)

        self.assertEqual(response.status_code, 200, response.data)
        ids = [row["id"] for row in response.data["results"]]
        self.assertIn(self.shared_case_id, ids)

    def test_shared_rows_name_the_organization_that_logged_the_call(self):
        response = self.get_list(user=self.other_user)

        row = next(
            r for r in response.data["results"] if r["id"] == self.shared_case_id
        )
        self.assertTrue(row["shared_with_my_organization"])
        self.assertEqual(row["owner_organization_name"], self.organization.name)

    def test_the_logging_organization_still_owns_its_own_row(self):
        response = self.get_list()

        row = next(
            r for r in response.data["results"] if r["id"] == self.shared_case_id
        )
        self.assertFalse(row["shared_with_my_organization"])

    def test_receiving_organization_can_read_the_call(self):
        response = self.get_detail(self.shared_case_id, user=self.other_user)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["shared_with_my_organization"])
        self.assertEqual(response.data["organization_name"], self.organization.name)

    def test_receiving_organization_cannot_edit_the_call(self):
        response = self.patch_case(
            self.shared_case_id,
            {"interaction_summary": "Rewritten by the receiving org."},
            user=self.other_user,
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            Case.objects.get(pk=self.shared_case_id).interaction_summary,
            "New case. Unpaid overtime reported.",
        )

    def test_receiving_organization_cannot_touch_the_referral(self):
        # Round four briefly allowed this and was reverted: a `Case` save runs
        # legacy signals that create, reopen and delete `SupplierKpi` rows when
        # the supplier or KPI set changes, and those belong to the logging
        # organization's supplier relationship.
        third_org = Organization.objects.create(name="Third CSO")

        for payload in (
            {"refer_to_org": third_org.id},
            {"refer_to_org": None},
            {"referral_action": None},
        ):
            response = self.patch_case(
                self.shared_case_id, payload, user=self.other_user
            )
            self.assertEqual(response.status_code, 403, payload)

        case = Case.objects.get(pk=self.shared_case_id)
        self.assertEqual(case.refer_to_org, self.other_organization)
        self.assertEqual(case.referral_action, self.partner_referral)

    def test_the_logging_organization_may_still_redirect_the_referral(self):
        third_org = Organization.objects.create(name="Third CSO")

        with patch(NOTIFY) as notify:
            response = self.patch_committed(
                self.shared_case_id, {"refer_to_org": third_org.id}
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            Case.objects.get(pk=self.shared_case_id).refer_to_org, third_org
        )
        notify.assert_called_once()

    def test_receiving_organization_cannot_delete_the_call(self):
        response = self.delete_case(self.shared_case_id, user=self.other_user)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Case.objects.filter(pk=self.shared_case_id).exists())

    def test_the_logging_organization_can_still_edit_and_delete(self):
        patched = self.patch_case(
            self.shared_case_id, {"final_remarks": "Handed over."}
        )
        self.assertEqual(patched.status_code, 200, patched.data)

        deleted = self.delete_case(self.shared_case_id)
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Case.objects.filter(pk=self.shared_case_id).exists())

    def test_an_unrelated_organization_still_sees_nothing(self):
        outsider_org = Organization.objects.create(name="Unrelated CSO")
        outsider = User.objects.create(username="outsider", email="u@third.org")
        UserOrganization.objects.create(user=outsider, organization=outsider_org)

        listed = self.get_list(user=outsider)
        self.assertEqual(listed.data["results"], [])

        detail = self.get_detail(self.shared_case_id, user=outsider)
        self.assertEqual(detail.status_code, 404)

    def test_scope_own_hides_the_calls_referred_to_us(self):
        response = self.get_list(user=self.other_user, scope="own")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["results"], [])

    def test_scope_shared_hides_the_calls_we_logged_ourselves(self):
        own = self.post(self.payload())
        self.assertEqual(own.status_code, 201, own.data)

        response = self.get_list(scope="shared")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["results"], [])

    def test_scope_shared_lists_what_was_referred_to_us(self):
        response = self.get_list(user=self.other_user, scope="shared")

        self.assertEqual(
            [row["id"] for row in response.data["results"]], [self.shared_case_id]
        )


class WorkerVoiceCaseWritePermissionMatrixTests(
    CommittedRequestMixin, WorkerVoiceCaseTestBase
):
    """Who may do what to a referred call, pinned in one place.

    Owning organization: view, edit, delete. Receiving organization: view only.
    Unrelated organization: nothing at all.

    Round four briefly gave the receiving organization edit rights and that was
    reverted, because a `Case` save runs legacy `post_save`/`m2m_changed`
    signals that create, reopen and *delete* `SupplierKpi` rows and their
    history when the supplier or the KPI set changes. Those rows belong to the
    supplier relationship the logging organization owns and feed other teams'
    dashboards, so view-only is the only rule under which one organization's
    edit cannot reach another's data by side effect. This class states the
    whole matrix so that cannot be widened without a test saying so.

    An unrelated organization is refused by the queryset rather than by the
    permission, so it gets a 404 and not a 403: it is not told that a call it
    has no business with exists at all.
    """

    def setUp(self):
        super().setUp()
        self.partner_referral = ReferralAction.objects.create(
            pk=REFERRAL_TO_PARTNER_ORG_ACTION_ID,
            name="Referral information provided to the partner organization",
        )
        # Logged by `self.organization`, referred to `self.other_organization`.
        with patch(NOTIFY):
            created = self.post_committed(
                self.payload(
                    referral_action=self.partner_referral.id,
                    refer_to_org=self.other_organization.id,
                )
            )
        self.assertEqual(created.status_code, 201, created.data)
        self.case_id = created.data["id"]

        # A third organization, party to nothing.
        self.outsider_organization = Organization.objects.create(name="Third CSO")
        self.outsider = User.objects.create(
            username="outsider", email="out@third.org"
        )
        UserOrganization.objects.create(
            user=self.outsider, organization=self.outsider_organization
        )

    def summary_of(self):
        return Case.objects.get(pk=self.case_id).interaction_summary

    # --- the owner keeps everything -------------------------------------

    def test_the_owning_organization_can_edit(self):
        response = self.patch_case(
            self.case_id, {"interaction_summary": "Owner edit."}
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.summary_of(), "Owner edit.")

    def test_the_owning_organization_can_delete(self):
        response = self.delete_case(self.case_id)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Case.objects.filter(pk=self.case_id).exists())

    # --- the receiving organization may read it and nothing else --------

    def test_the_receiving_organization_can_read(self):
        response = self.get_detail(self.case_id, user=self.other_user)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["shared_with_my_organization"])

    def test_the_receiving_organization_cannot_edit(self):
        response = self.patch_case(
            self.case_id,
            {"interaction_summary": "Receiver edit."},
            user=self.other_user,
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.summary_of(), "New case. Unpaid overtime reported.")

    def test_the_receiving_organization_cannot_delete(self):
        response = self.delete_case(self.case_id, user=self.other_user)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Case.objects.filter(pk=self.case_id).exists())

    def test_the_receiving_organization_cannot_change_refer_to_org(self):
        response = self.patch_case(
            self.case_id,
            {"refer_to_org": self.outsider_organization.id},
            user=self.other_user,
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            Case.objects.get(pk=self.case_id).refer_to_org,
            self.other_organization,
        )

    def test_the_receiving_organization_cannot_clear_refer_to_org(self):
        response = self.patch_case(
            self.case_id, {"refer_to_org": None}, user=self.other_user
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            Case.objects.get(pk=self.case_id).refer_to_org,
            self.other_organization,
        )

    def test_no_write_by_the_receiving_organization_reaches_supplier_data(self):
        """The reason the revert happened, stated as a test.

        A save would run the legacy signals over `supplier` and `kpis`. None of
        these requests saves, so none of them can reach a `SupplierKpi` row.
        """
        case = Case.objects.get(pk=self.case_id)
        before = model_to_dict(case)
        kpis_before = sorted(case.kpis.values_list("id", flat=True))
        supplier_kpis_before = sorted(case.supplier_kpis.values_list("id", flat=True))

        attempts = [
            self.patch_case(self.case_id, {"kpis": []}, user=self.other_user),
            self.patch_case(self.case_id, {"supplier": None}, user=self.other_user),
            self.patch_case(
                self.case_id, {"interacted": "2026-01-01"}, user=self.other_user
            ),
            self.delete_case(self.case_id, user=self.other_user),
        ]
        self.assertEqual([r.status_code for r in attempts], [403] * len(attempts))

        case = Case.objects.get(pk=self.case_id)
        self.assertEqual(model_to_dict(case), before)
        self.assertEqual(sorted(case.kpis.values_list("id", flat=True)), kpis_before)
        self.assertEqual(
            sorted(case.supplier_kpis.values_list("id", flat=True)),
            supplier_kpis_before,
        )

    # --- an unrelated organization gets nothing at all -------------------

    def test_an_unrelated_organization_cannot_edit(self):
        response = self.patch_case(
            self.case_id,
            {"interaction_summary": "Stranger edit."},
            user=self.outsider,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.summary_of(), "New case. Unpaid overtime reported.")

    def test_an_unrelated_organization_cannot_delete(self):
        response = self.delete_case(self.case_id, user=self.outsider)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Case.objects.filter(pk=self.case_id).exists())

    def test_an_unrelated_organization_cannot_read_or_list_it(self):
        self.assertEqual(self.get_detail(self.case_id, user=self.outsider).status_code, 404)
        self.assertEqual(self.get_list(user=self.outsider).data["results"], [])

    def test_an_unrelated_organization_cannot_take_the_referral_for_itself(self):
        response = self.patch_case(
            self.case_id,
            {"refer_to_org": self.outsider_organization.id},
            user=self.outsider,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            Case.objects.get(pk=self.case_id).refer_to_org,
            self.other_organization,
        )

    def test_nothing_an_unrelated_organization_attempts_changes_the_record(self):
        """The stronger claim: refused, and no trace left behind.

        Status codes say a request was turned away. This says the row is
        untouched afterwards -- every column, its KPI links, and its history,
        which is what "cannot otherwise affect another organization's case"
        actually means.
        """
        case = Case.objects.get(pk=self.case_id)
        before = model_to_dict(case)
        history_before = case.history.count()
        kpis_before = sorted(case.kpis.values_list("id", flat=True))
        tasks_before = sorted(
            UserTask.objects.filter(source_id=self.case_id).values_list(
                "id", flat=True
            )
        )

        attempts = [
            self.patch_case(
                self.case_id, {"interaction_summary": "Stranger."}, user=self.outsider
            ),
            self.patch_case(
                self.case_id,
                {"refer_to_org": self.outsider_organization.id},
                user=self.outsider,
            ),
            self.patch_case(self.case_id, {"kpis": []}, user=self.outsider),
            self.patch_case(self.case_id, {"supplier": None}, user=self.outsider),
            self.patch_case(
                self.case_id, {"case_created_by": self.outsider.id}, user=self.outsider
            ),
            self.delete_case(self.case_id, user=self.outsider),
        ]
        self.assertEqual([r.status_code for r in attempts], [404] * len(attempts))

        case = Case.objects.get(pk=self.case_id)
        self.assertEqual(model_to_dict(case), before)
        self.assertEqual(case.history.count(), history_before)
        self.assertEqual(sorted(case.kpis.values_list("id", flat=True)), kpis_before)
        # Nothing downstream of a save ran either, since no save happened.
        self.assertEqual(
            sorted(
                UserTask.objects.filter(source_id=self.case_id).values_list(
                    "id", flat=True
                )
            ),
            tasks_before,
        )

    def test_a_user_with_no_organization_is_refused_outright(self):
        unlinked = User.objects.create(username="unlinked", email="u@nowhere.org")

        response = self.patch_case(
            self.case_id, {"interaction_summary": "No org."}, user=unlinked
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.summary_of(), "New case. Unpaid overtime reported.")


class WorkerVoiceReferralEmailTests(
    CommittedRequestMixin, WorkerVoiceCaseTestBase
):
    """The receiving organization is told when a call is referred to it."""

    def setUp(self):
        super().setUp()
        self.partner_referral = ReferralAction.objects.create(
            pk=REFERRAL_TO_PARTNER_ORG_ACTION_ID,
            name="Referral information provided to the partner organization",
        )
        self.other_action = ReferralAction.objects.create(
            name="No referral made or information provided; none needed"
        )

    def refer(self, **overrides):
        return self.post_committed(
            self.payload(
                referral_action=self.partner_referral.id,
                refer_to_org=self.other_organization.id,
                **overrides,
            )
        )

    def test_logging_a_referred_call_emails_the_receiving_organization(self):
        with patch(NOTIFY) as notify:
            response = self.refer()

        self.assertEqual(response.status_code, 201, response.data)
        notify.assert_called_once()
        case, referred_by = notify.call_args[0]
        self.assertEqual(case.pk, response.data["id"])
        self.assertEqual(referred_by, self.user)

    def test_a_call_with_no_referral_emails_nobody(self):
        with patch(NOTIFY) as notify:
            response = self.post_committed(self.payload(referral_action=self.other_action.id))

        self.assertEqual(response.status_code, 201, response.data)
        notify.assert_not_called()

    def test_adding_a_referral_on_an_edit_emails_the_receiving_organization(self):
        with patch(NOTIFY) as notify:
            created = self.post_committed(self.payload(referral_action=self.other_action.id))
            self.assertEqual(created.status_code, 201, created.data)

            response = self.patch_committed(
                created.data["id"],
                {
                    "referral_action": self.partner_referral.id,
                    "refer_to_org": self.other_organization.id,
                },
            )

        self.assertEqual(response.status_code, 200, response.data)
        notify.assert_called_once()

    def test_editing_a_call_whose_referral_has_not_moved_sends_nothing(self):
        with patch(NOTIFY):
            created = self.refer()

        with patch(NOTIFY) as notify:
            response = self.patch_committed(
                created.data["id"], {"final_remarks": "Followed up by phone."}
            )

        self.assertEqual(response.status_code, 200, response.data)
        notify.assert_not_called()

    def test_redirecting_the_referral_emails_the_new_organization(self):
        third_org = Organization.objects.create(name="Third CSO")
        with patch(NOTIFY):
            created = self.refer()

        with patch(NOTIFY) as notify:
            response = self.patch_committed(
                created.data["id"], {"refer_to_org": third_org.id}
            )

        self.assertEqual(response.status_code, 200, response.data)
        notify.assert_called_once()
        self.assertEqual(notify.call_args[0][0].refer_to_org_id, third_org.id)

    def test_the_mail_goes_to_every_user_of_the_receiving_organization(self):
        second = User.objects.create(username="colleague", email="c@other.org")
        UserOrganization.objects.create(
            user=second, organization=self.other_organization
        )
        User.objects.create(username="nomail", email="")
        with patch(NOTIFY):
            created = self.refer()
        case = Case.objects.get(pk=created.data["id"])

        with patch(MAILGUN) as mailgun:
            recipients = notify_referral_organization(case, self.user)

        self.assertCountEqual(recipients, ["r@other.org", "c@other.org"])
        sent = mailgun.return_value.send_email.call_args[0][0]
        self.assertCountEqual(sent["to"], recipients)
        self.assertIn(str(case.pk), sent["html"])
        self.assertIn(self.organization.name, sent["html"])

    def test_the_mail_carries_no_worker_details(self):
        with patch(NOTIFY):
            created = self.refer(
                client_nickname="Aung", client_phonenumber="+95 9 000 0000"
            )
        case = Case.objects.get(pk=created.data["id"])

        with patch(MAILGUN) as mailgun:
            notify_referral_organization(case, self.user)

        sent = mailgun.return_value.send_email.call_args[0][0]
        self.assertNotIn("Aung", sent["html"])
        self.assertNotIn("+95 9 000 0000", sent["html"])
        self.assertNotIn("Unpaid overtime", sent["html"])

    def sent_html(self, case):
        with patch(MAILGUN) as mailgun:
            notify_referral_organization(case, self.user)
        return mailgun.return_value.send_email.call_args[0][0]

    def test_the_mail_carries_only_supplier_kpi_ids(self):
        """Raw KPI catalogue rows must not duplicate the Supplier KPI rows."""
        raw_kpi = Kpi.objects.create(
            description="Issues with overtime being involuntary/forced or illegal",
            level=3,
        )
        supplier_kpi = SupplierKpi.objects.create(
            supplier=Supplier.objects.create(name="Blue Sea Foods"),
            kpi=Kpi.objects.create(
                description="Issues with wages: in violation of law", level=3
            ),
        )
        with patch(NOTIFY):
            created = self.refer(kpis=[raw_kpi.id])
        case = Case.objects.get(pk=created.data["id"])
        case.supplier_kpis.add(supplier_kpi)

        html = self.sent_html(case)["html"]

        self.assertIn(f"KPI ID: {supplier_kpi.id}", html)
        self.assertIn("Issues with wages: in violation of law", html)
        self.assertIn("level: 3", html)
        self.assertNotIn(
            (
                f"KPI ID: {raw_kpi.id}, description: Issues with overtime "
                "being involuntary/forced or illegal"
            ),
            html,
        )

    def test_kpis_on_a_legacy_case_are_rendered_too(self):
        """A Cascade officer can refer a case whose KPIs sit on the old
        relation; the legacy mail reads `supplier_kpis`, so this one does."""
        supplier_kpi = SupplierKpi.objects.create(
            supplier=Supplier.objects.create(name="Blue Sea Foods"),
            kpi=Kpi.objects.create(description="Wages withheld", level=2),
        )
        with patch(NOTIFY):
            created = self.refer()
        case = Case.objects.get(pk=created.data["id"])
        case.supplier_kpis.add(supplier_kpi)

        html = self.sent_html(case)["html"]

        self.assertIn(f"KPI ID: {supplier_kpi.id}", html)
        self.assertIn("Wages withheld", html)
        self.assertIn("level: 2", html)

    def test_the_body_is_the_admin_managed_template_the_legacy_mail_uses(self):
        KpiEmailNotificationTemplate.objects.create(
            type="OZ",
            subject="A case has been referred to your organization",
            text="{{case_org}} referred a case to {{org_referred}}.\n{{kpis}}",
        )
        supplier_kpi = SupplierKpi.objects.create(
            supplier=Supplier.objects.create(name="Blue Sea Foods"),
            kpi=Kpi.objects.create(description="Passport retention", level=4),
        )
        with patch(NOTIFY):
            created = self.refer()
        case = Case.objects.get(pk=created.data["id"])
        case.supplier_kpis.add(supplier_kpi)

        html = self.sent_html(case)["html"]

        self.assertIn("Partner CSO referred a case to Other CSO.", html)
        self.assertIn("Passport retention", html)

    def test_an_unseeded_template_row_still_sends_the_kpi_detail(self):
        """No migration writes the `OZ` row -- the legacy path raises without
        it, and a Cascade referral must go out regardless."""
        self.assertFalse(KpiEmailNotificationTemplate.objects.exists())
        supplier_kpi = SupplierKpi.objects.create(
            supplier=Supplier.objects.create(name="Blue Sea Foods"),
            kpi=Kpi.objects.create(description="Excessive overtime", level=1),
        )
        with patch(NOTIFY):
            created = self.refer()
        case = Case.objects.get(pk=created.data["id"])
        case.supplier_kpis.add(supplier_kpi)

        html = self.sent_html(case)["html"]

        self.assertIn("has referred a worker voice call to Other CSO", html)
        self.assertIn("Excessive overtime", html)

    def test_a_call_with_no_kpis_does_not_head_an_empty_list(self):
        with patch(NOTIFY):
            created = self.refer()

        html = self.sent_html(Case.objects.get(pk=created.data["id"]))["html"]

        self.assertIn("has referred a worker voice call to Other CSO", html)
        self.assertNotIn("The KPIs recorded on the call", html)

    def test_the_mail_says_the_referral_came_from_cascade(self):
        with patch(NOTIFY):
            created = self.refer()

        sent = self.sent_html(Case.objects.get(pk=created.data["id"]))

        self.assertIn(SOURCE_LABEL, sent["subject"])
        self.assertIn(SOURCE_LABEL, sent["html"])
        self.assertIn("Worker Voice referral", sent["html"])

    @override_settings(FRONTEND_URL="https://ilm.example.test/")
    def test_the_cta_opens_ilm_kpi_updates_instead_of_team_tasks(self):
        with patch(NOTIFY):
            created = self.refer()

        html = self.sent_html(Case.objects.get(pk=created.data["id"]))["html"]

        self.assertIn(
            'href="https://ilm.example.test/admin/businesskpiupdates"', html
        )
        self.assertIn("Open KPI Updates", html)
        self.assertNotIn("/worker-voice-calls", html)

    def test_a_receiving_organization_with_no_reachable_user_is_skipped(self):
        empty_org = Organization.objects.create(name="Empty CSO")
        with patch(NOTIFY):
            created = self.post_committed(
                self.payload(
                    referral_action=self.partner_referral.id,
                    refer_to_org=empty_org.id,
                )
            )
        case = Case.objects.get(pk=created.data["id"])

        with patch(MAILGUN) as mailgun:
            self.assertEqual(notify_referral_organization(case, self.user), [])

        mailgun.return_value.send_email.assert_not_called()

    def test_a_failing_mail_server_does_not_fail_the_save(self):
        """The referral is recorded on the case; the mail is a courtesy."""
        with patch(MAILGUN) as mailgun:
            mailgun.return_value.send_email.side_effect = RuntimeError("mailgun down")
            response = self.refer()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            Case.objects.get(pk=response.data["id"]).refer_to_org,
            self.other_organization,
        )


class WorkerVoiceAttachmentTests(WorkerVoiceCaseTestBase):
    def test_pdf_attachment_is_stored_against_the_case(self):
        data = self.payload(
            uploaded_attachments=[
                SimpleUploadedFile(
                    "evidence.pdf", b"%PDF-1.4 test", content_type="application/pdf"
                )
            ]
        )

        response = self.post(data, format="multipart")

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.attachments.count(), 1)
        self.assertEqual(case.attachments.first().name, "evidence.pdf")

    def test_unsupported_attachment_type_is_rejected(self):
        data = self.payload(
            uploaded_attachments=[
                SimpleUploadedFile(
                    "payload.exe", b"MZ", content_type="application/octet-stream"
                )
            ]
        )

        response = self.post(data, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Case.objects.exists())
        self.assertFalse(SharedFile.objects.exists())


class WorkerVoiceCaseScopingTests(WorkerVoiceCaseTestBase):
    def setUp(self):
        super().setUp()
        self.own_case = Case.objects.create(
            case_created_by=self.user, interaction_summary="ours"
        )
        self.foreign_case = Case.objects.create(
            case_created_by=self.other_user, interaction_summary="theirs"
        )

    def test_list_returns_only_the_callers_organization(self):
        response = self.get_list()

        self.assertEqual(response.status_code, 200)
        returned = [row["id"] for row in response.data["results"]]
        self.assertEqual(returned, [self.own_case.id])

    def test_another_organizations_case_is_not_retrievable(self):
        request = self.factory.get(
            reverse(
                "cascade-worker-voice-call-detail", args=[self.foreign_case.id]
            )
        )
        force_authenticate(request, user=self.user)

        response = WorkerVoiceCaseDetailAPIView.as_view()(
            request, pk=self.foreign_case.id
        )

        self.assertEqual(response.status_code, 404)

    def test_cases_are_shared_across_users_in_the_same_organization(self):
        colleague = User.objects.create(username="colleague", email="c@cso.org")
        UserOrganization.objects.create(
            user=colleague, organization=self.organization
        )

        response = self.get_list(user=colleague)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["id"] for row in response.data["results"]], [self.own_case.id]
        )


class WorkerVoiceLookupAudienceTests(TestCase):
    """The form's dropdowns must show CSO wording without leaking it to Issara.

    Every option below is org-neutral for a CSO and Issara-worded for internal
    staff, so the two audiences see different rows from the same tables.
    """

    def setUp(self):
        self.cso_group = Group.objects.create(name="CSO")
        self.cso_user = User.objects.create(username="cso", email="c@cso.org")
        self.cso_user.groups.add(self.cso_group)
        self.staff_user = User.objects.create(username="staff", email="s@issara.org")

        self.factory = APIRequestFactory()

        InteractionReason.objects.create(name="Reporting an issue")
        InteractionReason.objects.create(
            name="Coordination with organization", cso_only=True
        )
        InteractionReason.objects.create(
            name="Coordination with Issara", hide_for_cso=True
        )

        ClientType.objects.create(name="Golden Dreams Mobilizer")
        ClientType.objects.create(
            name="Returnee - former worker, exploited", cso_only=True
        )
        ClientType.objects.create(
            name="Exploited migrant worker, back in community", hide_for_cso=True
        )

        ReferralAction.objects.create(name="General referral")
        ReferralAction.objects.create(name="CSO referral", cso_only=True)
        ReferralAction.objects.create(
            name="CSO referral with legacy hide flag",
            cso_only=True,
            hide_for_cso=True,
        )
        ReferralAction.objects.create(
            name="Issara-only referral", hide_for_cso=True
        )

    def names_from(self, view, path, user):
        request = self.factory.get(path)
        force_authenticate(request, user=user)
        response = view.as_view({"get": "list"})(request)
        rows = response.data
        if hasattr(rows, "get"):
            rows = rows.get("results", rows)
        return sorted(row["name"] for row in rows)

    def test_cso_sees_org_neutral_interaction_reasons(self):
        from issara.ilm_server_2.views import InteractionReasonViewSet

        names = self.names_from(
            InteractionReasonViewSet, "/api/v2/interactionreasons/", self.cso_user
        )

        self.assertIn("Coordination with organization", names)
        self.assertNotIn("Coordination with Issara", names)

    def test_internal_staff_keep_the_issara_worded_reasons(self):
        """Regression: the audience filter used to apply only when `lang` was
        set to a non-English value, so English requests leaked every row."""
        from issara.ilm_server_2.views import InteractionReasonViewSet

        names = self.names_from(
            InteractionReasonViewSet, "/api/v2/interactionreasons/", self.staff_user
        )

        self.assertIn("Coordination with Issara", names)
        self.assertNotIn("Coordination with organization", names)

    def test_worker_voice_referrals_add_the_shared_rows_to_the_cso_rows(self):
        """The CSO form needs the audience-neutral rows too.

        "Referral information provided to the partner organization" is shared
        with Issara staff, so it carries neither flag; without it step 5 could
        not offer the partner referral at all. Rows hidden from CSOs stay out,
        and hide_for_cso is still ignored on the cso_only rows themselves.
        """
        from issara.ilm_server_2.views import ReferralActionViewSet

        names = self.names_from(
            ReferralActionViewSet,
            "/api/v2/referralactions/?lang=en&cso_only=true",
            self.cso_user,
        )

        self.assertEqual(
            names,
            [
                "CSO referral",
                "CSO referral with legacy hide flag",
                "General referral",
            ],
        )

    def test_default_referral_filter_remains_unchanged(self):
        from issara.ilm_server_2.views import ReferralActionViewSet

        names = self.names_from(
            ReferralActionViewSet,
            "/api/v2/referralactions/?lang=en",
            self.cso_user,
        )

        self.assertEqual(names, ["CSO referral", "General referral"])

    def test_cso_sees_returnee_client_types(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        names = self.names_from(
            ClientTypeViewSet, "/api/v2/clienttypes/", self.cso_user
        )

        self.assertIn("Returnee - former worker, exploited", names)
        self.assertNotIn("Exploited migrant worker, back in community", names)

    def test_returnee_client_types_do_not_leak_to_internal_staff(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        names = self.names_from(
            ClientTypeViewSet, "/api/v2/clienttypes/", self.staff_user
        )

        self.assertNotIn("Returnee - former worker, exploited", names)
        self.assertIn("Exploited migrant worker, back in community", names)

    def test_cso_channel_set_excludes_supplier_and_outreach_channels(self):
        InteractionChannel.objects.create(name="Hotline", hide_for_supplier=True)
        InteractionChannel.objects.create(name="Reported In-person", cso_only=True)
        InteractionChannel.objects.create(name="HR office", supplier_only=True)
        InteractionChannel.objects.create(
            name="Housing Outreach", hide_for_cso=True
        )

        names = sorted(
            InteractionChannel.get_for_user(self.cso_user).values_list(
                "name", flat=True
            )
        )

        self.assertEqual(names, ["Hotline", "Reported In-person"])

    def test_cso_only_channel_is_hidden_from_other_audiences(self):
        InteractionChannel.objects.create(name="Reported In-person", cso_only=True)
        InteractionChannel.objects.create(name="Hotline", hide_for_supplier=True)

        names = list(
            InteractionChannel.get_for_user(self.staff_user).values_list(
                "name", flat=True
            )
        )

        self.assertEqual(names, ["Hotline"])


class WorkerVoiceCsoTesterAudienceTests(TestCase):
    """`?cso_only=true`: the Cascade tester's CSO view of the lookup tables.

    The Tester Floating Button switches an Issara Management account into the
    CSO Worker Voice UI without minting a CSO token -- correctly, since it must
    not impersonate anyone. The lookups used to read the audience off the
    caller's Django groups alone, so that tester was reviewing a form no CSO
    would ever see. Naming the audience in the request fixes that.

    Three cases per lookup, and all three matter:

    1. a real CSO gets the CSO rows (unchanged, and the reference answer),
    2. Management **with** the flag gets exactly the same rows as case 1,
    3. Management **without** the flag is byte-for-byte what it was before.
    """

    def setUp(self):
        self.cso_group = Group.objects.create(name="CSO")
        self.cso_user = User.objects.create(username="cso", email="c@cso.org")
        self.cso_user.groups.add(self.cso_group)

        self.management_group = Group.objects.create(name="Issara Management")
        self.management_user = User.objects.create(
            username="manager", email="m@issara.org"
        )
        self.management_user.groups.add(self.management_group)

        self.factory = APIRequestFactory()

        InteractionReason.objects.create(name="Reporting an issue")
        InteractionReason.objects.create(
            name="Coordination with organization", cso_only=True
        )
        InteractionReason.objects.create(
            name="Coordination with Issara", hide_for_cso=True
        )

        ClientType.objects.create(name="Golden Dreams Mobilizer")
        ClientType.objects.create(
            name="Returnee - former worker, exploited", cso_only=True
        )
        ClientType.objects.create(
            name="Exploited migrant worker, back in community", hide_for_cso=True
        )

        InteractionChannel.objects.create(name="Hotline", hide_for_supplier=True)
        InteractionChannel.objects.create(name="Reported In-person", cso_only=True)
        InteractionChannel.objects.create(name="HR office", supplier_only=True)
        InteractionChannel.objects.create(name="Housing Outreach", hide_for_cso=True)

    def names_from(self, view, path, user):
        request = self.factory.get(path)
        force_authenticate(request, user=user)
        response = view.as_view({"get": "list"})(request)
        rows = response.data
        if hasattr(rows, "get"):
            rows = rows.get("results", rows)
        return sorted(row["name"] for row in rows)

    def channel_names(self, user, cso_only=False):
        request = self.factory.get(
            "/cascade/interactionchannels/"
            + ("?cso_only=true" if cso_only else "")
        )
        force_authenticate(request, user=user)
        response = InteractionChannelListAPIView.as_view()(request)
        return sorted(row["name"] for row in response.data)

    # -- client types ----------------------------------------------------

    def test_management_in_cso_view_gets_the_cso_client_types(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        cso = self.names_from(
            ClientTypeViewSet, "/api/v2/clienttypes/", self.cso_user
        )
        tester = self.names_from(
            ClientTypeViewSet,
            "/api/v2/clienttypes/?cso_only=true",
            self.management_user,
        )

        self.assertEqual(tester, cso)
        self.assertIn("Returnee - former worker, exploited", tester)
        self.assertNotIn("Exploited migrant worker, back in community", tester)

    def test_management_without_the_flag_keeps_its_client_types(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        names = self.names_from(
            ClientTypeViewSet, "/api/v2/clienttypes/", self.management_user
        )

        self.assertEqual(
            names,
            [
                "Exploited migrant worker, back in community",
                "Golden Dreams Mobilizer",
            ],
        )

    def test_the_flag_does_not_change_what_a_real_cso_sees(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        self.assertEqual(
            self.names_from(
                ClientTypeViewSet,
                "/api/v2/clienttypes/?cso_only=true",
                self.cso_user,
            ),
            self.names_from(
                ClientTypeViewSet, "/api/v2/clienttypes/", self.cso_user
            ),
        )

    # -- interaction reasons ---------------------------------------------

    def test_management_in_cso_view_gets_the_cso_reasons(self):
        from issara.ilm_server_2.views import InteractionReasonViewSet

        cso = self.names_from(
            InteractionReasonViewSet,
            "/api/v2/interactionreasons/?lang=en",
            self.cso_user,
        )
        tester = self.names_from(
            InteractionReasonViewSet,
            "/api/v2/interactionreasons/?lang=en&cso_only=true",
            self.management_user,
        )

        self.assertEqual(tester, cso)
        self.assertIn("Coordination with organization", tester)
        self.assertNotIn("Coordination with Issara", tester)

    def test_management_without_the_flag_keeps_its_reasons(self):
        from issara.ilm_server_2.views import InteractionReasonViewSet

        names = self.names_from(
            InteractionReasonViewSet,
            "/api/v2/interactionreasons/?lang=en",
            self.management_user,
        )

        self.assertEqual(
            names, ["Coordination with Issara", "Reporting an issue"]
        )

    # -- interaction channels --------------------------------------------

    def test_management_in_cso_view_gets_the_cso_channels(self):
        cso = self.channel_names(self.cso_user)
        tester = self.channel_names(self.management_user, cso_only=True)

        self.assertEqual(tester, cso)
        self.assertEqual(tester, ["Hotline", "Reported In-person"])

    def test_management_without_the_flag_keeps_its_channels(self):
        self.assertEqual(
            self.channel_names(self.management_user),
            ["Hotline", "Housing Outreach"],
        )

    def test_a_supplier_is_never_moved_onto_the_cso_channel_branch(self):
        """The flag says which UI is on screen, not who the caller is.

        A supplier account keeps its own channel set either way -- the supplier
        membership is tested before the audience, so `?cso_only=true` cannot be
        used to read the CSO-only rows from a supplier session.
        """
        supplier = Supplier.objects.create(name="Factory A")
        supplier_user = User.objects.create(username="hr", email="hr@factory.com")
        SupplierUser.objects.create(user=supplier_user, supplier=supplier)

        self.assertEqual(
            sorted(
                InteractionChannel.get_for_user(
                    supplier_user, cso_audience=True
                ).values_list("name", flat=True)
            ),
            sorted(
                InteractionChannel.get_for_user(supplier_user).values_list(
                    "name", flat=True
                )
            ),
        )
        self.assertNotIn(
            "Reported In-person",
            InteractionChannel.get_for_user(
                supplier_user, cso_audience=True
            ).values_list("name", flat=True),
        )

    # -- the parameter is not an authorization switch ---------------------

    def test_the_flag_only_accepts_explicit_truthy_values(self):
        from issara.ilm_server_2.views import ClientTypeViewSet

        for value in ("", "false", "0", "no", "maybe"):
            with self.subTest(value=value):
                self.assertNotIn(
                    "Returnee - former worker, exploited",
                    self.names_from(
                        ClientTypeViewSet,
                        f"/api/v2/clienttypes/?cso_only={value}",
                        self.management_user,
                    ),
                )


class WorkerVoiceCsoTesterOfficerTests(TestCase):
    """The officer picker: same organization, different rule.

    `/cascade/users/` has always had two rules -- a CSO sees *their own
    organization's* officers, everyone else sees every non-CSO user in the
    system. That is an audience rule, not an organization rule, so CSO view
    applies it to the tester's **own** organization. Nothing here adopts
    another organization, and nothing here needs one to exist.

    The fixture is the shape that actually occurs in the live data: one
    organization containing both a CSO account and a Management account, so
    "the CSO rendering for organization X" has a real reference answer.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Shared Org")
        self.other_org = Organization.objects.create(name="Elsewhere")

        self.cso_group = Group.objects.create(name="CSO")
        self.management_group = Group.objects.create(name="Issara Management")

        def member(username, organization, group=None):
            user = User.objects.create(username=username, email=f"{username}@x.org")
            if group:
                user.groups.add(group)
            if organization:
                UserOrganization.objects.create(user=user, organization=organization)
            return user

        # Organization X: a CSO account and a Management account side by side.
        self.cso_in_org = member("cso_x", self.org, self.cso_group)
        self.manager = member("manager_x", self.org, self.management_group)
        self.colleague = member("colleague_x", self.org)
        # Somebody else entirely -- visible to the Management rule, not the CSO one.
        self.outsider = member("outsider", self.other_org)

        self.factory = APIRequestFactory()

    def officers(self, user, cso_only=False):
        request = self.factory.get(
            "/cascade/users/" + ("?cso_only=true" if cso_only else "")
        )
        force_authenticate(request, user=user)
        response = UserListAPIView.as_view()(request)
        rows = response.data
        if hasattr(rows, "get"):
            rows = rows.get("results", rows)
        return sorted(row["username"] for row in rows)

    def test_cso_view_gives_the_managers_own_organization(self):
        """B == C for one and the same organization X.

        The Management tester's list becomes exactly the list the CSO account
        in that same organization already gets -- reached by applying the CSO
        rule to organization X, never by adopting organization Y.
        """
        self.assertEqual(
            self.officers(self.manager, cso_only=True),
            self.officers(self.cso_in_org),
        )
        self.assertEqual(
            self.officers(self.manager, cso_only=True),
            ["colleague_x", "cso_x", "manager_x"],
        )

    def test_the_managers_own_view_is_unchanged(self):
        """A: every non-CSO user, the rule Management has always had."""
        names = self.officers(self.manager)

        self.assertIn("outsider", names)
        self.assertNotIn("cso_x", names)

    def test_cso_view_never_reaches_another_organization(self):
        """The whole point: the rule changes, the organization does not."""
        self.assertNotIn("outsider", self.officers(self.manager, cso_only=True))

    def test_a_real_cso_is_unaffected_by_the_flag(self):
        self.assertEqual(
            self.officers(self.cso_in_org, cso_only=True),
            self.officers(self.cso_in_org),
        )

    def test_an_account_with_no_organization_gets_an_empty_picker(self):
        """A people-picker with nothing to offer is empty, not a 500.

        The old CSO branch reached `user.organization_user` directly, which
        raises for an unlinked account -- and unlinked accounts exist in both
        groups. Reading the link explicitly keeps the shared path safe.
        """
        unlinked = User.objects.create(username="unlinked", email="u@x.org")
        unlinked.groups.add(self.management_group)

        self.assertEqual(self.officers(unlinked, cso_only=True), [])


class WorkerVoiceCsoTesterScopingTests(WorkerVoiceCaseTestBase):
    """`?cso_only=true` must not reach the Worker Voice *case* endpoints.

    Those scope by the signed-in user's real `UserOrganization`, which is the
    actual authorization boundary. A view mode is a statement about the UI, not
    a membership, so it must not widen, narrow or redirect what a caller can
    read or write.
    """

    def test_the_flag_does_not_widen_the_caseload(self):
        self.post(self.payload())
        self.post(self.payload(), user=self.other_user)

        plain = self.get_list()
        flagged = self.get_list(cso_only="true")

        self.assertEqual(plain.data["count"], 1)
        self.assertEqual(flagged.data["count"], plain.data["count"])
        self.assertEqual(
            [row["id"] for row in flagged.data["results"]],
            [row["id"] for row in plain.data["results"]],
        )

    def test_the_flag_does_not_grant_access_to_another_organization_case(self):
        created = self.post(self.payload(), user=self.other_user)
        case_id = created.data["id"]

        request = self.factory.get(
            reverse("cascade-worker-voice-call-detail", args=[case_id]),
            {"cso_only": "true"},
        )
        force_authenticate(request, user=self.user)
        response = WorkerVoiceCaseDetailAPIView.as_view()(request, pk=case_id)

        self.assertEqual(response.status_code, 404)

    def test_the_flag_does_not_change_who_a_new_case_belongs_to(self):
        response = self.post(self.payload(), user=self.user)
        case = Case.objects.get(pk=response.data["id"])

        self.assertEqual(case.case_created_by, self.user)


class WorkerVoiceRiskLevelTests(WorkerVoiceCaseTestBase):
    """The risk levels the two forms write into one shared column.

    The Worker Voice form asks for "Early warning risk" or "Forced labor risk";
    ILM-fronted's risk bar still writes Low/Medium/High, and rows predating
    this form hold those. All five stay valid so neither form's answers are
    rejected, and neither rewrites what the other saved.
    """

    def test_the_worker_voice_risks_are_accepted(self):
        for value in ("EARLY_WARNING", "FORCED_LABOR"):
            with self.subTest(risk=value):
                response = self.post(
                    self.payload(worker_identification_risk_level=value)
                )

                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(
                    Case.objects.get(
                        pk=response.data["id"]
                    ).worker_identification_risk_level,
                    value,
                )

    def test_the_legacy_scale_is_still_accepted(self):
        # ILM-fronted keeps writing these, so widening the set must not have
        # narrowed it.
        for value in ("LOW", "MEDIUM", "HIGH"):
            with self.subTest(risk=value):
                response = self.post(
                    self.payload(worker_identification_risk_level=value)
                )

                self.assertEqual(response.status_code, 201, response.data)

    def test_an_unknown_risk_level_is_still_refused(self):
        response = self.post(
            self.payload(worker_identification_risk_level="CRITICAL")
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("worker_identification_risk_level", response.data)

    def test_a_legacy_risk_survives_an_edit_that_does_not_touch_it(self):
        # Step 5 no longer offers HIGH, so an officer editing such a call has
        # no way to re-pick it. The value has to come back untouched.
        case_id = self.post(
            self.payload(worker_identification_risk_level="HIGH")
        ).data["id"]

        response = self.patch_case(case_id, {"final_remarks": "Followed up."})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            Case.objects.get(pk=case_id).worker_identification_risk_level,
            "HIGH",
        )

    def test_the_column_holds_the_longest_value(self):
        # `EARLY_WARNING` is 13 characters and the column was sized for 10.
        field = Case._meta.get_field("worker_identification_risk_level")
        longest = max(len(value) for value, _ in field.choices)

        self.assertGreaterEqual(field.max_length, longest)


class WorkerVoiceCaseStatusAudienceTests(TestCase):
    """Step 5's case statuses, and who is offered the two new ones.

    "Early warning risk" and "Forced labor risk" were asked for by the Cascade
    Worker Voice form and must not appear in ILM-fronted. ILM-fronted serves
    CSO users as well as Issara staff, so flagging the rows `cso_only` and
    keying off the caller's group would still have surfaced them there. The
    filter is opt-in instead: a client asks for the CSO set by name, and every
    caller that does not keeps the list it has always had.
    """

    def setUp(self):
        self.cso_group = Group.objects.create(name="CSO")
        self.cso_user = User.objects.create(username="cso", email="c@cso.org")
        self.cso_user.groups.add(self.cso_group)
        self.staff_user = User.objects.create(username="staff", email="s@issara.org")

        self.factory = APIRequestFactory()

        # The ILM 1 rows ~43k live cases point at, then the two new ones.
        CaseStatus.objects.create(name="Open")
        CaseStatus.objects.create(name="Closed")
        CaseStatus.objects.create(name="Early warning risk", cso_only=True)
        CaseStatus.objects.create(name="Forced labor risk", cso_only=True)

    def names_for(self, user, path="/api/v2/casestatuses/"):
        from issara.ilm_server_2.views import CaseStatusViewSet

        request = self.factory.get(path)
        force_authenticate(request, user=user)
        response = CaseStatusViewSet.as_view({"get": "list"})(request)
        rows = response.data
        if hasattr(rows, "get"):
            rows = rows.get("results", rows)
        return sorted(row["name"] for row in rows)

    def test_the_worker_voice_form_is_offered_the_risk_statuses(self):
        names = self.names_for(
            self.cso_user, "/api/v2/casestatuses/?cso_only=true"
        )

        self.assertEqual(
            names, ["Closed", "Early warning risk", "Forced labor risk", "Open"]
        )

    def test_the_legacy_list_is_unchanged_for_issara_staff(self):
        self.assertEqual(self.names_for(self.staff_user), ["Closed", "Open"])

    def test_a_cso_on_the_legacy_client_still_gets_the_legacy_list(self):
        # ILM-fronted asks for `/casestatuses/` with no parameters whoever is
        # signed in, which is what keeps the new statuses out of it.
        self.assertEqual(self.names_for(self.cso_user), ["Closed", "Open"])


class WorkerVoiceOfficerDropdownTests(TestCase):
    """The officer dropdowns list people who can still be given the work."""

    def setUp(self):
        self.organization = Organization.objects.create(name="Partner CSO")
        self.cso_group = Group.objects.create(name="CSO")

        self.officer = User.objects.create(username="officer", email="o@cso.org")
        self.officer.groups.add(self.cso_group)
        UserOrganization.objects.create(
            user=self.officer, organization=self.organization
        )

        self.departed = User.objects.create(
            username="departed", email="d@cso.org", is_active=False
        )
        self.departed.groups.add(self.cso_group)
        UserOrganization.objects.create(
            user=self.departed, organization=self.organization
        )

        self.factory = APIRequestFactory()

    def usernames_for(self, user):
        from issara.cascade.views.users import UserListAPIView

        request = self.factory.get(reverse("cascade-users"))
        force_authenticate(request, user=user)
        response = UserListAPIView.as_view()(request)
        rows = response.data
        if hasattr(rows, "get"):
            rows = rows.get("results", rows)
        return sorted(row["username"] for row in rows)

    def test_a_deactivated_colleague_is_not_offered(self):
        self.assertEqual(self.usernames_for(self.officer), ["officer"])

    def test_deactivating_an_issara_user_takes_them_out_too(self):
        staff = User.objects.create(username="staff", email="s@issara.org")
        User.objects.create(
            username="ex-staff", email="x@issara.org", is_active=False
        )

        self.assertEqual(self.usernames_for(staff), ["staff"])


class WorkerVoiceLookupAuthenticationTests(TestCase):
    """The form's lookups have to accept the frontend's AuthKit bearer token.

    A viewset that leaves `authentication_classes` at the project default only
    understands Basic/Session/2FA-JWT credentials, so an AuthKit request is
    answered with `401 Basic realm="api"` before any view code runs -- which is
    what emptied the Worker Voice dropdowns.
    """

    LOOKUP_VIEWSETS = (
        "InteractionReasonViewSet",
        "ClientTypeViewSet",
        "ReferralActionViewSet",
        "ReferralOrganisationViewSet",
        "ContractTypeViewSet",
        "DocumentTypeViewSet",
        "CaseStatusViewSet",
        "CountryViewSet",
        "ProvinceViewSet",
        "DistrictViewSet",
        "NationalityViewSet",
    )

    def test_form_lookups_accept_authkit_tokens(self):
        from authkit import WorkOSAuthKitAuthentication
        from issara.ilm_server_2 import views

        for name in self.LOOKUP_VIEWSETS:
            with self.subTest(viewset=name):
                viewset = getattr(views, name)
                self.assertIn(
                    WorkOSAuthKitAuthentication,
                    tuple(viewset.authentication_classes),
                )

    def test_cascade_user_list_is_routed(self):
        # `UserListAPIView` was imported into the cascade URLconf but never
        # given a path, so the officer dropdowns got a 404.
        self.assertEqual(reverse("cascade-users"), "/cascade/users/")


class WorkerVoiceCaseListColumnTests(WorkerVoiceCaseTestBase):
    """The table draws labels, so the list view resolves its foreign keys."""

    def test_list_rows_carry_display_names(self):
        self.post(self.payload(client_nickname="Aung"))

        response = self.get_list()

        self.assertEqual(response.status_code, 200)
        row = response.data["results"][0]
        self.assertEqual(row["client_nickname"], "Aung")
        self.assertEqual(row["client_nationality_name"], "Nepali")
        self.assertEqual(row["interaction_reason_name"], self.reason.name)
        self.assertEqual(row["interaction_channel_name"], self.channel.name)
        self.assertEqual(row["client_type_name"], self.client_type.name)
        self.assertEqual(row["interacted"], "2026-08-28")
        self.assertEqual(row["attachment_count"], 0)

    def test_a_case_with_no_status_yet_lists_without_error(self):
        # `case_status` is optional on the form, and an unset foreign key must
        # not drop the row or blow up the serializer.
        self.post(self.payload())

        response = self.get_list()

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["results"][0]["case_status_name"])

    def test_the_list_does_not_ship_the_whole_case(self):
        # Still a table of columns rather than the whole case: the fifty-odd
        # fields the five-step form round-trips are not sent per row.
        self.post(self.payload())

        row = self.get_list().data["results"][0]

        self.assertNotIn("kpis", row)
        self.assertNotIn("vot_needs", row)
        self.assertNotIn("next_steps", row)
        self.assertNotIn("debt_bondage_detail", row)

    def test_the_phone_number_is_a_column(self):
        # Asked for in round three. The endpoint only ever answers with the
        # reader's own caseload, and the detail panel has always carried it.
        self.post(self.payload(client_phonenumber="+95 912345678"))

        row = self.get_list().data["results"][0]

        self.assertEqual(row["client_phonenumber"], "+95 912345678")

    def test_the_supplier_is_named_rather_than_numbered(self):
        supplier = Supplier.objects.create(name="Blue Sea Foods")
        case = Case.objects.get(pk=self.post(self.payload()).data["id"])
        case.supplier = supplier
        case.save(update_fields=["supplier"])

        row = self.get_list().data["results"][0]

        self.assertEqual(row["supplier_name"], "Blue Sea Foods")

    def test_a_case_with_no_supplier_lists_without_error(self):
        # The five-step form never asks for one, so this is the common case.
        self.post(self.payload())

        row = self.get_list().data["results"][0]

        self.assertIsNone(row["supplier_name"])


class WorkerVoiceCaseStaffColumnTests(
    CommittedRequestMixin, WorkerVoiceCaseTestBase
):
    """The table's "Staff" column: who entered the call.

    It reads `case_created_by`, the account that saved the record, rather than
    `interaction_issara_staff`, the officer who received the feedback -- the
    form asks that on step 1 and it answers a different question.

    A referred-in row shows nothing. The referral tells the receiving
    organization which organization sent the call; naming one of its officers
    by email is not part of what a referral hands over.
    """

    def setUp(self):
        super().setUp()
        self.partner_referral = ReferralAction.objects.create(
            pk=REFERRAL_TO_PARTNER_ORG_ACTION_ID,
            name="Referral information provided to the partner organization",
        )

    def refer_out(self):
        """One call logged by `self.user`, referred to `other_organization`."""
        with patch(NOTIFY):
            created = self.post_committed(
                self.payload(
                    referral_action=self.partner_referral.id,
                    refer_to_org=self.other_organization.id,
                )
            )
        self.assertEqual(created.status_code, 201, created.data)
        return created.data["id"]

    def row(self, case_id, user=None, **params):
        rows = self.get_list(user=user, **params).data["results"]
        return next(row for row in rows if row["id"] == case_id)

    def test_a_row_carries_the_email_of_the_account_that_entered_it(self):
        case_id = self.post(self.payload()).data["id"]

        self.assertEqual(self.row(case_id)["staff_email"], self.user.email)

    def test_the_officer_who_received_the_call_is_not_what_is_shown(self):
        # Step 1's officer is a separate field, and the two need not agree:
        # one officer takes the call, another types it up.
        receiver = User.objects.create(username="receiver", email="rec@cso.org")
        UserOrganization.objects.create(
            user=receiver, organization=self.organization
        )
        case_id = self.post(
            self.payload(interaction_issara_staff=receiver.id)
        ).data["id"]

        self.assertEqual(self.row(case_id)["staff_email"], self.user.email)

    def test_a_referred_in_row_names_no_officer(self):
        case_id = self.refer_out()

        row = self.row(case_id, user=self.other_user)

        self.assertTrue(row["shared_with_my_organization"])
        self.assertIsNone(row["staff_email"])
        # The organization that sent it is still named -- that is what the
        # receiving officer needs to follow the call up.
        self.assertEqual(row["owner_organization_name"], self.organization.name)

    def test_the_logging_organization_still_sees_its_own_referred_out_row(self):
        case_id = self.refer_out()

        self.assertEqual(self.row(case_id)["staff_email"], self.user.email)

    def test_a_case_with_no_creator_lists_without_error(self):
        # The legacy referred-in rows: logged before `case_created_by` was
        # stamped, so they reach the receiving organization creatorless.
        case_id = self.refer_out()
        Case.objects.filter(pk=case_id).update(case_created_by=None)

        self.assertIsNone(self.row(case_id, user=self.other_user)["staff_email"])

    def test_the_staff_box_matches_part_of_the_email(self):
        colleague = User.objects.create(username="mya", email="mya@cso.org")
        UserOrganization.objects.create(
            user=colleague, organization=self.organization
        )
        wanted = self.post(self.payload(), user=colleague).data["id"]
        self.post(self.payload())

        rows = self.get_list(staff="mya@").data["results"]

        self.assertEqual([row["id"] for row in rows], [wanted])

    def test_the_staff_box_cannot_pull_up_a_referred_in_row(self):
        # The box searches only what the column shows, so the address behind a
        # blank cell finds nothing.
        self.refer_out()

        rows = self.get_list(user=self.other_user, staff=self.user.email).data[
            "results"
        ]

        self.assertEqual(rows, [])

    def test_the_free_text_search_does_not_reach_the_email_either(self):
        self.refer_out()

        rows = self.get_list(user=self.other_user, search=self.user.email).data[
            "results"
        ]

        self.assertEqual(rows, [])

    def test_the_column_is_the_same_in_cso_view(self):
        # The tester's view switch changes the audience of lookup dropdowns,
        # never a case field: this one is read off the row's creator and the
        # caller's own organization.
        case_id = self.post(self.payload()).data["id"]

        plain = self.row(case_id)
        flagged = self.row(case_id, cso_only="true")

        self.assertEqual(flagged["staff_email"], plain["staff_email"])
        self.assertEqual(flagged["staff_email"], self.user.email)


class WorkerVoiceCaseKpiRiskTests(WorkerVoiceCaseTestBase):
    """The table's "Forced labor risk level" column.

    It classifies the *issue*, not the worker, so it is read off the levels of
    the KPIs picked on step 4 rather than off
    `worker_identification_risk_level`. The endpoint sends the levels and the
    client maps them, which is where the same Level 3-and-4 split the supplier
    tables draw already lives.

    The filter here has to reach the same verdict the badge does, row for row:
    any Level 3 or 4 is forced labor, failing that any Level 2 is an early
    warning, and anything else is in neither band.
    """

    def setUp(self):
        super().setUp()
        self.early_warning = Kpi.objects.create(
            description="Excessive overtime", level=2
        )
        self.forced_labor = Kpi.objects.create(
            description="Passport retention", level=4
        )

    def _log(self, kpis=(), **overrides):
        response = self.post(self.payload(kpis=[kpi.id for kpi in kpis], **overrides))
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def _row(self, case_id, **params):
        rows = self.get_list(**params).data["results"]
        return next(row for row in rows if row["id"] == case_id)

    def test_the_levels_of_the_selected_kpis_are_sent(self):
        case_id = self._log([self.early_warning, self.forced_labor])

        self.assertCountEqual(self._row(case_id)["kpi_levels"], [2, 4])

    def test_a_call_with_no_kpi_carries_an_empty_list(self):
        # Not null and not a level: nothing has been classified yet, and the
        # table leaves the column blank rather than guessing early warning.
        case_id = self._log()

        self.assertEqual(self._row(case_id)["kpi_levels"], [])

    def test_the_column_is_not_the_workers_personal_risk(self):
        # A worker at high personal risk reporting a Level 2 issue: the two
        # answers are independent and both are sent.
        case_id = self._log(
            [self.early_warning], worker_identification_risk_level="HIGH"
        )

        row = self._row(case_id)
        self.assertEqual(row["worker_identification_risk_level"], "HIGH")
        self.assertEqual(row["kpi_levels"], [2])

    def test_filtering_on_forced_labor_takes_levels_three_and_four(self):
        severe = self._log([self.early_warning, self.forced_labor])
        self._log([self.early_warning])

        rows = self.get_list(kpi_risk="FORCED_LABOR").data["results"]

        self.assertEqual([row["id"] for row in rows], [severe])

    def test_filtering_on_early_warning_excludes_untagged_calls(self):
        # A call with no KPI has no classification at all, so it belongs in
        # neither band rather than falling into the softer one.
        mild = self._log([self.early_warning])
        self._log([self.forced_labor])
        self._log()

        rows = self.get_list(kpi_risk="EARLY_WARNING").data["results"]

        self.assertEqual([row["id"] for row in rows], [mild])

    def test_a_call_carrying_both_bands_is_filed_under_forced_labor_only(self):
        # The agreed rule takes the severer KPI, so a Level 2 sitting next to a
        # Level 3 does not also make the call an early warning. Listing it in
        # both bands would contradict the single badge the row shows.
        level_three = Kpi.objects.create(description="Wages withheld", level=3)
        case_id = self._log([self.early_warning, level_three])

        forced_labor = self.get_list(kpi_risk="FORCED_LABOR").data["results"]
        early_warning = self.get_list(kpi_risk="EARLY_WARNING").data["results"]

        self.assertEqual([row["id"] for row in forced_labor], [case_id])
        self.assertEqual(early_warning, [])

    def test_a_level_the_rule_does_not_name_is_in_neither_band(self):
        # `KPI_LEVEL_CHOICES` allows Levels 1 and 5 and the catalogue holds
        # neither. The rule names 2, 3 and 4 only, so this endpoint does not
        # quietly widen it -- if a Level 5 ever means forced labor, or a Level
        # 1 an early warning, both sides change together.
        for level in (1, 5):
            with self.subTest(level=level):
                unnamed = Kpi.objects.create(
                    description=f"Undefined band {level}", level=level
                )
                self._log([unnamed])

                self.assertEqual(
                    self.get_list(kpi_risk="FORCED_LABOR").data["count"], 0
                )
                self.assertEqual(
                    self.get_list(kpi_risk="EARLY_WARNING").data["count"], 0
                )

    def test_a_call_is_listed_once_however_many_kpis_match(self):
        # The filter is an `Exists`, not a join: two Level 4 KPIs on one call
        # would otherwise come back as two rows.
        also_forced_labor = Kpi.objects.create(
            description="Wages withheld to bind the worker", level=3
        )
        case_id = self._log([self.forced_labor, also_forced_labor])

        response = self.get_list(kpi_risk="FORCED_LABOR")

        self.assertEqual(response.data["count"], 1)
        self.assertEqual([row["id"] for row in response.data["results"]], [case_id])


class WorkerVoiceCaseSupplierAndPhoneFilterTests(WorkerVoiceCaseTestBase):
    """The supplier and phone boxes in the table header."""

    def test_the_supplier_box_matches_part_of_the_name(self):
        case = Case.objects.get(pk=self.post(self.payload()).data["id"])
        case.supplier = Supplier.objects.create(name="Blue Sea Foods")
        case.save(update_fields=["supplier"])
        self.post(self.payload())

        rows = self.get_list(supplier="sea").data["results"]

        self.assertEqual([row["id"] for row in rows], [case.pk])

    def test_the_phone_box_matches_part_of_the_number(self):
        wanted = self.post(self.payload(client_phonenumber="+95 912345678")).data
        self.post(self.payload(client_phonenumber="+66 812223333"))

        rows = self.get_list(phone="9123").data["results"]

        self.assertEqual([row["id"] for row in rows], [wanted["id"]])

    def test_the_free_text_search_covers_the_supplier(self):
        case = Case.objects.get(pk=self.post(self.payload()).data["id"])
        case.supplier = Supplier.objects.create(name="Blue Sea Foods")
        case.save(update_fields=["supplier"])
        self.post(self.payload())

        rows = self.get_list(search="Blue Sea").data["results"]

        self.assertEqual([row["id"] for row in rows], [case.pk])


class WorkerVoiceCaseSearchTests(WorkerVoiceCaseTestBase):
    def setUp(self):
        super().setUp()
        self.post(
            self.payload(
                client_nickname="Aung",
                interaction_summary="Unpaid overtime at the packing line.",
            )
        )
        self.post(
            self.payload(
                client_nickname="Bopha",
                interaction_summary="Passport withheld by the broker.",
            )
        )
        self.aung, self.bopha = Case.objects.order_by("id")

    def search(self, term):
        response = self.get_list(search=term)
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_search_matches_the_worker_nickname(self):
        data = self.search("bopha")

        self.assertEqual([row["id"] for row in data["results"]], [self.bopha.id])

    def test_search_matches_the_summary_text(self):
        data = self.search("overtime")

        self.assertEqual([row["id"] for row in data["results"]], [self.aung.id])

    def test_search_matches_a_related_lookup_name(self):
        # Every case here shares one nationality, so this proves the join is
        # searched at all rather than proving which row comes back.
        data = self.search("Nepali")

        self.assertEqual(data["count"], 2)

    def test_search_narrows_the_paginated_count(self):
        # The count drives the pager, so it has to reflect the search rather
        # than the organization's whole caseload.
        data = self.search("Bopha")

        self.assertEqual(data["count"], 1)

    def test_a_numeric_term_finds_the_case_by_id(self):
        # `SearchFilter` alone cannot do this -- `icontains` on the integer
        # primary key is a database error.
        data = self.search(str(self.bopha.id))

        self.assertEqual([row["id"] for row in data["results"]], [self.bopha.id])

    def test_search_does_not_reach_another_organization(self):
        Case.objects.create(
            case_created_by=self.other_user, client_nickname="Bopha"
        )

        data = self.search("Bopha")

        self.assertEqual([row["id"] for row in data["results"]], [self.bopha.id])

    def test_no_search_term_returns_everything(self):
        self.assertEqual(self.search("")["count"], 2)


class WorkerVoiceCaseDeleteTests(WorkerVoiceCaseTestBase):
    def setUp(self):
        super().setUp()
        self.own_case = Case.objects.create(
            case_created_by=self.user, interaction_summary="ours"
        )
        self.foreign_case = Case.objects.create(
            case_created_by=self.other_user, interaction_summary="theirs"
        )

    def test_an_officer_can_delete_their_organizations_call(self):
        response = self.delete_case(self.own_case.id)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Case.objects.filter(pk=self.own_case.id).exists())

    def test_a_colleague_can_delete_the_same_organizations_call(self):
        colleague = User.objects.create(username="colleague2", email="c2@cso.org")
        UserOrganization.objects.create(
            user=colleague, organization=self.organization
        )

        response = self.delete_case(self.own_case.id, user=colleague)

        self.assertEqual(response.status_code, 204)

    def test_another_organizations_call_cannot_be_deleted(self):
        response = self.delete_case(self.foreign_case.id)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Case.objects.filter(pk=self.foreign_case.id).exists())

    def test_deleting_a_call_takes_its_attachments_with_it(self):
        attachment = SharedFile.create_from_upload(
            SimpleUploadedFile("scan.pdf", b"%PDF-", content_type="application/pdf")
        )
        self.own_case.attachments.add(attachment)

        self.delete_case(self.own_case.id)

        self.assertFalse(SharedFile.objects.filter(pk=attachment.pk).exists())

    def test_an_attachment_another_case_still_uses_is_kept(self):
        attachment = SharedFile.create_from_upload(
            SimpleUploadedFile("scan.pdf", b"%PDF-", content_type="application/pdf")
        )
        self.own_case.attachments.add(attachment)
        keeper = Case.objects.create(case_created_by=self.user)
        keeper.attachments.add(attachment)

        self.delete_case(self.own_case.id)

        self.assertTrue(SharedFile.objects.filter(pk=attachment.pk).exists())


class WorkerVoiceCaseDetailLabelTests(WorkerVoiceCaseTestBase):
    """The read-only "view call" panel draws labels, not ids.

    Resolving them in the browser would mean a request per lookup table, and
    the geography ones are parameterized by their parent, so they are answered
    here instead.
    """

    def setUp(self):
        super().setUp()
        created = self.post(self.payload(client_nickname="Aung"))
        self.case = Case.objects.get(pk=created.data["id"])

    def test_detail_resolves_the_lookup_labels(self):
        response = self.get_detail(self.case.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["client_nationality_name"], "Nepali")
        self.assertEqual(
            response.data["interaction_reason_name"], self.reason.name
        )
        self.assertEqual(
            response.data["client_contract_type_name"], self.contract_type.name
        )
        self.assertEqual(
            response.data["client_origin_country_name"], self.country.name
        )

    def test_an_unset_lookup_reads_as_null(self):
        # Most of the form is optional, so a missing foreign key has to render
        # as "no answer" rather than break the panel.
        response = self.get_detail(self.case.id)

        self.assertIsNone(response.data["case_status_name"])
        self.assertIsNone(response.data["client_document_type_name"])
        self.assertIsNone(response.data["next_steps_issara_staff_name"])

    def test_the_officer_is_named_not_numbered(self):
        self.user.first_name = "Nilar"
        self.user.last_name = "Win"
        self.user.save()

        response = self.get_detail(self.case.id)

        self.assertEqual(response.data["interaction_issara_staff_name"], "Nilar Win")

    def test_an_officer_with_no_full_name_falls_back_to_the_username(self):
        response = self.get_detail(self.case.id)

        self.assertEqual(response.data["interaction_issara_staff_name"], "officer")

    def test_selected_kpis_carry_their_wording_and_category(self):
        from kpis.models import Kpi, KpiCategory

        category = KpiCategory.objects.create(name="Wages")
        kpi = Kpi.objects.create(
            description="Workers are paid the legal minimum wage.",
            kpi_category=category,
        )
        self.case.kpis.set([kpi])

        response = self.get_detail(self.case.id)

        self.assertEqual(
            response.data["kpi_details"],
            [
                {
                    "id": kpi.id,
                    "description": "Workers are paid the legal minimum wage.",
                    "category": "Wages",
                }
            ],
        )


class WorkerVoiceAttachmentRemovalTests(WorkerVoiceCaseTestBase):
    """Editing a call can take files off it as well as add them."""

    def setUp(self):
        super().setUp()
        self.case = Case.objects.create(
            case_created_by=self.user, interaction_summary="ours"
        )
        self.attachment = SharedFile.create_from_upload(
            SimpleUploadedFile("scan.pdf", b"%PDF-", content_type="application/pdf")
        )
        self.case.attachments.add(self.attachment)

    def test_removed_attachment_is_taken_off_the_call_and_deleted(self):
        response = self.patch_case(
            self.case.id, {"removed_attachment_ids": [self.attachment.id]}
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.case.attachments.count(), 0)
        self.assertFalse(SharedFile.objects.filter(pk=self.attachment.pk).exists())

    def test_an_attachment_another_case_still_uses_is_only_detached(self):
        keeper = Case.objects.create(case_created_by=self.user)
        keeper.attachments.add(self.attachment)

        self.patch_case(
            self.case.id, {"removed_attachment_ids": [self.attachment.id]}
        )

        self.assertEqual(self.case.attachments.count(), 0)
        self.assertTrue(SharedFile.objects.filter(pk=self.attachment.pk).exists())

    def test_an_id_this_case_does_not_hold_is_ignored(self):
        other_case = Case.objects.create(case_created_by=self.other_user)
        other_attachment = SharedFile.create_from_upload(
            SimpleUploadedFile("other.pdf", b"%PDF-", content_type="application/pdf")
        )
        other_case.attachments.add(other_attachment)

        response = self.patch_case(
            self.case.id, {"removed_attachment_ids": [other_attachment.id]}
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(SharedFile.objects.filter(pk=other_attachment.pk).exists())
        self.assertEqual(other_case.attachments.count(), 1)

    def test_the_files_that_were_kept_are_still_listed(self):
        kept = SharedFile.create_from_upload(
            SimpleUploadedFile("kept.pdf", b"%PDF-", content_type="application/pdf")
        )
        self.case.attachments.add(kept)

        response = self.patch_case(
            self.case.id, {"removed_attachment_ids": [self.attachment.id]}
        )

        names = [item["name"] for item in response.data["attachments"]]
        self.assertEqual(names, ["kept.pdf"])

    def test_the_edit_form_is_handed_the_saved_attachments(self):
        response = self.get_detail(self.case.id)

        self.assertEqual(
            [item["name"] for item in response.data["attachments"]], ["scan.pdf"]
        )

    def test_logging_a_new_call_ignores_the_removal_field(self):
        response = self.post(self.payload(removed_attachment_ids=[]))

        self.assertEqual(response.status_code, 201, response.data)


class WorkerVoiceCaseKpiDescriptionTests(WorkerVoiceCaseTestBase):
    """The "Issue Description" column, which draws KPI descriptions.

    Round four: Ana asked for the text ILM shows under "Kpi" rather than the
    interaction reason the column used to carry. Legacy sends the same thing
    from `CaseLeanSerializer.get_translated_kpis` -- the KPI described in the
    reader's language, falling back to the English row.
    """

    def setUp(self):
        super().setUp()
        self.overtime = Kpi.objects.create(
            description="Excessive overtime", level=2
        )
        self.passport = Kpi.objects.create(
            description="Passport retention", level=4
        )
        self.burmese = Language.objects.create(code="mm", name="Burmese")

    def log(self, kpis=(), **overrides):
        response = self.post(self.payload(kpis=[kpi.id for kpi in kpis], **overrides))
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def row(self, case_id, **params):
        rows = self.get_list(**params).data["results"]
        return next(row for row in rows if row["id"] == case_id)

    def test_the_column_carries_the_description_of_each_kpi(self):
        case_id = self.log([self.overtime, self.passport])

        self.assertCountEqual(
            self.row(case_id)["kpi_descriptions"],
            ["Excessive overtime", "Passport retention"],
        )

    def test_a_call_with_no_kpi_carries_an_empty_list(self):
        case_id = self.log()

        self.assertEqual(self.row(case_id)["kpi_descriptions"], [])

    def test_the_levels_are_still_sent_alongside_the_descriptions(self):
        # The forced-labor risk column reads `kpi_levels`, and round four must
        # not disturb it: both fields describe the same KPIs.
        case_id = self.log([self.overtime, self.passport])

        row = self.row(case_id)
        self.assertCountEqual(row["kpi_levels"], [2, 4])
        self.assertEqual(len(row["kpi_descriptions"]), 2)

    def test_a_translation_is_used_when_the_reader_asks_for_that_language(self):
        KpiTranslation.objects.create(
            kpi=self.overtime,
            language=self.burmese,
            description="Burmese for excessive overtime",
            goal="",
        )
        case_id = self.log([self.overtime])

        # `my` is the facelift's locale code; ILM stores the language as `mm`.
        self.assertEqual(
            self.row(case_id, lang="my")["kpi_descriptions"],
            ["Burmese for excessive overtime"],
        )

    def test_an_untranslated_kpi_falls_back_to_english(self):
        KpiTranslation.objects.create(
            kpi=self.overtime,
            language=self.burmese,
            description="Burmese for excessive overtime",
            goal="",
        )
        case_id = self.log([self.overtime, self.passport])

        self.assertCountEqual(
            self.row(case_id, lang="my")["kpi_descriptions"],
            ["Burmese for excessive overtime", "Passport retention"],
        )

    def test_an_unmapped_language_code_would_find_nothing(self):
        # The point of the map: `my` is what the facelift sends, `mm` is what
        # ILM stores. Asking for the raw ILM code works too, and asking for a
        # language nobody has translated reads English.
        KpiTranslation.objects.create(
            kpi=self.overtime,
            language=self.burmese,
            description="Burmese for excessive overtime",
            goal="",
        )
        case_id = self.log([self.overtime])

        self.assertEqual(
            self.row(case_id, lang="mm")["kpi_descriptions"],
            ["Burmese for excessive overtime"],
        )
        self.assertEqual(
            self.row(case_id, lang="th")["kpi_descriptions"],
            ["Excessive overtime"],
        )

    def test_no_language_at_all_reads_english(self):
        case_id = self.log([self.overtime])

        self.assertEqual(
            self.row(case_id)["kpi_descriptions"], ["Excessive overtime"]
        )

    def test_the_column_box_matches_part_of_a_kpi_description(self):
        wanted = self.log([self.passport])
        self.log([self.overtime])

        rows = self.get_list(kpi="passport").data["results"]

        self.assertEqual([row["id"] for row in rows], [wanted])

    def test_the_column_box_matches_the_english_text_not_the_translation(self):
        """The dashboards are English-only for now, so the box is too.

        A call whose KPI has a Burmese translation is still found by its
        English description -- including when the column is being rendered in
        Burmese. Pinned because it is the compromise this column rests on: if
        another language is ever turned on for these users, this test is where
        the disagreement shows up first.
        """
        KpiTranslation.objects.create(
            kpi=self.overtime,
            language=self.burmese,
            description="Burmese for excessive overtime",
            goal="",
        )
        case_id = self.log([self.overtime])

        by_english = self.get_list(kpi="excessive", lang="my").data["results"]
        self.assertEqual([row["id"] for row in by_english], [case_id])

        # And the row it returns is still drawn in the language asked for.
        self.assertEqual(
            by_english[0]["kpi_descriptions"], ["Burmese for excessive overtime"]
        )

    def test_a_call_whose_two_kpis_both_match_is_listed_once(self):
        # `Exists`, not a join on the many-to-many, which would duplicate it.
        overtime_too = Kpi.objects.create(
            description="Excessive overtime without consent", level=2
        )
        case_id = self.log([self.overtime, overtime_too])

        rows = self.get_list(kpi="excessive").data["results"]

        self.assertEqual([row["id"] for row in rows], [case_id])

    def test_the_free_text_search_still_does_not_match_kpi_descriptions(self):
        # The column's own box is a narrower promise than "search everything";
        # the free-text box is unchanged and leaves KPIs alone.
        self.log([self.passport])

        rows = self.get_list(search="Passport retention").data["results"]

        self.assertEqual(rows, [])

    def test_the_free_text_search_still_covers_the_other_columns(self):
        # Narrowing the search must not narrow it too far: what it matched
        # before round four, it still matches.
        case_id = self.log([self.overtime], client_nickname="Aung")
        self.log([self.passport], client_nickname="Bopha")

        rows = self.get_list(search="Aung").data["results"]

        self.assertEqual([row["id"] for row in rows], [case_id])

    def test_the_free_text_search_still_finds_a_call_by_its_number(self):
        wanted = self.log([self.overtime])
        self.log([self.passport])

        rows = self.get_list(search=str(wanted)).data["results"]

        self.assertEqual([row["id"] for row in rows], [wanted])

    def test_the_interaction_reason_is_still_available_on_the_row(self):
        # Only the column changed. The reason is still collected on step 1 and
        # still read by the detail panel, so it stays on the payload.
        case_id = self.log([self.overtime])

        self.assertEqual(
            self.row(case_id)["interaction_reason_name"], self.reason.name
        )


class WorkerVoiceCaseColumnFilterTests(WorkerVoiceCaseTestBase):
    """The per-column search boxes in the table's header row."""

    def setUp(self):
        super().setUp()
        self.other_nationality = Nationality.objects.create(name="Cambodian")
        self.other_channel = InteractionChannel.objects.create(
            name="Hotline", cso_only=True
        )
        self.post(
            self.payload(
                client_nickname="Aung",
                interacted="2026-08-28",
                worker_identification_risk_level="HIGH",
            )
        )
        self.post(
            self.payload(
                client_nickname="Bopha",
                interacted="2026-08-29",
                client_nationality=self.other_nationality.id,
                interaction_channel=self.other_channel.id,
                worker_identification_risk_level="LOW",
            )
        )
        self.aung, self.bopha = Case.objects.order_by("id")

    def ids(self, **params):
        return [row["id"] for row in self.get_list(**params).data["results"]]

    def test_the_id_box_goes_straight_to_that_call(self):
        self.assertEqual(self.ids(id=self.bopha.id), [self.bopha.id])

    def test_the_date_box_matches_the_date_shown_in_the_row(self):
        self.assertEqual(self.ids(date="2026-08-28"), [self.aung.id])

    def test_a_date_nothing_was_logged_on_matches_nothing(self):
        self.assertEqual(self.ids(date="2026-08-30"), [])

    def test_the_worker_box_matches_part_of_a_nickname(self):
        self.assertEqual(self.ids(worker="ung"), [self.aung.id])

    def test_lookup_columns_are_matched_by_their_label(self):
        self.assertEqual(self.ids(nationality="cambod"), [self.bopha.id])
        self.assertEqual(self.ids(channel="hotline"), [self.bopha.id])

    def test_the_risk_dropdown_matches_the_stored_level(self):
        self.assertEqual(self.ids(risk="HIGH"), [self.aung.id])

    def test_column_boxes_narrow_each_other(self):
        self.assertEqual(self.ids(worker="Aung", risk="LOW"), [])

    def test_a_column_box_narrows_the_free_text_search(self):
        self.assertEqual(
            self.ids(search="Aung", nationality="cambod"), []
        )

    def test_the_count_reflects_the_filtered_rows(self):
        self.assertEqual(self.get_list(risk="LOW").data["count"], 1)

    def test_filtering_stays_inside_the_callers_organization(self):
        Case.objects.create(
            case_created_by=self.other_user, client_nickname="Aung"
        )

        self.assertEqual(self.ids(worker="Aung"), [self.aung.id])


class WorkerVoiceSupplierAndLocationTests(WorkerVoiceCaseTestBase):
    """The supplier picker on step 1, and the location it fills in.

    Picking a supplier auto-populates country/province/district in the client
    from the supplier record, as the legacy call wizard does. The three columns
    are stored per case rather than re-derived on read, so the officer can
    correct a supplier whose own location is blank or stale -- which means the
    endpoint has to accept whatever the form sends, including nothing.
    """

    def setUp(self):
        super().setUp()
        self.province = Province.objects.create(
            name="Bagmati", country=self.country
        )
        self.district = District.objects.create(
            name="Kathmandu", province=self.province
        )
        self.supplier = Supplier.objects.create(
            name="Alpha Seafood",
            country=self.country,
            province=self.province,
            district=self.district,
        )
        self.other_country = Country.objects.create(name="Thailand")
        self.other_supplier = Supplier.objects.create(
            name="Beta Textiles", country=self.other_country
        )

    def test_supplier_and_its_location_round_trip(self):
        response = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.country.id,
                province=self.province.id,
                district=self.district.id,
            )
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.supplier_id, self.supplier.id)
        self.assertEqual(case.country_id, self.country.id)
        self.assertEqual(case.province_id, self.province.id)
        self.assertEqual(case.district_id, self.district.id)

    def test_a_call_can_still_be_logged_without_a_supplier(self):
        # The second product flow: the worker cannot name the workplace, or it
        # is not in ILM yet. Nothing about the supplier field is required.
        response = self.post(self.payload())

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertIsNone(case.supplier_id)
        self.assertIsNone(case.country_id)

    def test_switching_supplier_replaces_the_stored_location(self):
        created = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.country.id,
                province=self.province.id,
                district=self.district.id,
            )
        )
        case_id = created.data["id"]

        response = self.patch_case(
            case_id,
            {
                "supplier": self.other_supplier.id,
                "country": self.other_country.id,
                "province": None,
                "district": None,
            },
        )

        self.assertEqual(response.status_code, 200, response.data)
        case = Case.objects.get(pk=case_id)
        self.assertEqual(case.supplier_id, self.other_supplier.id)
        self.assertEqual(case.country_id, self.other_country.id)
        # The first supplier's province and district must not survive the swap.
        self.assertIsNone(case.province_id)
        self.assertIsNone(case.district_id)

    def test_clearing_the_supplier_clears_its_location(self):
        created = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.country.id,
                province=self.province.id,
                district=self.district.id,
            )
        )
        case_id = created.data["id"]

        response = self.patch_case(
            case_id,
            {
                "supplier": None,
                "country": None,
                "province": None,
                "district": None,
            },
        )

        self.assertEqual(response.status_code, 200, response.data)
        case = Case.objects.get(pk=case_id)
        self.assertIsNone(case.supplier_id)
        self.assertIsNone(case.country_id)
        self.assertIsNone(case.province_id)
        self.assertIsNone(case.district_id)

    def test_a_location_the_officer_corrected_is_what_is_stored(self):
        # The three fields stay editable after the auto-fill, so the endpoint
        # must not overwrite them with the supplier's own values on save.
        response = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.other_country.id,
                province=None,
                district=None,
            )
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertEqual(case.supplier_id, self.supplier.id)
        self.assertEqual(case.country_id, self.other_country.id)

    def test_reading_a_call_back_names_the_supplier_and_its_location(self):
        created = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.country.id,
                province=self.province.id,
                district=self.district.id,
            )
        )

        response = self.get_detail(created.data["id"])

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["supplier"], self.supplier.id)
        self.assertEqual(response.data["supplier_name"], "Alpha Seafood")
        self.assertEqual(response.data["country_name"], "Nepal")
        self.assertEqual(response.data["province_name"], "Bagmati")
        self.assertEqual(response.data["district_name"], "Kathmandu")

    def test_an_explicit_null_supplier_is_accepted_on_create(self):
        """The form posts the key, not an absent key.

        `buildPayload` always sends `supplier: formData.supplierId`, so an
        unknown workplace arrives as an explicit `null` rather than an omitted
        field. DRF treats those two differently -- `required=False` covers the
        omission, `allow_null=True` covers this -- so the flow the client
        actually performs gets its own test.
        """
        response = self.post(
            self.payload(
                supplier=None, country=None, province=None, district=None
            )
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(pk=response.data["id"])
        self.assertIsNone(case.supplier_id)

    def test_editing_a_call_that_never_had_a_supplier(self):
        """Scenario 3: open a supplier-less call, change something else, save.

        The edit form re-posts every field it holds, so the supplier arrives as
        `null` again on a call that never had one. That must stay a 200 and
        must not invent a supplier.
        """
        created = self.post(self.payload())
        case_id = created.data["id"]

        detail = self.get_detail(case_id)
        self.assertIsNone(detail.data["supplier"])

        response = self.patch_case(
            case_id,
            {
                "supplier": None,
                "country": None,
                "province": None,
                "district": None,
                "interaction_summary": "Follow-up call, still no workplace named.",
            },
        )

        self.assertEqual(response.status_code, 200, response.data)
        case = Case.objects.get(pk=case_id)
        self.assertIsNone(case.supplier_id)
        self.assertEqual(
            case.interaction_summary, "Follow-up call, still no workplace named."
        )

    def test_editing_around_a_supplier_leaves_it_alone(self):
        """Scenario 4: an existing call with a supplier is not disturbed.

        Editing a different field on a call that has a workplace must leave the
        supplier and all three location columns exactly as they were.
        """
        created = self.post(
            self.payload(
                supplier=self.supplier.id,
                country=self.country.id,
                province=self.province.id,
                district=self.district.id,
            )
        )
        case_id = created.data["id"]

        response = self.patch_case(
            case_id, {"interaction_summary": "Worker called back."}
        )

        self.assertEqual(response.status_code, 200, response.data)
        case = Case.objects.get(pk=case_id)
        self.assertEqual(case.supplier_id, self.supplier.id)
        self.assertEqual(case.country_id, self.country.id)
        self.assertEqual(case.province_id, self.province.id)
        self.assertEqual(case.district_id, self.district.id)

    def test_labels_read_as_null_on_a_call_with_no_supplier(self):
        created = self.post(self.payload())

        response = self.get_detail(created.data["id"])

        self.assertIsNone(response.data["supplier_name"])
        self.assertIsNone(response.data["country_name"])
