from rest_framework import serializers
from django.urls import reverse

from issara.ilm_server_2.models import SharedFile

from .models import (
    Grievance,
    Remediation,
    SystemStrengthening,
    Note,
    InformationCollectionNote,
    SafeGuardingNote,
    EthicalInvestigationNote,
    CommunicatingNote,
    Trainings,
)
from .permissions import can_edit_supplier_kpi_grievance, can_view_attachment


class GrievanceAttachmentSerializer(serializers.ModelSerializer):
    file_path = serializers.SerializerMethodField()

    class Meta:
        model = SharedFile
        fields = ["id", "name", "type", "file_path", "permission", "size"]

    def get_file_path(self, obj):
        request = self.context.get("request")
        grievance = self.context.get("grievance")
        if not request or not grievance:
            return None
        path = reverse(
            "supplier-kpi-grievance-attachment-download",
            kwargs={
                "skpi_id": grievance.supplier_kpi_id,
                "pk": grievance.id,
                "attachment_id": obj.id,
            },
        )
        return request.build_absolute_uri(path)


class TrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trainings
        fields = ["id", "name"]


class NoteSerializer(serializers.ModelSerializer):
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ["id", "value", "created_at", "updated_at", "author", "author_email"]

    get_author_email = lambda self, obj: obj.author.email if obj.author else None


class InformationCollectionNoteSerializer(NoteSerializer):
    class Meta(NoteSerializer.Meta):
        model = InformationCollectionNote


class SafeGuardingNoteSerializer(NoteSerializer):
    class Meta(NoteSerializer.Meta):
        model = SafeGuardingNote


class EthicalInvestigationNoteSerializer(NoteSerializer):
    class Meta(NoteSerializer.Meta):
        model = EthicalInvestigationNote


class CommunicatingNoteSerializer(NoteSerializer):
    class Meta(NoteSerializer.Meta):
        model = CommunicatingNote


class RemediationSerializer(serializers.ModelSerializer):
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = Remediation
        fields = [
            "id",
            "description",
            "created_at",
            "updated_at",
            "author",
            "author_email",
            "is_submitted",
        ]

    get_author_email = lambda self, obj: obj.author.email if obj.author else None


class SystemStrengtheningSerializer(serializers.ModelSerializer):
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = SystemStrengthening
        fields = [
            "id",
            "description",
            "created_at",
            "updated_at",
            "author",
            "author_email",
        ]

    get_author_email = lambda self, obj: obj.author.email if obj.author else None


