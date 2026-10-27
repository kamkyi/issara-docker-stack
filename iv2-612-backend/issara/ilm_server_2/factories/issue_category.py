import random
import factory
from issara.ilm_server_2.models import IssueCategory


class IssueCategoryFactory(factory.django.DjangoModelFactory):
    name = factory.Sequence(lambda n: 'issue_category_%d' % (n + 1))

    class Meta:
        model = IssueCategory
