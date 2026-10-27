from django.contrib import admin
from django.utils.html import format_html
from simple_history.admin import SimpleHistoryAdmin

from .SupplierKpiAdmin import SupplierKpiAdmin


class SupplierKpiHistoryAdmin(SupplierKpiAdmin, SimpleHistoryAdmin):
    history_list_display = ["changed_fields", "list_changes"]
    ordering = ["-id"]

    def changed_fields(self, obj):
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)
            return delta.changed_fields
        return None

    def list_changes(self, obj):
        fields = ""
        if obj.prev_record:
            delta = obj.diff_against(obj.prev_record)

            for change in delta.changes:
                fields += str(
                    "<strong>{}</strong> changed from <span style='background-color:#ffb5ad'>{}</span> to <span style='background-color:#b3f7ab'>{}</span> . <br/>".format(
                        change.field, change.old, change.new
                    )
                )
            return format_html(fields)
        return None
