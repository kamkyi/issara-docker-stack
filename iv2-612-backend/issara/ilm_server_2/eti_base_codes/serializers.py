from rest_framework import serializers

from issara.ilm_server_2.eti_base_codes.models import (
    EtiBaseCode,
    ETIBaseCodeTranslation,
)


class ETIBaseCodeTranslationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="translated_name", read_only=True)
    description = serializers.CharField(source="translated_description", read_only=True)
    sub_description = serializers.CharField(
        source="translated_sub_description", read_only=True
    )

    class Meta:
        model = ETIBaseCodeTranslation
        fields = ["id", "name", "description", "sub_description"]


class EtiBaseCodeSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    sub_description = serializers.SerializerMethodField()

    class Meta:
        model = EtiBaseCode
        fields = [
            "id",
            "name",
            "code",
            "description",
            "sub_code",
            "sub_description",
            "created",
            "last_modified",
        ]

    def retrieve_translation(self, obj, field_name):
        if not hasattr(self, "_translation"):
            self._translation = {}

        if obj.pk not in self._translation:
            lang_code = self.context.get("lang", "en")
            self._translation[obj.pk] = obj.etibasecodetranslation_set.filter(
                language__code=lang_code
            ).first()

        translation = self._translation[obj.pk]

        return (
            getattr(translation, field_name, None)
            if translation
            else getattr(obj, field_name, None)
        )

    def get_name(self, obj):
        return self.retrieve_translation(obj, "name")

    def get_description(self, obj):
        return self.retrieve_translation(obj, "description")

    def get_sub_description(self, obj):
        return self.retrieve_translation(obj, "sub_description")
