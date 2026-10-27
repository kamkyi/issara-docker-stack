from rest_framework import serializers
from issara.ilm_server_2.models import (
    PriorityActivityBase,
    PriorityActivityGroup,
    WorkPlanAuditTrail,
)
from .models import WorkplanEmailNotificationSetting, WorkplanEmailNotificationLog


class PriorityActivityGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriorityActivityGroup
        fields = ["id", "name"]


class PriorityActivityBaseSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(source="group.id", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    group_description = serializers.CharField(
        source="group.description", read_only=True
    )

    class Meta:
        model = PriorityActivityBase
        fields = [
            "id",
            "category",
            "description",
            "group_id",
            "group_name",
            "group_description",
        ]


class WorkPlanAuditTrailSerializer(serializers.ModelSerializer):
    workplan_id = serializers.IntegerField(
        source="workplan.id", read_only=True)
    strategic_partner_id = serializers.SerializerMethodField()

    class Meta:
        model = WorkPlanAuditTrail
        fields = "__all__"

    def get_strategic_partner_id(self, obj):
        if obj.workplan and obj.workplan.strategic_partner:
            return obj.workplan.strategic_partner.id
        return None


class WorkplanEmailNotificationSettingSerializer(serializers.ModelSerializer):
    issara_user_display = serializers.StringRelatedField(
        source="issara_user", read_only=True
    )
    issara_user_email = serializers.CharField(
        source="issara_user.email", read_only=True
    )
    issara_user_full_name = serializers.SerializerMethodField()
    sp_user_display = serializers.StringRelatedField(
        source="sp_user", read_only=True)
    sp_user_email = serializers.CharField(
        source="sp_user.email", read_only=True)
    sp_user_full_name = serializers.SerializerMethodField()
    strategic_partner_name = serializers.CharField(
        source="strategic_partner.name", read_only=True
    )
    strategic_partner_display = serializers.StringRelatedField(
        source="strategic_partner", read_only=True
    )

    class Meta:
        model = WorkplanEmailNotificationSetting
        fields = [
            "id",
            "sp_user",
            "sp_user_display",
            "sp_user_email",
            "sp_user_full_name",
            "issara_user",
            "issara_user_display",
            "issara_user_email",
            "issara_user_full_name",
            "strategic_partner",
            "strategic_partner_display",
            "strategic_partner_name",
            "notify_on_workplan_change",
            "notify_on_document_upload",
            "created_at",
        ]

    def get_issara_user_full_name(self, obj):
        if obj.issara_user:
            full_name = (
                f"{obj.issara_user.first_name} {obj.issara_user.last_name}".strip()
            )
            return full_name if full_name else obj.issara_user.username
        return ""

    def get_sp_user_full_name(self, obj):
        if obj.sp_user:
            full_name = f"{obj.sp_user.first_name} {obj.sp_user.last_name}".strip()
            return full_name if full_name else obj.sp_user.username
        return ""

    def validate(self, data):
        """
        Validate that the user-partner combination is unique (handled by model constraint)
        but provide a friendlier error message.
        """
        if self.instance is None:  # Creating new instance
            issara_user = data.get("issara_user")
            strategic_partner = data.get("strategic_partner")
            sp_user = data.get("sp_user", None)

            if WorkplanEmailNotificationSetting.objects.filter(
                issara_user=issara_user,
                strategic_partner=strategic_partner,
                sp_user=sp_user,
            ).exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            f"Notification setting already exists for user {issara_user} and partner {strategic_partner} and SP user {sp_user}"
                        ]
                    }
                )

        return data


class WorkplanEmailNotificationLogSerializer(serializers.ModelSerializer):
    sp_user = serializers.SerializerMethodField()
    issara_user = serializers.SerializerMethodField()

    class Meta:
        model = WorkplanEmailNotificationLog
        fields = [
            "id",
            "sent_at",
            "event_type",
            "details",
            "setting",
            "sp_user",
            "issara_user",
        ]

    def get_sp_user(self, obj):
        if obj.setting and obj.setting.sp_user:
            return {
                "id": obj.setting.sp_user.id,
                "email": obj.setting.sp_user.email,
                "username": getattr(obj.setting.sp_user, "username", None),
                "first_name": getattr(obj.setting.sp_user, "first_name", None),
                "last_name": getattr(obj.setting.sp_user, "last_name", None),
            }
        return None

    def get_issara_user(self, obj):
        if obj.setting and obj.setting.issara_user:
            return {
                "id": obj.setting.issara_user.id,
                "email": obj.setting.issara_user.email,
                "username": getattr(obj.setting.issara_user, "username", None),
                "first_name": getattr(obj.setting.issara_user, "first_name", None),
                "last_name": getattr(obj.setting.issara_user, "last_name", None),
            }
        return None
