import tempfile
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib import admin
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from model_bakery import baker

from issara.ilm_server_2.models import (
    IssueCategory,
    Supplier,
    SupplierLicenseAgreement,
    SupplierUserTrackSelection,
)
from .admin import (
    SupplierAdmin,
    SupplierLicenseAgreementAdmin,
    SupplierLicenseAgreementInline,
    SupplierLicenseAgreementStatusForm,
    SupplierUserAccessStatusForm,
    SupplierUserTrackSelectionAdmin,
    apply_user_agreement_active_override,
    apply_user_access_active_override,
    delete_user_agreement,
    revoke_user_agreement_if_requested,
)
from .serializers import WorkerFeedbackSerializer


class SupplierAgreementAdminTests(SimpleTestCase):
    @patch("supplier.admin.reset_user_full_track_selection")
    def test_revoking_agreement_resets_only_that_users_full_track(self, reset_track):
        agreement = baker.prepare(
            "ilm_server_2.SupplierLicenseAgreement",
            revoked_at=None,
        )

        revoke_user_agreement_if_requested(
            agreement,
            False,
            "admin@example.test",
        )

        reset_track.assert_called_once_with(
            agreement,
            "admin@example.test",
            reason="Full Access agreement revoked by administrator",
        )

    @patch("supplier.admin.reset_user_full_track_selection")
    def test_editing_an_already_revoked_agreement_does_not_reset_new_access(
        self,
        reset_track,
    ):
        agreement = baker.prepare(
            "ilm_server_2.SupplierLicenseAgreement",
            revoked_at=timezone.now(),
        )

        revoke_user_agreement_if_requested(
            agreement,
            False,
            "admin@example.test",
        )

        reset_track.assert_not_called()

    @patch("supplier.admin.SupplierLicenseAgreement.objects.filter")
    @patch("supplier.admin.reset_user_full_track_selection")
    def test_deleting_agreement_resets_only_that_users_full_track(
        self,
        reset_track,
        agreement_filter,
    ):
        agreement = Mock(
            supplier_id=17792,
            signer_workos_user_id="user_supplier",
            agreement_version="cascade-full-access-v1.0",
            pk=123,
        )

        delete_user_agreement(agreement, "admin@example.test")

        reset_track.assert_called_once_with(
            agreement,
            "admin@example.test",
            reason="Full Access agreement deleted by administrator",
        )
        agreement.delete.assert_called_once_with()
        agreement_filter.assert_called_once_with(
            supplier_id=17792,
            signer_workos_user_id="user_supplier",
            agreement_version="cascade-full-access-v1.0",
            revoked_at__isnull=True,
        )

    def test_admin_can_revoke_one_user_agreement_without_deleting_history(self):
        agreement = baker.prepare(
            "ilm_server_2.SupplierLicenseAgreement",
            revoked_at=None,
            revoked_by_email=None,
        )

        changed = apply_user_agreement_active_override(
            agreement,
            False,
            "admin@example.test",
        )

        self.assertTrue(changed)
        self.assertIsNotNone(agreement.revoked_at)
        self.assertEqual(agreement.revoked_by_email, "admin@example.test")

    def test_revoked_agreement_cannot_be_reactivated(self):
        agreement = baker.prepare(
            "ilm_server_2.SupplierLicenseAgreement",
            id=123,
            revoked_at=timezone.now(),
            revoked_by_email="admin@example.test",
        )
        form = SupplierLicenseAgreementStatusForm(instance=agreement)
        form.cleaned_data = {"agreement_active": True}

        with self.assertRaisesMessage(
            ValidationError,
            "The supplier user must review and sign the agreement again.",
        ):
            form.clean_agreement_active()

    def test_user_agreement_form_initializes_from_revocation_state(self):
        active_form = SupplierLicenseAgreementStatusForm(
            instance=baker.prepare(
                "ilm_server_2.SupplierLicenseAgreement",
                agreement_version="cascade-full-access-v1.0",
                revoked_at=None,
            )
        )
        revoked_form = SupplierLicenseAgreementStatusForm(
            instance=baker.prepare(
                "ilm_server_2.SupplierLicenseAgreement",
                agreement_version="cascade-full-access-v1.0",
                revoked_at=timezone.now(),
            )
        )

        self.assertTrue(active_form.fields["agreement_active"].initial)
        self.assertFalse(revoked_form.fields["agreement_active"].initial)

    def test_agreement_records_can_be_deleted_from_admin(self):
        site = AdminSite()
        model_admin = SupplierLicenseAgreementAdmin(SupplierLicenseAgreement, site)
        inline = SupplierLicenseAgreementInline(
            Supplier,
            site,
        )
        self.assertTrue(model_admin.has_delete_permission(None))
        self.assertTrue(inline.has_delete_permission(None))

    def test_signer_details_are_visible_and_read_only_in_supplier_admin(self):
        site = AdminSite()
        inline = SupplierLicenseAgreementInline(Supplier, site)
        model_admin = SupplierLicenseAgreementAdmin(
            SupplierLicenseAgreement,
            site,
        )

        self.assertIn("signer_title", inline.fields)
        self.assertIn("signer_affiliation", inline.fields)
        self.assertIn("signer_title", inline.readonly_fields)
        self.assertIn("signer_affiliation", inline.readonly_fields)
        self.assertIn("signer_title", model_admin.list_display)
        self.assertIn("signer_affiliation", model_admin.list_display)

    def test_supplier_license_agreements_are_hidden_from_admin_index(self):
        self.assertFalse(admin.site.is_registered(SupplierLicenseAgreement))

    def test_supplier_inline_deletes_agreement_records(self):
        site = AdminSite()
        model_admin = SupplierAdmin(Supplier, site)
        deleted_object = SimpleNamespace(deleted=False)

        def delete():
            deleted_object.deleted = True

        deleted_object.delete = delete
        formset = SimpleNamespace(
            deleted_objects=[deleted_object],
            forms=[],
            save=lambda commit: [],
            save_m2m=lambda: None,
        )
        request = SimpleNamespace(user=SimpleNamespace(email="admin@example.test"))

        model_admin.save_formset(request, None, formset, True)

        self.assertTrue(deleted_object.deleted)

    @patch("supplier.admin.SupplierLicenseAgreement.objects.filter")
    def test_marketplace_access_can_be_reset_without_disabling_user(
        self,
        agreement_filter,
    ):
        selection = baker.prepare(
            "ilm_server_2.SupplierUserTrackSelection",
            track_selection=Supplier.TRACK_MARKETPLACE,
            revoked_at=None,
            revoked_by_email=None,
            revoked_reason=None,
        )

        changed = apply_user_access_active_override(
            selection,
            False,
            "admin@example.test",
        )

        self.assertTrue(changed)
        self.assertIsNotNone(selection.revoked_at)
        self.assertEqual(selection.revoked_by_email, "admin@example.test")
        agreement_filter.assert_not_called()

    def test_reset_access_cannot_be_reactivated_in_cms(self):
        selection = baker.prepare(
            "ilm_server_2.SupplierUserTrackSelection",
            id=123,
            revoked_at=timezone.now(),
        )
        form = SupplierUserAccessStatusForm(instance=selection)
        form.cleaned_data = {"access_active": True}

        with self.assertRaisesMessage(
            ValidationError,
            "supplier user must select a track again",
        ):
            form.clean_access_active()


class SupplierAgreementAdminDatabaseTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.model_admin = SupplierLicenseAgreementAdmin(
            SupplierLicenseAgreement,
            self.site,
        )
        self.access_admin = SupplierUserTrackSelectionAdmin(
            SupplierUserTrackSelection,
            self.site,
        )
        self.request = SimpleNamespace(
            user=SimpleNamespace(email="admin@example.test")
        )
        self.supplier = baker.make("ilm_server_2.Supplier")

    def make_agreement(self, **kwargs):
        defaults = {
            "supplier": self.supplier,
            "signer_name": "Supplier User",
            "signer_email": "supplier@example.test",
            "signer_workos_user_id": "user_supplier",
            "agreement_version": "cascade-full-access-v1.0",
            "agreement_text": "Agreement text",
            "agreement_text_hash": "a" * 64,
            "signed_at": timezone.now(),
        }
        defaults.update(kwargs)
        return SupplierLicenseAgreement.objects.create(**defaults)

    def test_revoke_action_only_revokes_selected_user(self):
        selected = self.make_agreement()
        other_user = self.make_agreement(
            signer_email="other@example.test",
            signer_workos_user_id="user_other",
        )
        SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_supplier",
            user_email="supplier@example.test",
            track_selection=Supplier.TRACK_FULL,
            selected_at=timezone.now(),
        )
        other_selection = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_other",
            user_email="other@example.test",
            track_selection=Supplier.TRACK_FULL,
            selected_at=timezone.now(),
        )

        self.model_admin.revoke_selected_agreements(
            self.request,
            SupplierLicenseAgreement.objects.filter(pk=selected.pk),
        )

        selected.refresh_from_db()
        other_user.refresh_from_db()
        self.assertIsNotNone(selected.revoked_at)
        self.assertEqual(selected.revoked_by_email, "admin@example.test")
        self.assertIsNone(other_user.revoked_at)
        selected_track = SupplierUserTrackSelection.objects.get(
            supplier=self.supplier,
            workos_user_id="user_supplier",
        )
        self.assertIsNotNone(selected_track.revoked_at)
        self.assertEqual(selected_track.revoked_by_email, "admin@example.test")
        self.assertTrue(
            SupplierUserTrackSelection.objects.filter(pk=other_selection.pk).exists()
        )
        other_selection.refresh_from_db()
        self.assertIsNone(other_selection.revoked_at)

    def test_signer_details_are_persisted_and_legacy_rows_remain_nullable(self):
        signed = self.make_agreement(
            signer_title="Compliance Manager",
            signer_affiliation="Example Supplier Co.",
        )
        legacy = self.make_agreement(
            signer_email="legacy@example.test",
            signer_workos_user_id="user_legacy",
            signer_title=None,
            signer_affiliation=None,
        )

        signed.refresh_from_db()
        legacy.refresh_from_db()
        self.assertEqual(signed.signer_title, "Compliance Manager")
        self.assertEqual(signed.signer_affiliation, "Example Supplier Co.")
        self.assertIsNone(legacy.signer_title)
        self.assertIsNone(legacy.signer_affiliation)

    def test_delete_invalidates_duplicate_active_rows_for_same_user(self):
        older = self.make_agreement(
            signed_at=timezone.now() - timedelta(days=1)
        )
        deleted = self.make_agreement()
        selection = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_supplier",
            user_email="supplier@example.test",
            track_selection=Supplier.TRACK_FULL,
            selected_at=timezone.now(),
        )

        self.model_admin.delete_model(self.request, deleted)

        self.assertFalse(
            SupplierLicenseAgreement.objects.filter(pk=deleted.pk).exists()
        )
        older.refresh_from_db()
        self.assertIsNotNone(older.revoked_at)
        self.assertEqual(older.revoked_by_email, "admin@example.test")
        selection.refresh_from_db()
        self.assertIsNotNone(selection.revoked_at)

    def test_marketplace_reset_affects_only_selected_supplier_user(self):
        selected = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_marketplace",
            user_email="marketplace@example.test",
            track_selection=Supplier.TRACK_MARKETPLACE,
            selected_at=timezone.now(),
        )
        other = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_other_marketplace",
            user_email="other-marketplace@example.test",
            track_selection=Supplier.TRACK_MARKETPLACE,
            selected_at=timezone.now(),
        )

        self.access_admin.reset_selected_access(
            self.request,
            SupplierUserTrackSelection.objects.filter(pk=selected.pk),
        )

        selected.refresh_from_db()
        other.refresh_from_db()
        self.assertIsNotNone(selected.revoked_at)
        self.assertEqual(selected.revoked_by_email, "admin@example.test")
        self.assertIsNone(other.revoked_at)

    def test_full_access_reset_revokes_only_that_users_agreement(self):
        selected_agreement = self.make_agreement()
        other_agreement = self.make_agreement(
            signer_email="other@example.test",
            signer_workos_user_id="user_other",
        )
        selected = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_supplier",
            user_email="supplier@example.test",
            track_selection=Supplier.TRACK_FULL,
            selected_at=timezone.now(),
        )
        other = SupplierUserTrackSelection.objects.create(
            supplier=self.supplier,
            workos_user_id="user_other",
            user_email="other@example.test",
            track_selection=Supplier.TRACK_FULL,
            selected_at=timezone.now(),
        )

        self.access_admin.revoke_selected_access(
            self.request,
            SupplierUserTrackSelection.objects.filter(pk=selected.pk),
        )

        selected.refresh_from_db()
        other.refresh_from_db()
        selected_agreement.refresh_from_db()
        other_agreement.refresh_from_db()
        self.assertIsNotNone(selected.revoked_at)
        self.assertIsNotNone(selected_agreement.revoked_at)
        self.assertIsNone(other.revoked_at)
        self.assertIsNone(other_agreement.revoked_at)


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class WorkerFeedbackSerializerTests(TestCase):
    def setUp(self):
        baker.make(IssueCategory, id=1)

    def test_create_saves_multiple_additional_attachments(self):
        supplier = baker.make("ilm_server_2.Supplier")
        files = [
            SimpleUploadedFile("evidence-1.txt", b"first file"),
            SimpleUploadedFile("evidence-2.txt", b"second file"),
        ]
        request = SimpleNamespace(
            user=SimpleNamespace(supplier_user=SimpleNamespace(supplier=supplier)),
            FILES=SimpleNamespace(
                getlist=lambda field_name: (
                    files if field_name == "additional_attachments" else []
                )
            ),
        )

        serializer = WorkerFeedbackSerializer(data={}, context={"request": request})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.additional_attachments.count(), 2)
        self.assertEqual(
            list(instance.additional_attachments.values_list("name", flat=True)),
            ["evidence-1.txt", "evidence-2.txt"],
        )

    def test_create_assigns_supplier_from_request_user(self):
        user = baker.make(get_user_model())
        supplier = baker.make("ilm_server_2.Supplier")
        baker.make("ilm_server_2.SupplierUser", user=user, supplier=supplier)
        request = SimpleNamespace(
            user=user,
            FILES=SimpleNamespace(getlist=lambda field_name: []),
        )

        serializer = WorkerFeedbackSerializer(data={}, context={"request": request})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.supplier_id, supplier.id)

    def test_update_appends_multiple_additional_attachments(self):
        instance = WorkerFeedbackSerializer(context={"request": None}).create(
            {"supplier": baker.make("ilm_server_2.Supplier")}
        )
        files = [
            SimpleUploadedFile("after-1.txt", b"one"),
            SimpleUploadedFile("after-2.txt", b"two"),
        ]
        request = SimpleNamespace(
            FILES=SimpleNamespace(
                getlist=lambda field_name: (
                    files if field_name == "additional_attachments" else []
                )
            )
        )

        serializer = WorkerFeedbackSerializer(
            instance,
            data={},
            partial=True,
            context={"request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_instance = serializer.save()

        self.assertEqual(updated_instance.additional_attachments.count(), 2)

    def test_update_keeps_supplier_from_request_user(self):
        original_supplier = baker.make("ilm_server_2.Supplier")
        replacement_supplier = baker.make("ilm_server_2.Supplier")
        user = baker.make(get_user_model())
        baker.make("ilm_server_2.SupplierUser", user=user, supplier=original_supplier)
        instance = WorkerFeedbackSerializer(context={"request": None}).create(
            {"supplier": replacement_supplier}
        )
        request = SimpleNamespace(
            user=user,
            FILES=SimpleNamespace(getlist=lambda field_name: []),
        )

        serializer = WorkerFeedbackSerializer(
            instance,
            data={"supplier": replacement_supplier.id},
            partial=True,
            context={"request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_instance = serializer.save()

        self.assertEqual(updated_instance.supplier_id, original_supplier.id)
