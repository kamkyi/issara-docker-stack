import json

from authkit import WorkOSAuthKitAuthentication
from django.db import transaction
from django.shortcuts import get_object_or_404
from issara.ilm_server_2.models import (
    PolicyCompliance,
    SPWorkplan,
    SharedFile,
    StrategicPartner,
    WorkplanDocs,
)
from issara.ilm_server_2.permissions import IlmUserGroups
from rest_framework import serializers, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings

from issara.ilm_server_2.audience import (
    exclude_private_for,
    user_owns_strategic_partner,
)


SAFE_ACTIONS = ("list", "retrieve")


class WorkplanFileReadSerializer(serializers.ModelSerializer):
    shared_file_id = serializers.SerializerMethodField()
    category_slugs = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    file_path = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )
    description = serializers.SerializerMethodField()

    class Meta:
        model = WorkplanDocs
        fields = [
            "id",
            "shared_file_id",
            "category_slugs",
            "name",
            "file_path",
            "document_type",
            "document_type_display",
            "document_name",
            "description",
            "audience",
        ]

    def get_shared_file_id(self, obj):
        return obj.document_id

    def get_category_slugs(self, obj):
        return list(obj.categories.values_list("name", flat=True))

    def get_name(self, obj):
        return getattr(obj.document, "name", None)

    def get_file_path(self, obj):
        doc = obj.document
        if doc and doc.file_path:
            try:
                return doc.file_path.url
            except Exception:
                return str(doc.file_path)
        return None

    def get_description(self, obj):
        return getattr(obj.document, "description", None)


class WorkplanFileWriteSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(
        choices=WorkplanDocs._meta.get_field("document_type").choices,
        required=False,
    )
    document_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file = serializers.FileField(required=False)
    shared_file_id = serializers.IntegerField(required=False)
    category_slugs = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    audience = serializers.ChoiceField(
        choices=WorkplanDocs._meta.get_field("audience").choices,
        required=False,
    )

    def to_internal_value(self, data):
        if hasattr(data, "getlist"):
            mutable = data.__class__(
                "", mutable=True, encoding=getattr(data, "encoding", None)
            )

            for key, values in data.lists():
                mutable.setlist(key, values)

            raw = mutable.get("category_slugs")
            if isinstance(raw, str) and raw.startswith("["):
                try:
                    mutable.setlist("category_slugs", json.loads(raw))
                except (TypeError, ValueError):
                    pass

            data = mutable

        return super().to_internal_value(data)

    def validate(self, data):
        if not self.instance:
            # Create requires either a file upload or a shared_file_id reference
            if not data.get("file") and not data.get("shared_file_id"):
                raise serializers.ValidationError(
                    "Provide either 'file' (upload) or 'shared_file_id' (existing file)."
                )
            if not data.get("document_type"):
                raise serializers.ValidationError(
                    {"document_type": "Required when creating a Work Plan file."}
                )

        category_slugs = data.get("category_slugs")
        if category_slugs is not None:
            categories = list(PolicyCompliance.objects.filter(name__in=category_slugs))
            known = {category.name for category in categories}
            unknown = [slug for slug in category_slugs if slug not in known]
            if unknown:
                raise serializers.ValidationError(
                    {"category_slugs": f"Unknown categor(y/ies): {', '.join(unknown)}"}
                )
            data["_categories"] = categories

        return data


