from rest_framework import serializers
from .models import (
    WorkerFeedback,
    Grievance,
    WorkerContactReason,
    WorkerContactReasonTranslation,
    TotalNumberOfWorkers,
)
from django.contrib.auth.models import User
from issara.ilm_server_2.models import SharedFile, Supplier


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class WorkerContactReasonSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = WorkerContactReason
        fields = [
            "id",
            "name",
            "description",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_name(self, obj):
        request = self.context.get("request")
        lang_code = "en"
        if request:
            lang_code = request.query_params.get("lang", "en").lower()

        translations = getattr(obj, "translations", None)
        if translations:
            preferred = next(
                (t for t in translations.all() if t.language.code == lang_code),
                None,
            )
            if preferred:
                return preferred.name
            if lang_code != "en":
                fallback = next(
                    (t for t in translations.all() if t.language.code == "en"),
                    None,
                )
                if fallback:
                    return fallback.name

        return obj.name


class WorkerFeedbackAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedFile
        fields = ["id", "name", "type", "file_path", "permission", "size"]


class WorkerFeedbackSerializer(serializers.ModelSerializer):
    hr_staff = UserSerializer(read_only=True)
    hr_staff_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        source="hr_staff",
        required=False,
        allow_null=True,
    )
    contact_reason = WorkerContactReasonSerializer(read_only=True)
    contact_reason_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkerContactReason.objects.filter(is_active=True),
        write_only=True,
        source="contact_reason",
        required=False,
        allow_null=True,
    )
    next_steps_for_company_staff = UserSerializer(many=True, read_only=True)
    next_steps_for_company_staff_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        source="next_steps_for_company_staff",
        required=False,
        allow_empty=True,
    )
    additional_attachments = WorkerFeedbackAttachmentSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = WorkerFeedback
        fields = "__all__"

    def _get_attachment_type(self, uploaded_file):
        content_type = getattr(uploaded_file, "content_type", "") or ""
        if content_type.startswith("image/"):
            return "SPA"
        if content_type.startswith("video/"):
            return "SVA"
        return "O"

    def _get_additional_attachment_uploads(self):
        request = self.context.get("request")
        if not request or not hasattr(request, "FILES"):
            return []
        return request.FILES.getlist("additional_attachments")

    def _create_additional_attachments(self, uploaded_files):
        attachments = []
        for uploaded_file in uploaded_files:
            shared_file = SharedFile.create_from_upload(
                uploaded_file,
                type=self._get_attachment_type(uploaded_file),
            )
            attachments.append(shared_file)
        return attachments

    def create(self, validated_data):
        # Extract ManyToMany fields and ForeignKey fields
        request = self.context.get("request")
        request_user = getattr(request, "user", None)
        request_supplier = None
        if request_user and hasattr(request_user, "supplier_user"):
            request_supplier = request_user.supplier_user.supplier

        validated_data["supplier"] = request_supplier or validated_data.get("supplier")
        if validated_data.get("supplier") is None:
            raise serializers.ValidationError("Supplier is required.")

        hr_staff = validated_data.pop("hr_staff", None)
        next_steps_staff = validated_data.pop("next_steps_for_company_staff", [])
        issue_categories = validated_data.pop("issue_categories", [])
        selected_kpis = validated_data.pop("selected_kpis", [])
        kpi_categories = validated_data.pop("kpi_categories", [])
        additional_attachment_uploads = self._get_additional_attachment_uploads()

        # Create the instance without ManyToMany fields
        instance = WorkerFeedback.objects.create(**validated_data)

        # Set ForeignKey field
        if hr_staff is not None:
            instance.hr_staff = hr_staff
            instance.save()

        # Set ManyToMany fields
        instance.next_steps_for_company_staff.set(next_steps_staff)
        # Always set issue_categories to [1] regardless of frontend input
        instance.issue_categories.set([1])
        instance.selected_kpis.set(selected_kpis)
        instance.kpi_categories.set(kpi_categories)
        if additional_attachment_uploads:
            instance.additional_attachments.set(
                self._create_additional_attachments(additional_attachment_uploads)
            )

        return instance

    def update(self, instance, validated_data):
        # Extract ManyToMany fields and ForeignKey fields
        request = self.context.get("request")
        request_user = getattr(request, "user", None)
        if request_user and hasattr(request_user, "supplier_user"):
            validated_data["supplier"] = request_user.supplier_user.supplier
        else:
            validated_data.pop("supplier", None)

        hr_staff = validated_data.pop("hr_staff", None)
        next_steps_staff = validated_data.pop("next_steps_for_company_staff", None)
        issue_categories = validated_data.pop("issue_categories", None)
        selected_kpis = validated_data.pop("selected_kpis", None)
        kpi_categories = validated_data.pop("kpi_categories", None)
        additional_attachment_uploads = self._get_additional_attachment_uploads()

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update ForeignKey field
        if hr_staff is not None:
            instance.hr_staff = hr_staff

        instance.save()

        # Update ManyToMany fields
        if next_steps_staff is not None:
            instance.next_steps_for_company_staff.set(next_steps_staff)
        # Always set issue_categories to [1] regardless of frontend input
        instance.issue_categories.set([1])
        if selected_kpis is not None:
            instance.selected_kpis.set(selected_kpis)
        if kpi_categories is not None:
            instance.kpi_categories.set(kpi_categories)
        if additional_attachment_uploads:
            instance.additional_attachments.add(
                *self._create_additional_attachments(additional_attachment_uploads)
            )

        return instance


class GrievanceAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedFile
        fields = ["id", "name", "type", "file_path", "permission", "size"]


class GrievanceSerializer(serializers.ModelSerializer):
    """
    Serializer for the Grievance model
    """

    worker_feedback_id = serializers.IntegerField(write_only=True)
    worker_feedback = WorkerFeedbackSerializer(read_only=True)
    training_list = serializers.CharField(source="get_training_list", read_only=True)
    is_complete = serializers.BooleanField(read_only=True)
    information_collection_attachments = GrievanceAttachmentSerializer(
        many=True, read_only=True
    )
    remove_information_collection_attachments = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Grievance
        fields = [
            "id",
            "worker_feedback_id",
            "worker_feedback",
            # Information Collection (Step 2)
            "issara_context",
            "check_with_hr",
            "repeat_issue",
            "information_collection_notes",
            "information_collection_attachments",
            "remove_information_collection_attachments",
            # Safeguarding Workers (Step 3)
            "zero_tolerance",
            "reviewed_individual",
            "involved_in_grievance",
            "safeguarding_notes",
            # Ethical Investigation (Step 4)
            "ethical_reviewed",
            "professional_ensured",
            "impartial_ensured",
            "inclusive_and_accessible",
            "timely_and_effective",
            "ethical_investigation_notes",
            # Worker Communication (Step 5)
            "investigation_their_wellbeing",
            "need_help_with_complex_consequences",
            "communication_notes",
            # Monitoring & Communication (Step 6)
            "remediation",
            "system_strengthening",
            # Training Requirements (Step 7)
            "trainings",
            "training_list",
            # Legacy fields
            "received_the_training",
            "has_trained_impartial",
            # Computed fields
            "is_complete",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def _get_attachment_type(self, uploaded_file):
        content_type = getattr(uploaded_file, "content_type", "") or ""
        if content_type.startswith("image/"):
            return "SPA"
        if content_type.startswith("video/"):
            return "SVA"
        return "O"

    def _get_information_collection_attachment_uploads(self):
        request = self.context.get("request")
        if not request or not hasattr(request, "FILES"):
            return []
        return request.FILES.getlist("information_collection_attachments")

    def _create_information_collection_attachments(self, uploaded_files):
        attachments = []
        for uploaded_file in uploaded_files:
            shared_file = SharedFile.create_from_upload(
                uploaded_file,
                type=self._get_attachment_type(uploaded_file),
            )
            attachments.append(shared_file)
        return attachments

    def create(self, validated_data):
        worker_feedback_id = validated_data.pop("worker_feedback_id")
        validated_data.pop("remove_information_collection_attachments", None)
        request = self.context.get("request")

        supplier_id = None
        if request and hasattr(request.user, "supplier_user"):
            supplier_id = request.user.supplier_user.supplier_id

        try:
            worker_feedback_queryset = WorkerFeedback.objects.filter(
                id=worker_feedback_id
            )
            if supplier_id is not None:
                worker_feedback_queryset = worker_feedback_queryset.filter(
                    supplier_id=supplier_id
                )
            worker_feedback = worker_feedback_queryset.get()
        except WorkerFeedback.DoesNotExist:
            raise serializers.ValidationError(
                "WorkerFeedback with this ID does not exist for this supplier."
            )

        validated_data["worker_feedback"] = worker_feedback
        attachment_uploads = self._get_information_collection_attachment_uploads()
        grievance = Grievance.objects.create(**validated_data)

        if attachment_uploads:
            grievance.information_collection_attachments.set(
                self._create_information_collection_attachments(attachment_uploads)
            )
        return grievance

    def update(self, instance, validated_data):
        validated_data.pop("worker_feedback_id", None)
        remove_ids = validated_data.pop(
            "remove_information_collection_attachments", None
        )
        attachment_uploads = self._get_information_collection_attachment_uploads()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if remove_ids:
            instance.information_collection_attachments.remove(*remove_ids)
        if attachment_uploads:
            instance.information_collection_attachments.add(
                *self._create_information_collection_attachments(attachment_uploads)
            )
        return instance


class SupplierCsvSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)

    industries_names = serializers.SerializerMethodField()
    subindustries_names = serializers.SerializerMethodField()
    supply_chains = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "anonymous",
            # location names
            "country_name",
            "province_name",
            "district_name",
            "lat",
            "lng",
            # industries / subindustries (names)
            "industries_names",
            "subindustries_names",
            # worker voice
            "worker_voice",
            "worker_voice_status",
            "is_worker_voice_rolled_out",
            # workers by nationality (from worker_counts relation)
            "total_num_thai_workers",
            "total_num_cambodian_workers",
            "total_num_myanmar_workers",
            "total_num_lao_workers",
            "total_num_vietnamese_workers",
            "total_num_nepalese_workers",
            "total_num_bangladeshi_workers",
            "total_num_indonesian_workers",
            "total_num_malaysian_workers",
            "total_num_indian_workers",
            "total_num_pakistani_workers",
            "total_num_sri_lankan_workers",
            # supply chains (we'll flatten in the CSV)
            "supply_chains",
        ]

    def get_total_num_thai_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_thai_workers if worker_counts else 0

    def get_total_num_cambodian_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_cambodian_workers if worker_counts else 0

    def get_total_num_myanmar_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_myanmar_workers if worker_counts else 0

    def get_total_num_lao_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_lao_workers if worker_counts else 0

    def get_total_num_vietnamese_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_vietnamese_workers if worker_counts else 0

    def get_total_num_nepalese_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_nepalese_workers if worker_counts else 0

    def get_total_num_bangladeshi_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_bangladeshi_workers if worker_counts else 0

    def get_total_num_indonesian_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_indonesian_workers if worker_counts else 0

    def get_total_num_malaysian_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_malaysian_workers if worker_counts else 0

    def get_total_num_indian_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_indian_workers if worker_counts else 0

    def get_total_num_pakistani_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_pakistani_workers if worker_counts else 0

    def get_total_num_sri_lankan_workers(self, obj):
        worker_counts = TotalNumberOfWorkers.objects.filter(supplier_id=obj.id).first()
        return worker_counts.total_num_sri_lankan_workers if worker_counts else 0

    def get_industries_names(self, obj):
        # uses prefetched industries (see view), so no N+1
        return [i.name for i in obj.industries.all()]

    def get_subindustries_names(self, obj):
        return [si.name for si in obj.subindustries.all()]

    def get_supply_chains(self, obj):
        """
        Returns a list of {'name': ..., 'status': ...}
        using the reverse relation suppliersupplychain_set
        (prefetched in the view).
        """
        chains = []
        for link in obj.suppliersupplychain_set.all():
            if link.supply_chain:
                chains.append(
                    {
                        "name": link.supply_chain.name,
                        "status": link.status,
                    }
                )
        return chains


