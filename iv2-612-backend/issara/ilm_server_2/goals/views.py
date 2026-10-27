from rest_framework import viewsets
from ..permissions import IsIssaraStaff
from ..models import Goal
from .serializers import GoalSerializer

class GoalViewSet(viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    permission_classes = [IsIssaraStaff]