class StrategicPartnerWorkplanFileViewSet(viewsets.ViewSet):
    authentication_classes = (WorkOSAuthKitAuthentication,) + tuple(
        api_settings.DEFAULT_AUTHENTICATION_CLASSES
    )
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def _sp_id(self):
        return int(self.kwargs["sp_id"])

    def _user_role(self, user):
        claims = getattr(user, "claims", None) or {}
        return claims.get("role") or ""

    def _user_can_access(self, user, sp_id):
        if user.groups.filter(name=IlmUserGroups.ISSRA_STAFF.value).exists():
            return True

        role = self._user_role(user)
        if role in ("org-global-partner", "org-strategic-partner", "org-partner"):
            return True

        # Supplier users can list/retrieve but not modify
        if role == "org-supplier":
            return self.action in SAFE_ACTIONS

        from issara.ilm_server_2.models import StrategicPartnerUser
        return StrategicPartnerUser.objects.filter(
            user=user, strategic_partner_id=sp_id
        ).exists()

    def _get_workplan(self, sp_id):
        sp = get_object_or_404(StrategicPartner, pk=sp_id)
        workplan, _ = SPWorkplan.objects.get_or_create(
            strategic_partner=sp,
            defaults={
                "fp_name": "",
                "fp_title": "mr",
                "status": "saved",
                "suggested_date": "2024-01-01",
                "current_step": "introduction",
            },
        )
        return workplan

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        sp_id = self._sp_id()
        get_object_or_404(StrategicPartner, pk=sp_id)
        if not self._user_can_access(request.user, sp_id):
            self.permission_denied(
                request, message="You do not have access to this company."
            )

    def _visible_docs(self, request, workplan, sp_id):
        """Work Plan docs the requester may see; `private` is owner-only."""
        docs = WorkplanDocs.objects.filter(workplan=workplan)
        return exclude_private_for(
            docs, user_owns_strategic_partner(request.user, sp_id)
        )

    def list(self, request, sp_id=None):
        sp_id = int(sp_id)
        workplan = self._get_workplan(sp_id)
        docs = (
            self._visible_docs(request, workplan, sp_id)
            .select_related("document")
            .prefetch_related("categories")
            .order_by("-created_at")
        )
        return Response(WorkplanFileReadSerializer(docs, many=True).data)

    def retrieve(self, request, sp_id=None, pk=None):
        sp_id = int(sp_id)
        workplan = self._get_workplan(sp_id)
        doc = get_object_or_404(
            self._visible_docs(request, workplan, sp_id), pk=pk
        )
        return Response(WorkplanFileReadSerializer(doc).data)

    def create(self, request, sp_id=None):
        write = WorkplanFileWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        validated = write.validated_data
        workplan = self._get_workplan(int(sp_id))

        with transaction.atomic():
            uploaded_file = validated.get("file")
            shared_file_id = validated.get("shared_file_id")
            categories = validated.get("_categories")

            if uploaded_file:
                shared_file = SharedFile.create_from_upload(
                    uploaded_file,
                    type="O",
                )
            else:
                shared_file = get_object_or_404(SharedFile, pk=shared_file_id)

            doc = WorkplanDocs.objects.create(
                workplan=workplan,
                document=shared_file,
                document_type=validated["document_type"],
                document_name=validated.get("document_name") or "",
                **(
                    {"audience": validated["audience"]}
                    if "audience" in validated
                    else {}
                ),
            )
            if categories is not None:
                doc.categories.set(categories)

        return Response(
            WorkplanFileReadSerializer(doc).data, status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, sp_id=None, pk=None):
        workplan = self._get_workplan(int(sp_id))
        doc = get_object_or_404(WorkplanDocs, pk=pk, workplan=workplan)

        write = WorkplanFileWriteSerializer(instance=doc, data=request.data, partial=True)
        write.is_valid(raise_exception=True)
        validated = write.validated_data

        update_fields = []
        if "document_type" in validated:
            doc.document_type = validated["document_type"]
            update_fields.append("document_type")
        if "document_name" in validated:
            doc.document_name = validated["document_name"]
            update_fields.append("document_name")
        if "audience" in validated:
            doc.audience = validated["audience"]
            update_fields.append("audience")
        if "file" in validated or "shared_file_id" in validated:
            uploaded_file = validated.get("file")
            shared_file_id = validated.get("shared_file_id")
            if uploaded_file:
                doc.document = SharedFile.create_from_upload(
                    uploaded_file,
                    type="O",
                )
            elif shared_file_id:
                doc.document = get_object_or_404(SharedFile, pk=shared_file_id)
            update_fields.append("document")

        if update_fields:
            update_fields.append("updated_at")
            doc.save(update_fields=update_fields)

        if "category_slugs" in validated:
            doc.categories.set(validated.get("_categories") or [])

        return Response(WorkplanFileReadSerializer(doc).data)

    def destroy(self, request, sp_id=None, pk=None):
        workplan = self._get_workplan(int(sp_id))
        doc = get_object_or_404(WorkplanDocs, pk=pk, workplan=workplan)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
