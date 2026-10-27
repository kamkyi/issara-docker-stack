from django.contrib import admin
from kpis.models import (
    ILOIndicator,
    Kpi,
    KpiCategory,
    KpiMetaCategory,
    KpiCategoryTranslation,
    KpiEmailNotification,
    KpiEmailNotificationTemplate,
    KpiGroupings,
    KpiGroupingTranslation,
    KpiLegalViolation,
    KpiRecommendedRemediation,
    KpiSystemsChange,
    KpiTranslation,
    LKSGIndicator,
    SupplierKpi,
    SupplierKpiUpdate,
    SupplierKpiUpdateStatus,
)
from simple_history.admin import SimpleHistoryAdmin

from .IndicatorAdmin import ILOIndicatorAdmin, LKSGIndicatorAdmin
from .KpiAdmin import KpiAdmin
from .KpiCategoryAdmin import KpiCategoryAdmin
from .KpiMetaCategoryAdmin import KpiMetaCategoryAdmin
from .KpiEmailNotificationAdmin import KpiEmailNotificationAdmin
from .KpiEmailNotificationTemplateAdmin import KpiEmailNotificationTemplateAdmin
from .KpiGroupingsAdmin import KpiGroupingsAdmin
from .SupplierKpiAdmin import SupplierKpiAdmin
from .SupplierKpiHistoryAdmin import SupplierKpiHistoryAdmin
from .SupplierKpiUpdateAdmin import SupplierKpiUpdateAdmin

admin.site.register(SupplierKpiUpdate, SupplierKpiUpdateAdmin)
admin.site.register(SupplierKpi, SupplierKpiHistoryAdmin)
admin.site.register(KpiCategory, KpiCategoryAdmin)
admin.site.register(KpiMetaCategory, KpiMetaCategoryAdmin)
admin.site.register(Kpi, KpiAdmin)
admin.site.register(ILOIndicator, ILOIndicatorAdmin)
admin.site.register(LKSGIndicator, LKSGIndicatorAdmin)
admin.site.register(KpiEmailNotificationTemplate, KpiEmailNotificationTemplateAdmin)
admin.site.register(KpiEmailNotification, KpiEmailNotificationAdmin)
admin.site.register(KpiGroupings, KpiGroupingsAdmin)
admin.site.register(KpiLegalViolation)
admin.site.register(KpiRecommendedRemediation)
admin.site.register(KpiSystemsChange)
admin.site.register(SupplierKpiUpdateStatus)
