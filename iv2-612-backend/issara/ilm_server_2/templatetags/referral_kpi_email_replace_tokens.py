from django import template
from django.utils.html import format_html

register = template.Library()


@register.filter
def referral_kpi_email_replace_tokens(text, context):
    kpis = context.get('kpis', [])
    kpis_text = ''
    if kpis: kpis_text += '<ul>' 
    for kpi in kpis:
        
        kpis_text += ('<li>'
            f'KPI ID: {kpi.id}, '
            f'description: {kpi.kpi.description}, level: {kpi.kpi.level}'

        )
        kpis_text += '.</li>'
    if kpis: kpis_text += '</ul>' 
    refer_org = context.get('org_referred', '')
    case_org = context.get('case_org', '') 
    
    text =  text.replace("{{kpis}}", kpis_text)
    text =  text.replace("{{org_referred}}", refer_org)
    text =  text.replace("{{case_org}}", case_org)
    
    return format_html(text)
