import issara.ilm_server_2.factories as factories
from issara.ilm_server_2.models import IssueCategory, KpiCategory, Kpi


issue_category_names = [
    'Recruitment fees survey',
    'Coordination with Issara',
    'Migrant health issue',
    'Other non-labour crime against migrants',
    'Info query on migrant rights, registration, documents',
    'Labour trafficking, exploitation, and labour-related issues'
]

kpi_category_names = [
    'Living and eating conditions',
    'Employer-employee communications and relations',
    'Working conditions',
    'Payment systems and transparency',
    'Labour recruitment'
]


def create_issue_categories():
    for issue_category_name in issue_category_names:
        factories.IssueCategoryFactory(name=issue_category_name)


def create_kpi_categories():
    labour_issue = IssueCategory.objects.get(
        name='Labour trafficking, exploitation, and labour-related issues'
    )

    for kpi_category_name in kpi_category_names:
        factories.KPICategoryFactory(
            issue_category=labour_issue, name=kpi_category_name
        )

def create_kpis():
    kpi_categories = KpiCategory.objects.all()

    for kpi_category in kpi_categories:
        for i in range(10):
            factories.KPIFactory(kpi_category=kpi_category)
