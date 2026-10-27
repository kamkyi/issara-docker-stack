from django import forms
from django.contrib.admin.widgets import FilteredSelectMultiple
from kpis.models import ILOIndicator, Kpi, KpiTranslation, LKSGIndicator
from nested_admin.nested import NestedModelAdmin, NestedStackedInline


class KpiTranslationInline(NestedStackedInline):
    model = KpiTranslation
    verbose_name = "Kpi Translation"
    extra = 0


class KpiAdminForm(forms.ModelForm):
    ilo_indicators = forms.ModelMultipleChoiceField(
        label="ILO indicators",
        queryset=ILOIndicator.objects.all(),
        required=False,
        widget=FilteredSelectMultiple("ILO indicators", is_stacked=False),
    )
    lksg_indicators = forms.ModelMultipleChoiceField(
        label="LkSG indicators",
        queryset=LKSGIndicator.objects.all(),
        required=False,
        widget=FilteredSelectMultiple("LkSG indicators", is_stacked=False),
    )

    class Meta:
        model = Kpi
        fields = "__all__"


class KpiAdmin(NestedModelAdmin):
    form = KpiAdminForm
    list_display = ("description", "level", "kpi_category")
    list_filter = (
        "level",
        "kpi_category",
    )
    search_fields = ("description", "level", "kpi_category__name")
    ordering = ("id",)
    inlines = [KpiTranslationInline]

    def get_queryset(self, request):
        return (
            super(KpiAdmin, self)
            .get_queryset(request)
            .prefetch_related(
                "kpi_category",
                "ilo_indicators",
                "lksg_indicators",
            )
        )
