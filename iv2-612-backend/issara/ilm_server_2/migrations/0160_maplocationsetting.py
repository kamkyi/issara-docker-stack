from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_map_location_setting(apps, schema_editor):
    MapLocationSetting = apps.get_model("ilm_server_2", "MapLocationSetting")
    MapLocationSetting.objects.get_or_create(
        map_key="interactive_supplier_map",
        defaults={
            "show_exact_coordinates": False,
            "blur_radius_km": 5,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0159_historicalcase_first_time_contacting_issara"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MapLocationSetting",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                (
                    "map_key",
                    models.CharField(
                        choices=[
                            (
                                "interactive_supplier_map",
                                "Interactive Supplier Map",
                            ),
                        ],
                        default="interactive_supplier_map",
                        max_length=100,
                        unique=True,
                    ),
                ),
                (
                    "show_exact_coordinates",
                    models.BooleanField(default=False),
                ),
                (
                    "blur_radius_km",
                    models.PositiveSmallIntegerField(
                        choices=[
                            (1, "1 km"),
                            (3, "3 km"),
                            (4, "4 km"),
                            (5, "5 km"),
                            (10, "10 km"),
                        ],
                        default=5,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="map_location_settings_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Map Location Setting",
                "verbose_name_plural": "Map Location Settings",
                "db_table": "map_location_settings",
                "managed": True,
            },
        ),
        migrations.RunPython(
            create_default_map_location_setting,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
