import json
import threading
from datetime import timedelta, datetime, date
from django.db.models import *
from django.db.models import Aggregate, CharField, DurationField, ExpressionWrapper, F
from django.db.models.functions import TruncDate


def get_type_path(type="O"):
    type_path_map = {
        "NF": "FlagIcon",
        "SP": "partners",
        "RA": "recruiters",
        "S": "suppliers",
        "IS": "staff",
        "SR": "Supplier Reports",
        "O": "other",
        "SPA": "Supplier Photo Attachments",
        "SVA": "Supplier Video Attachments",
    }
    return type_path_map[type]


class Concat(Aggregate):
    function = "GROUP_CONCAT"
    template = "%(function)s(%(distinct)s%(expressions)s)"
    allow_distinct = True

    def __init__(self, expression, distinct=False, **extra):
        super(Concat, self).__init__(
            expression,
            distinct="DISTINCT " if distinct else "",
            output_field=CharField(),
            **extra,
        )


class SupplierInformation:

    def cases_days(self, day=60):

        day = day + 1
        supplier_kpis = self.kpis.all()
        from datetime import datetime, date

        qs = supplier_kpis.annotate(close=TruncDate("closed_at")).annotate(
            duration=ExpressionWrapper(
                F(("close")) - F("opened_at"), output_field=DurationField()
            )
        )
        closed = qs.filter(duration__lt=timedelta(day), duration__isnull=False).count()
        if closed:
            return {"under60": closed}
        return {"under60": 0}

    def cases_quality_level(self):
        supplier_kpis = self.kpis.all().filter(status__name="Closed")
        if supplier_kpis:
            global data
            data = {
                "poor_quality": supplier_kpis.filter(closed_quality="Poor").count(),
                "fair_quality": supplier_kpis.filter(closed_quality="Fair").count(),
                "good_quality": supplier_kpis.filter(closed_quality="Good").count(),
                "excellent_quality": supplier_kpis.filter(
                    closed_quality="Excellent"
                ).count(),
            }

            return data
        return {}


