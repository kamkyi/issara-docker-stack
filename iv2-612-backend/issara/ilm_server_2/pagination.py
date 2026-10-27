from collections import OrderedDict

from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound
from rest_framework.pagination import CursorPagination, PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50
    page_query_param = "page"
#     def get_paginated_response(self, data):
#         response = Response(data)
#         response['count'] = self.page.paginator.count
#         response['next'] = self.get_next_link()
#         response['previous'] = self.get_previous_link()
#         return response


class CustomPageNumberPagination(PageNumberPagination):

    page_size = 10
    page_size_query_param = "page_size"

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get(self.page_size_query_param, "").lower() == "all":
            page_size = queryset.count()
            if page_size == 0:
                return []

            paginator = self.django_paginator_class(queryset, page_size)
            page_number = self.get_page_number(request, paginator)

            try:
                self.page = paginator.page(page_number)
            except InvalidPage as exc:
                msg = self.invalid_page_message.format(
                    page_number=page_number, message=str(exc)
                )
                raise NotFound(msg)

            if paginator.num_pages > 1 and self.template is not None:
                self.display_page_controls = True

            self.request = request
            return list(self.page)

        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "page_size": self.get_page_size(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class CustomCursorPagination(CursorPagination):
    page_size = 20
    # cursor_query_param = 'c'
    ordering = "-id"
