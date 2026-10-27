from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class InvalidDateFormatError(Exception):
    """Raised when date format is invalid"""

    pass


class MissingRequiredParametersError(Exception):
    """Raised when required query parameters are missing"""

    pass