class TotalNumberOfWorkersSerializer(serializers.ModelSerializer):
    """
    Serializer for TotalNumberOfWorkers model
    """

    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    calculated_total = serializers.IntegerField(
        source="calculate_total", read_only=True
    )

    class Meta:
        model = TotalNumberOfWorkers
        fields = [
            'id',
            'supplier',
            'supplier_name',
            'total_num_workers',
            'total_num_men_workers',
            'total_num_women_workers',
            'total_num_thai_workers',
            'total_num_thai_male_workers',
            'total_num_thai_female_workers',
            'total_num_cambodian_workers',
            'total_num_cambodian_male_workers',
            'total_num_cambodian_female_workers',
            'total_num_myanmar_workers',
            'total_num_myanmar_male_workers',
            'total_num_myanmar_female_workers',
            'total_num_lao_workers',
            'total_num_lao_male_workers',
            'total_num_lao_female_workers',
            'total_num_vietnamese_workers',
            'total_num_vietnamese_male_workers',
            'total_num_vietnamese_female_workers',
            'total_num_nepalese_workers',
            'total_num_nepalese_male_workers',
            'total_num_nepalese_female_workers',
            'total_num_bangladeshi_workers',
            'total_num_bangladeshi_male_workers',
            'total_num_bangladeshi_female_workers',
            'total_num_indonesian_workers',
            'total_num_indonesian_male_workers',
            'total_num_indonesian_female_workers',
            'total_num_malaysian_workers',
            'total_num_malaysian_male_workers',
            'total_num_malaysian_female_workers',
            'total_num_indian_workers',
            'total_num_indian_male_workers',
            'total_num_indian_female_workers',
            'total_num_pakistani_workers',
            'total_num_pakistani_male_workers',
            'total_num_pakistani_female_workers',
            'total_num_sri_lankan_workers',
            'total_num_sri_lankan_male_workers',
            'total_num_sri_lankan_female_workers',
            'calculated_total',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "supplier_name",
            "calculated_total",
        ]