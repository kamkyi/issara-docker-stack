from django import forms
from django.contrib.admin import ModelAdmin
from django.contrib.admin.widgets import FilteredSelectMultiple
from kpis.models import ILOIndicator, Kpi, LKSGIndicator


class IndicatorAdminFormMixin(forms.ModelForm):
    kpis = forms.ModelMultipleChoiceField(
        label="KPIs",
        queryset=Kpi.objects.all(),
        required=False,
        widget=FilteredSelectMultiple("KPIs", is_stacked=False),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["kpis"].initial = self.instance.kpis.all()

    def _save_m2m(self):
        super()._save_m2m()
        self.instance.kpis.set(self.cleaned_data["kpis"])


class ILOIndicatorAdminForm(IndicatorAdminFormMixin):
    class Meta:
        model = ILOIndicator
        fields = "__all__"


class LKSGIndicatorAdminForm(IndicatorAdminFormMixin):
    class Meta:
        model = LKSGIndicator
        fields = "__all__"


class ILOIndicatorAdmin(ModelAdmin):
    form = ILOIndicatorAdminForm
    list_display = ("name", "description")
    search_fields = ("name", "description")


class LKSGIndicatorAdmin(ModelAdmin):
    form = LKSGIndicatorAdminForm
    list_display = ("name", "description")
    search_fields = ("name", "description")
