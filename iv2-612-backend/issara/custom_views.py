from rest_framework.response import Response
from rest_framework_jwt.views import ObtainJSONWebToken

from drf_jwt_2fa.serializers import CodeTokenSerializer


class CustomObtainCodeToken(ObtainJSONWebToken):
    serializer_class = CodeTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data.get("token")
        return Response({"token": token})


custom_obtain_code_token = CustomObtainCodeToken.as_view()