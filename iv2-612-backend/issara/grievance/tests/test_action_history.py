"""Save Draft / Preview & Submit history recording.

Every save records who pressed which button as a GrievanceActionEvent, and the
history endpoint surfaces it with a clear label. The generic "Updated Form."
diff row (a save that only flips is_draft/send_email) is suppressed in favour of
that explicit event.
"""

import types

import pytest
from model_bakery import baker
from rest_framework.test import APIRequestFactory

from issara.grievance.models import Grievance, GrievanceActionEvent
from issara.grievance.views import GrievanceViewSet

from .test_permissions_and_immutability import _supplier_user

pytestmark = pytest.mark.django_db


def _fake_request(user, is_draft):
    return types.SimpleNamespace(user=user, data={"is_draft": is_draft})


def _grievance_for(user_name):
    supplier = baker.make("ilm_server_2.Supplier")
    user = _supplier_user(supplier, user_name)
    grievance = Grievance.objects.create(
        supplier_kpi=baker.make("kpis.SupplierKpi", supplier=supplier),
        is_draft=True,
    )
    return grievance, user


@pytest.mark.parametrize(
    "is_draft,expected_action",
    [
        (True, GrievanceActionEvent.ACTION_SAVED_DRAFT),
        (False, GrievanceActionEvent.ACTION_SUBMITTED),
        ("true", GrievanceActionEvent.ACTION_SAVED_DRAFT),
        ("false", GrievanceActionEvent.ACTION_SUBMITTED),
    ],
)
def test_record_action_event_captures_button_and_actor(is_draft, expected_action):
    grievance, user = _grievance_for("action-actor")

    GrievanceViewSet()._record_action_event(
        grievance, _fake_request(user, is_draft)
    )

    event = grievance.action_events.get()
    assert event.action == expected_action
    assert event.actor_id == user.id


def test_missing_is_draft_defaults_to_draft():
    view = GrievanceViewSet()
    for value in (True, "true", None):
        assert view._requested_is_draft(types.SimpleNamespace(data={"is_draft": value}))
    # Absent flag entirely.
    assert view._requested_is_draft(types.SimpleNamespace(data={}))


def test_history_includes_action_events_and_suppresses_form_only_rows():
    grievance, user = _grievance_for("action-history")

    # A content edit (Safeguarding) saved as a draft…
    grievance.zero_tolerance = True
    grievance._history_user = user
    grievance.save()
    GrievanceViewSet()._record_action_event(grievance, _fake_request(user, True))

    # …then a submit that only flips is_draft (no content change).
    grievance.is_draft = False
    grievance._history_user = user
    grievance.save()
    GrievanceViewSet()._record_action_event(grievance, _fake_request(user, False))

    view = GrievanceViewSet()
    view.kwargs = {"skpi_id": grievance.supplier_kpi_id, "pk": grievance.pk}
    view.request = types.SimpleNamespace(user=user)
    view.format_kwarg = None
    view.get_object = lambda: grievance

    response = view.history(view.request, pk=grievance.pk)
    actions = [entry["action"] for entry in response.data]

    assert "Saved draft." in actions
    assert "Submitted grievance for review." in actions
    # The content edit is still described…
    assert any(a.startswith("Updated Safeguarding") for a in actions)
    # …but the is_draft-only submit does not add a generic "Updated Form." row.
    assert "Updated Form." not in actions

    action_entries = [e for e in response.data if e["source_type"] == "action"]
    assert {e["actor"] for e in action_entries} == {
        f"{user.email} ({user.get_full_name()})".strip()
        if user.get_full_name().strip()
        else user.email
    }
    assert all(e["system_generated"] is False for e in action_entries)
