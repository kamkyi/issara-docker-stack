from django import template
from django.utils.html import format_html

register = template.Library()


@register.filter
def kpi_email_replace_tokens(text, context):
    kpis = context.get('kpis', [])
    kpis_text = ''
    if kpis: kpis_text += '<ul>' 
    for kpi in kpis:
        kpis_text += ('<li>'
            f'Supplier KPI ID: {kpi.id}, '
            f'description: {kpi.kpi.description}, level: {kpi.kpi.level}'

        )

        if kpi.status.name == 'Closed':
            kpis_text += f', closure quality: {kpi.closed_quality}.</li>'
        else:
            kpis_text += '.</li>'

    if kpis: kpis_text += '</ul>' 
    text =  text.replace("{{kpis}}", kpis_text)
    
    # Grievance Email Notification
    kpi = context.get('kpi_id', None)
    try:
        supplier_name = context.get('supplier', {}).get('name', '')
        if kpi:
            text = text.replace("{{kpi_id}}", str(kpi))
            text = text.replace("{{supplier}}", supplier_name)
    except AttributeError:
        pass
    return format_html(text)
