from datetime import timedelta
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicStorage(S3Boto3Storage):
    """Storage for publicly accessible uploads"""
    bucket_name = settings.S3_BUCKET_NAME_PUBLIC
    location = "media"
    default_acl = "public-read"
    querystring_auth = False


class StaticStorage(PublicStorage):
    """
    Storage for Django static files.
    The same bucket as PublicStorage just a different location.
    """
    location = "django_static"


class PrivateStorage(S3Boto3Storage):
    """Storage for private uploads"""
    bucket_name = settings.S3_BUCKET_NAME_PRIVATE
    location = "media"
    querystring_expire = 60*15 # 15 minutes
