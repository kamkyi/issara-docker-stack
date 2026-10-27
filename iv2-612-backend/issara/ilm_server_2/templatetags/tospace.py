from django import template

register = template.Library()

@register.filter
def tospace(value):
    return value.replace("_"," ").title()