class GrievanceSerializer(serializers.ModelSerializer):
    remediation = serializers.SerializerMethodField()
    system_strengthening = serializers.SerializerMethodField()
    information_collection_notes = serializers.SerializerMethodField()
    safeguarding_notes = serializers.SerializerMethodField()
    ethical_investigation_notes = serializers.SerializerMethodField()
    communication_notes = serializers.SerializerMethodField()
    trainings = serializers.SerializerMethodField()
    list_of_text_fields = serializers.SerializerMethodField()
    information_collection_attachments = serializers.SerializerMethodField()

    class Meta:
        model = Grievance
        fields = "__all__"

    @staticmethod
    def _text_payload(data, field):
        """Accept only the editable text value from nested client payloads."""
        if not isinstance(data, dict):
            return {}
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return {}
        return {field: value}

    @staticmethod
    def _remediation_entries(request):
        """Normalize the incoming remediation payload into a list of entries.

        Prefers the ``remediations`` array (multiple updates persist as separate
        rows); falls back to the legacy single ``remediation`` object so older
        callers keep working."""
        data = request.data
        entries = data.get("remediations")
        if isinstance(entries, list):
            return entries
        single = data.get("remediation")
        if isinstance(single, dict) and single:
            return [single]
        return []

    def _sync_remediations(self, grievance, entries, user):
        """Persist the supplier's remediation updates as individual rows.

        Draft rows (is_submitted=False) are created/updated/removed to match the
        incoming array; already-submitted rows are immutable history and left
        untouched. On submit (grievance no longer a draft) the surviving rows are
        marked submitted. This lets several updates coexist in one draft."""
        is_draft = grievance.is_draft
        existing = {
            row.id: row
            for row in Remediation.objects.filter(
                grievance=grievance, is_submitted=False
            )
        }
        kept = set()
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            # Already-submitted entries are immutable history — never rewrite them.
            if entry.get("is_submitted") is True:
                continue
            description = (entry.get("description") or "").strip()
            entry_id = entry.get("id")
            row = existing.get(entry_id) if isinstance(entry_id, int) else None
            if row is not None:
                if not description:
                    # Emptied by the user — drop it (handled by the cleanup below).
                    continue
                row.description = description
                row.author = user
                row.is_submitted = not is_draft
                row.save()
                kept.add(row.id)
            elif description:
                created = Remediation.objects.create(
                    grievance=grievance,
                    description=description,
                    author=user,
                    is_submitted=not is_draft,
                )
                kept.add(created.id)
        # Remove draft rows the user cleared or deleted from the list.
        for row_id, row in existing.items():
            if row_id not in kept and not row.is_submitted:
                row.delete()

    def create(self, validated_data):
        system_strengthening_data = self._text_payload(
            self.context["request"].data.get("system_strengthening", {}),
            "description",
        )

        # notes
        information_collection_note = self._text_payload(
            self.context["request"].data.get("information_collection_notes", {}),
            "value",
        )
        safeguarding_notes = self._text_payload(
            self.context["request"].data.get("safeguarding_notes", {}), "value"
        )
        ethical_investigation_notes = self._text_payload(
            self.context["request"].data.get("ethical_investigation_notes", {}),
            "value",
        )
        communication_notes = self._text_payload(
            self.context["request"].data.get("communication_notes", {}), "value"
        )

        # Trainings
        trainings_data = self.context["request"].data.get("trainings") or []

        grievance = Grievance.objects.create(**validated_data)

        # Get current User
        user = self.context["request"].user

        child_payloads = (
            (SystemStrengthening, system_strengthening_data),
            (InformationCollectionNote, information_collection_note),
            (SafeGuardingNote, safeguarding_notes),
            (EthicalInvestigationNote, ethical_investigation_notes),
            (CommunicatingNote, communication_notes),
        )
        for model_class, payload in child_payloads:
            if payload:
                model_class.objects.create(
                    grievance=grievance,
                    author=user,
                    is_submitted=not grievance.is_draft,
                    **payload,
                )

        self._sync_remediations(
            grievance,
            self._remediation_entries(self.context["request"]),
            user,
        )

        for training_name in trainings_data:
            training, created = Trainings.objects.get_or_create(name=training_name)
            grievance.trainings.add(training)

        return grievance

    def update(self, instance, validated_data):
        system_strengthening_data = self.context["request"].data.get(
            "system_strengthening", {}
        )
        information_collection_notes = self.context["request"].data.get(
            "information_collection_notes", {}
        )
        safeguarding_notes = self.context["request"].data.get("safeguarding_notes", {})
        ethical_investigation_notes = self.context["request"].data.get(
            "ethical_investigation_notes", {}
        )
        communication_notes = self.context["request"].data.get(
            "communication_notes", {}
        )

        trainings_data = self.context["request"].data.get("trainings", None)

        instance = super().update(instance, validated_data)

        user = self.context["request"].user

        note_mapping = [
            (InformationCollectionNote, information_collection_notes),
            (SafeGuardingNote, safeguarding_notes),
            (EthicalInvestigationNote, ethical_investigation_notes),
            (CommunicatingNote, communication_notes),
            (SystemStrengthening, system_strengthening_data),
        ]

        for model_class, data in note_mapping:
            self.update_or_create_note_or_data(
                model_class, instance, user, data, instance.is_draft
            )

        self._sync_remediations(
            instance,
            self._remediation_entries(self.context["request"]),
            user,
        )

        if trainings_data is not None:
            instance.trainings.clear()
            for training_name in trainings_data:
                training, created = Trainings.objects.get_or_create(name=training_name)
                instance.trainings.add(training)

        return instance

    def update_or_create_note_or_data(
        self, model_class, instance, user, data, is_draft
    ):
        field = (
            "description"
            if model_class in (Remediation, SystemStrengthening)
            else "value"
        )
        payload = self._text_payload(data, field)
        matching_objects = model_class.objects.filter(
            grievance=instance, is_submitted=False
        )

        if matching_objects.count() > 1:
            first_object = matching_objects.first()
            matching_objects.exclude(pk=first_object.pk).delete()

        if not payload:
            matching_objects.delete()
            return None, False

        obj, created = model_class.objects.update_or_create(
            grievance=instance,
            is_submitted=False,
            defaults={
                **payload,
                "author": user,
                "is_submitted": not is_draft,
            },
        )
        return obj, created

    def get_remediation(self, obj):
        remediation = (
            Remediation.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "description")
            .first()
        )
        return remediation if remediation else {"description": ""}

    def get_system_strengthening(self, obj):
        system_strengthening = (
            SystemStrengthening.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "description")
            .first()
        )
        return system_strengthening if system_strengthening else {"description": ""}

    def get_information_collection_notes(self, obj):
        information_collection_note = (
            InformationCollectionNote.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "value")
            .first()
        )
        return (
            information_collection_note
            if information_collection_note != None
            else {"value": ""}
        )

    def get_safeguarding_notes(self, obj):
        safeguarding_note = (
            SafeGuardingNote.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "value")
            .first()
        )
        return safeguarding_note if safeguarding_note else {"value": ""}

    def get_ethical_investigation_notes(self, obj):
        ethical_investigation_note = (
            EthicalInvestigationNote.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "value")
            .first()
        )
        return (
            ethical_investigation_note if ethical_investigation_note else {"value": ""}
        )

    def get_communication_notes(self, obj):
        communication_note = (
            CommunicatingNote.objects.filter(grievance=obj, is_submitted=False)
            .values("id", "value")
            .first()
        )
        return communication_note if communication_note else {"value": ""}

    def get_trainings(self, obj):
        return obj.trainings.values_list("name", flat=True)

    def get_information_collection_attachments(self, obj):
        request = self.context.get("request")
        attachments = obj.information_collection_attachments.all()
        if request:
            attachments = [
                attachment
                for attachment in attachments
                if can_view_attachment(request.user, obj, attachment)
            ]
        return GrievanceAttachmentSerializer(
            attachments,
            many=True,
            read_only=True,
            context={**self.context, "grievance": obj},
        ).data

    def get_list_of_text_fields(self, obj):
        # Editors (the supplier / Issara staff) see their in-progress draft
        # updates alongside submitted ones, so several remediation updates
        # persist and render across Save Draft. Read-only viewers (e.g. strategic
        # partners) still only see submitted history. Ordered oldest-first so the
        # "Remediation Update 1, 2, 3…" numbering is stable.
        request = self.context.get("request")
        can_edit = bool(
            request
            and can_edit_supplier_kpi_grievance(request.user, obj.supplier_kpi)
        )
        remediation_qs = Remediation.objects.filter(grievance=obj)
        if not can_edit:
            remediation_qs = remediation_qs.filter(is_submitted=True)
        remediations = RemediationSerializer(
            remediation_qs.order_by("created_at", "id"),
            many=True,
            read_only=True,
        ).data
        system_strengthenings = SystemStrengtheningSerializer(
            SystemStrengthening.objects.filter(
                grievance=obj, is_submitted=True
            ).order_by("-updated_at"),
            many=True,
            read_only=True,
        ).data
        information_collection_notes = InformationCollectionNoteSerializer(
            InformationCollectionNote.objects.filter(
                grievance=obj, is_submitted=True
            ).order_by("-updated_at"),
            many=True,
            read_only=True,
        ).data
        safeguarding_notes = SafeGuardingNoteSerializer(
            SafeGuardingNote.objects.filter(grievance=obj, is_submitted=True).order_by(
                "-updated_at"
            ),
            many=True,
            read_only=True,
        ).data
        ethical_investigation_notes = EthicalInvestigationNoteSerializer(
            EthicalInvestigationNote.objects.filter(
                grievance=obj, is_submitted=True
            ).order_by("-updated_at"),
            many=True,
            read_only=True,
        ).data
        communication_notes = CommunicatingNoteSerializer(
            CommunicatingNote.objects.filter(grievance=obj, is_submitted=True).order_by(
                "-updated_at"
            ),
            read_only=True,
            many=True,
        ).data
        return {
            "remediations": remediations,
            "system_strengthenings": system_strengthenings,
            "information_collection_notes": information_collection_notes,
            "safeguarding_notes": safeguarding_notes,
            "ethical_investigation_notes": ethical_investigation_notes,
            "communication_notes": communication_notes,
        }
