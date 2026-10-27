"""Which audience a lookup table should answer with: CSO, or everybody else.

Several small lookup tables (`client_types`, `interaction_reasons`,
`interaction_channels`, ...) carry `cso_only` / `hide_for_cso` flags so that the
CSO Worker Voice form offers org-neutral wording while the legacy ILM screens
keep the rows they have always had. Until now every one of those endpoints
picked the audience from the *caller's Django groups* alone.

That is wrong for one caller: the Cascade tester. An Issara Management user who
switches the Tester Floating Button to "CSO View" gets the CSO Worker Voice UI,
but their token still belongs to a Management account, so the lookups came back
with the Issara-worded rows -- the tester was reviewing a form no CSO will ever
see. The tester button deliberately does not mint a CSO token, so the *UI* has
to say which audience it is rendering.

`?cso_only=true` is that statement. It is scoped as narrowly as it can be:

* It only ever chooses between two sets of rows in a lookup table that every
  authenticated user may already read in full -- `ClientType`, `InteractionReason`
  and `InteractionChannel` are name-and-id reference data, not case data.
* It grants nothing. Organization scoping, object permissions and every write
  path keep reading the authenticated user, never this parameter. The Worker
  Voice case endpoints do not consult it at all.
* It cannot take anything away from a real CSO: `use_cso_audience` is an OR, so
  a CSO user gets the CSO rows with or without the parameter.
* A supplier is never flipped by it -- `InteractionChannel.get_for_user` keeps
  testing for a supplier membership first.

Callers that already had their own opt-in parameter (`ReferralActionViewSet`,
`CaseStatusViewSet`) are left alone: their rules genuinely differ, because their
org-worded rows carry `hide_for_cso` as a legacy leftover and a plain CSO branch
would drop them. The parameter name is shared; the per-table rule stays with the
table.
"""

from .permissions import IlmUserGroups

TRUTHY_QUERY_VALUES = frozenset({"1", "true", "yes"})


def is_cso_user(user):
    """True when the authenticated user really is in the CSO group."""
    if user is None or not getattr(user, "pk", None):
        return False
    return any(group.name == IlmUserGroups.CSO.value for group in user.groups.all())


def requests_cso_audience(request):
    """True when the client asked for the CSO rendering of this lookup."""
    if request is None:
        return False
    value = request.query_params.get("cso_only", "")
    return value.lower() in TRUTHY_QUERY_VALUES


def use_cso_audience(request):
    """Whether this request should be answered with the CSO row set.

    Either the caller is a CSO, or the caller is rendering the CSO UI and said
    so. Both arrive at exactly the same queryset, which is the point: what the
    tester reviews is what a CSO officer will see.
    """
    if request is None:
        return False
    return is_cso_user(getattr(request, "user", None)) or requests_cso_audience(request)
