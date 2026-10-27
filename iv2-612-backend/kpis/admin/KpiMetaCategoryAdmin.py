from django import forms
from django.contrib import admin
from nested_admin.nested import NestedModelAdmin
from kpis.models import KpiCategory, KpiMetaCategory


class KpiMetaCategoryForm(forms.ModelForm):
    existing_kpi_categories = forms.ModelMultipleChoiceField(
        queryset=KpiCategory.objects.all(),
        required=False,
        widget=admin.widgets.FilteredSelectMultiple('KPI Categories', is_stacked=False),
        help_text="Select existing KPI Categories to link to this Meta Category."
    )

    class Meta:
        model = KpiMetaCategory
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields['existing_kpi_categories'].initial = self.instance.kpi_categories.all()

    def save(self, commit=True):
        instance = super().save(commit=False)
        selected_categories = self.cleaned_data.get('existing_kpi_categories', [])
        
        if commit:
            instance.save()
            if hasattr(self, 'save_m2m'):
                self.save_m2m()
            instance.kpi_categories.set(selected_categories)
        else:
            # ModelAdmin calls save(commit=False), then instance.save(), then form.save_m2m()
            # We must override save_m2m to update the reverse ForeignKey relationship after the instance is saved.
            old_save_m2m = getattr(self, 'save_m2m', lambda: None)
            def save_m2m_custom():
                old_save_m2m()
                instance.kpi_categories.set(selected_categories)
            self.save_m2m = save_m2m_custom
            
        return instance


class KpiMetaCategoryAdmin(NestedModelAdmin):
    form = KpiMetaCategoryForm
    list_display = ('id', 'name')
    search_fields = ('name',)