class SPWorkplanAuditTrailMixin:

    from datetime import datetime, date

    """

from datetime import datetime, date
    For saving workplan history
    """

    def save_history(self, user=None, is_new=False):
        print("[DEBUG] save_history called for:", self)
        print("[DEBUG] user:", user)

        if self.__class__.__name__ == "SPWorkplan":
            workplan_id = self.pk
        else:
            workplan_id = (
                self.workplan.pk
                if hasattr(self, "workplan") and self.workplan
                else None
            )
        data = {
            "model": self.__class__.__name__,
            "workplan_id": workplan_id,
        }
        if user is not None:
            if hasattr(user, "username") and user.username:
                data["user"] = user.username
            elif hasattr(user, "email") and user.email:
                data["user"] = user.email
            elif hasattr(user, "get_username") and callable(user.get_username):
                data["user"] = user.get_username()
            else:
                data["user"] = str(user)
        else:
            try:
                if hasattr(self.user, "username"):
                    data["user"] = f"{self.user.username} (admin)"
                else:
                    data["user"] = f"{str(self.user)} (admin)"
            except AttributeError:
                data["user"] = "unknown_user"

        if not hasattr(self, "_loaded_values") or self._loaded_values is None:
            self._loaded_values = {}

        array = []
        if is_new:
            data["reason"] = "add"
            if self.__class__.__name__ == "SPWorkplan":
                # Always log a summary for new workplan creation
                summary = []
                field_label_map = {
                    "fp_name": "Fp Name",
                    "fp_title": "Fp Title",
                    "current_step": "Current Step",
                    "status": "Status",
                    "suggested_date": "Suggested Date",
                    "strategic_partner_id": "Strategic Partner Id",
                }
                for field in ["fp_name", "suggested_date"]:
                    value = getattr(self, field, None)
                    if value is not None:
                        label = field_label_map.get(field, field)
                        summary.append(f"{label}: {value}")
                if summary:
                    array.extend(summary)
                # Always append fallback entry for new workplan creation
                array.append(["New record created", None, None])
            elif self.__class__.__name__ == "WorkplanDocs":
                filename = getattr(self.document, "name", None) or str(self.document)
                doc_type = getattr(self, "document_type", None)
                if doc_type:
                    doc_type = str(doc_type).replace("_", " ").title()
                array.append(f"New File Uploaded for {doc_type} → {filename}")
            elif self.__class__.__name__ == "WorkplanMainGoal":
                field_label_map = {
                    "ethical_recruitment": "Ethical Recruitment",
                    "partnership_areas": "Partnership Areas",
                    "worker_voice_escalation": "Worker Voice Escalation",
                    "priority_suppliers_countries_regions": "Priority Suppliers Countries Regions",
                }
                for field, label in field_label_map.items():
                    value = getattr(self, field, None)
                    if value:
                        array.append([label, None, value])
            elif self.__class__.__name__ == "WorkplanNotesRemark":
                if hasattr(self, "txt_value") and self.txt_value:
                    array.append(f"Notes and Remark: {self.txt_value}")
            elif self.__class__.__name__ == "PriorityActivity":
                if hasattr(self, "priority_status") and self.priority_status:
                    array.append(f"Priority Status: {self.priority_status}")
                if hasattr(self, "txt_value") and self.txt_value:
                    array.append(f"Text Value: {self.txt_value}")
            elif self.__class__.__name__ == "WorkplanProgressIndicator":
                # Always log a meaningful string for indicator audit entries (as a single string, not array)
                description = getattr(self, "txt_value", None) or getattr(
                    self, "str_value", "Progress Indicator"
                )
                if (
                    description
                    and "_" in description
                    and not description.startswith("IMPACT INDICATOR")
                ):
                    field_mappings = {
                        "institutional_capacity_building_training_management_leadership_note": "Institutional capacity building: training of management/leadership",
                        "institutional_capacity_building_training_working_technical_staff_note": "Institutional capacity building: training of working level/technical staff",
                        "institutional_capacity_building_ethical_recruitment_trainings_note": "Institutional capacity building: ethical recruitment trainings",
                        "worker_satisfaction_surveys_note": "Worker satisfaction surveys",
                        "recruitment_survey_fees_note": "Recruitment System Assessment",
                        "communication_disclosure_recruitment_agencies_note": "Communications: disclosure of recruitment agencies used",
                        "review_msas_employer_supplier_recruitment_note": "Review of MSAs between employer/suppliers and recruitment agencies",
                        "percentage_tier1_suppliers_with_issara_worker_voice_channels_note": "Percentage of tier-1 suppliers (export level) in your supply chain with Issara worker voice channels available to workers",
                        "percentage_upstream_suppliers_with_issara_worker_voice_channels_note": "Percentage of upstream (tier-2 and beyond) suppliers in your supply chain with Issara worker voice channels available to workers, based on supply chain information provided",
                    }
                    if description in field_mappings:
                        description = field_mappings[description]
                    else:
                        description = description.replace("_", " ").title()
                details = []
                if hasattr(self, "progress_status") and self.progress_status:
                    details.append(f"Status: {self.progress_status}")
                if hasattr(self, "numeric_value") and self.numeric_value is not None:
                    details.append(f"Score: {self.numeric_value}")
                if hasattr(self, "notes") and self.notes:
                    details.append(f"Notes: {self.notes}")
                if not details:
                    exclude_fields = {
                        "id",
                        "pk",
                        "created_at",
                        "updated_at",
                        "workplan",
                        "user",
                    }
                    for field in self.__dict__:
                        if field.startswith("_") or field in exclude_fields:
                            continue
                        value = getattr(self, field, None)
                        if value is not None and value != "":
                            details.append(
                                f"{field.replace('_', ' ').title()}: {value}"
                            )
                # Save as a single string for frontend compatibility
                if details:
                    array = [f"{description} → {'; '.join(details)}"]
                else:
                    array = [f"{description}"]
            else:
                # For other models, log all non-system fields and their values, with user-friendly labels for SPWorkplan
                exclude_fields = {
                    "id",
                    "pk",
                    "created_at",
                    "updated_at",
                    "workplan",
                    "user",
                }
                field_label_map = {
                    "fp_name": "Name of SP focal point",
                    "fp_title": "SP focal point title",
                    "suggested_date": "Suggested date for mid-year check-in",
                    "created_at": "Today's date",
                    "strategic_partner_id": "Strategic Partner Id",
                }
                for field in self.__dict__:
                    if field.startswith("_") or field in exclude_fields:
                        continue
                    value = getattr(self, field, None)
                    if value is not None and value != "":
                        # Use display value for fp_title if available
                        if field == "fp_title" and hasattr(
                            self, "get_fp_title_display"
                        ):
                            value = self.get_fp_title_display()
                        # Use user-friendly label if available
                        label = field_label_map.get(
                            field, field.replace("_", " ").title()
                        )
                        array.append(f"{label}: {value}")
        else:
            data["reason"] = "change"
            if self.__class__.__name__ == "PriorityActivity":
                old_priority_status = self._loaded_values.get("priority_status")
                array.append(
                    [self.txt_value, old_priority_status, self.priority_status]
                )

            for key, value in self._loaded_values.items():
                if key == "updated_at" or key == "current_step":
                    continue
                if self.__class__.__name__ == "PriorityActivity" and key in [
                    "priority_status",
                    "txt_value",
                ]:
                    continue
                # Only process if the attribute exists on the model
                if not hasattr(self, key):
                    continue
                current_val = getattr(self, key)
                if key == "suggested_date":
                    print(f"[DEBUG] suggested_date old: {value}, new: {current_val}")
                if (
                    self.__class__.__name__ == "WorkplanNotesRemark"
                    and key == "txt_value"
                    and value != current_val
                ):
                    # Only log changes to txt_value for WorkplanNotesRemark if value actually changed
                    xl = [
                        "Notes and Remark",
                        value,
                        current_val,
                    ]
                    array.append(xl)
                elif current_val != value and value is not None:
                    print(
                        f"[DEBUG] Field changed: {key}, old: {value}, new: {current_val}"
                    )
                    if self.__class__.__name__ == "WorkplanActivity":
                        xl = [
                            f"{self.str_value} : {self.area}",
                            self._loaded_values[key],
                            current_val,
                        ]
                        array.append(xl)
                    elif self.__class__.__name__ == "WorkplanProgressIndicator":
                        # Handle progress indicator changes with user-friendly labels
                        indicator_name = getattr(self, "txt_value", None) or getattr(
                            self, "str_value", "Progress Indicator"
                        )
                        if key == "progress_status":
                            xl = [f"{indicator_name} - Status", value, current_val]
                        elif key == "numeric_value":
                            xl = [f"{indicator_name} - Score", value, current_val]
                        elif key == "notes":
                            xl = [
                                f"{indicator_name} - Notes",
                                value or "(empty)",
                                current_val or "(empty)",
                            ]
                        elif key == "txt_value":
                            xl = [f"Description", value, current_val]
                        else:
                            field_label = key.replace("_", " ").title()
                            xl = [
                                f"{indicator_name} - {field_label}",
                                value,
                                current_val,
                            ]
                        array.append(xl)
                    elif self.__class__.__name__ == "WorkplanDocs" and key in [
                        "document",
                        "document_id",
                    ]:
                        old_file = "unknown"
                        new_file = "unknown"
                        try:
                            from .models import SharedFile

                            if value:
                                old_file_obj = SharedFile.objects.filter(
                                    pk=value
                                ).first()
                                if old_file_obj and getattr(old_file_obj, "name", None):
                                    old_file = old_file_obj.name
                            if current_val:
                                new_file_obj = SharedFile.objects.filter(
                                    pk=current_val
                                ).first()
                                if new_file_obj and getattr(new_file_obj, "name", None):
                                    new_file = new_file_obj.name
                        except Exception:
                            pass
                        doc_type = (
                            self.get_document_type_display()
                            if hasattr(self, "get_document_type_display")
                            else (getattr(self, "document_type", None) or "unknown")
                        )
                        array.append(
                            f"File changed for {doc_type}: {old_file} → {new_file}"
                        )
                    else:
                        xl = [
                            self.str_value if hasattr(self, "str_value") else key,
                            self._loaded_values[key],
                            current_val,
                        ]
                        array.append(xl)
        if data["reason"] == "change" and len(array) == 0:
            print("[DEBUG] No changes detected, not saving audit trail.")
            return

        def convert_for_json(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return obj

        def deep_convert(item):
            if isinstance(item, list):
                return [deep_convert(i) for i in item]
            return convert_for_json(item)

        from .models import WorkPlanAuditTrail

        if array:
            grouped_data = data.copy()
            # If this is a PriorityActivity change, and the array is a flat list, save as a JSON array
            if (
                self.__class__.__name__ == "PriorityActivity"
                and len(array) == 1
                and isinstance(array[0], list)
                and len(array[0]) == 3
            ):
                grouped_data["data"] = json.dumps(array[0])
            else:
                grouped_data["data"] = json.dumps([deep_convert(i) for i in array])
            WorkPlanAuditTrail.objects.create(**grouped_data)
            print("[DEBUG] Grouped audit trail entry created for:", grouped_data)

    def save(self, *args, **kwargs):
        # Only save the model; audit logging is handled in the view
        super().save(*args, **kwargs)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._loaded_values = dict(zip(field_names, values))

        return instance

    def __str__(self):
        return f"{self.workplan}"


def Kpis_Counts(suppliers):
    _data = suppliers.all().filter(kpis__closed_quality__isnull=False, kpis__status=3)
    result = _data.values("kpis__closed_quality").annotate(
        count=Count("kpis__closed_quality")
    )
    response = {item["kpis__closed_quality"]: item["count"] for item in result}
    return response
