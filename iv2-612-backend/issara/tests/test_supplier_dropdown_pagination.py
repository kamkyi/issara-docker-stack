from django.contrib.auth.models import Group, User
from django.test import SimpleTestCase, TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate

from issara.ilm_server_2.models import Supplier, SupplierUser
from issara.ilm_server_2.suppliers.views import (
    SupplierListDropDownCursorPagination,
    SupplierListDropDownView,
)


class SupplierListDropDownCursorPaginationTest(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.paginator = SupplierListDropDownCursorPagination()

    def test_default_page_size_remains_twenty(self):
        request = Request(self.factory.get("/api/v2/supplier_list_dropdown/"))

        self.assertEqual(self.paginator.get_page_size(request), 20)

    def test_page_size_includes_every_requested_supplier_id(self):
        query = [("id", supplier_id) for supplier_id in range(1, 22)]
        request = Request(
            self.factory.get("/api/v2/supplier_list_dropdown/", query)
        )

        self.assertEqual(self.paginator.get_page_size(request), 21)


class SupplierListDropDownCSOAccessTest(TestCase):
    """Who the supplier picker offers, per group.

    A CSO officer logs a Worker Voice call against whichever workplace the
    worker names, so the picker has to offer the whole list. That is not a
    widening: `SupplierViewSet` already returns every supplier to these same
    users, and the legacy call wizard reads `/suppliers/{id}` off it for the
    country/province/district auto-fill. Before this branch existed the two
    disagreed -- the detail endpoint answered while the dropdown returned
    nothing -- which is what left CSO officers with an empty picker.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = SupplierListDropDownView.as_view({"get": "list"})

        self.alpha = Supplier.objects.create(name="Alpha Seafood")
        self.beta = Supplier.objects.create(name="Beta Textiles")

        self.cso_group = Group.objects.create(name="CSO")
        self.cso_user = User.objects.create(username="officer", email="o@cso.org")
        self.cso_user.groups.add(self.cso_group)

    def list_for(self, user, **params):
        request = self.factory.get("/api/v2/supplier_list_dropdown/", params)
        force_authenticate(request, user=user)
        response = self.view(request)
        response.render()
        return response

    def names(self, response):
        return sorted(result["name"] for result in response.data["results"])

    def test_cso_officer_sees_the_supplier_list(self):
        response = self.list_for(self.cso_user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.names(response), ["Alpha Seafood", "Beta Textiles"])

    def test_cso_officer_can_search_by_name(self):
        response = self.list_for(self.cso_user, name="alpha")

        self.assertEqual(self.names(response), ["Alpha Seafood"])

    def test_cso_officer_can_resolve_a_saved_supplier_id(self):
        # How the dropdown puts a name on a supplier it never listed, when an
        # officer reopens a saved call.
        response = self.list_for(self.cso_user, id=self.beta.id)

        self.assertEqual(self.names(response), ["Beta Textiles"])

    def test_the_picker_exposes_only_the_id_and_the_name(self):
        # Strictly less than `/suppliers/{id}` already hands the same user.
        response = self.list_for(self.cso_user)

        self.assertEqual(set(response.data["results"][0]), {"id", "name"})

    def test_a_user_in_no_recognized_group_still_sees_nothing(self):
        # The CSO branch is additive: it must not turn the fallback into an
        # open list for every authenticated account.
        stranger = User.objects.create(username="stranger", email="s@example.org")

        response = self.list_for(stranger)

        self.assertEqual(response.data["results"], [])

    def test_supplier_hr_is_still_limited_to_its_own_supplier(self):
        # A user in both groups must not be widened by the CSO branch: the
        # narrower SupplierHR rule is checked first and still wins.
        hr_group = Group.objects.create(name="SupplierHR")
        hr_user = User.objects.create(username="hr", email="hr@alpha.example")
        hr_user.groups.add(hr_group, self.cso_group)
        SupplierUser.objects.create(user=hr_user, supplier=self.alpha)

        response = self.list_for(hr_user)

        self.assertEqual(self.names(response), ["Alpha Seafood"])
