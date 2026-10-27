# Generated for Policies & Compliance feature

import django.db.models.deletion
from django.db import migrations, models


SEED_CATEGORIES = [
    "human-rights",
    "forced-labor",
    "recruitment",
    "purchasing",
    "gender",
    "living-wage",
    "climate",
]


def seed_categories(apps, schema_editor):
    PolicyCompliance = apps.get_model("ilm_server_2", "PolicyCompliance")
    for slug in SEED_CATEGORIES:
        PolicyCompliance.objects.get_or_create(name=slug)


def unseed_categories(apps, schema_editor):
    PolicyCompliance = apps.get_model("ilm_server_2", "PolicyCompliance")
    PolicyCompliance.objects.filter(name__in=SEED_CATEGORIES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0162_monthlyworkervoice_instagram_golden_dreams"),
    ]

    operations = [
        migrations.CreateModel(
            name="Policy",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("text", "Text"),
                            ("link", "Link"),
                            ("file", "File"),
                        ],
                        max_length=10,
                    ),
                ),
                ("text_value", models.TextField(blank=True, null=True)),
                (
                    "link_url",
                    models.URLField(blank=True, max_length=2048, null=True),
                ),
                (
                    "audience",
                    models.CharField(
                        choices=[
                            ("members", "CASCADE Members"),
                            ("private", "Private"),
                        ],
                        default="members",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "strategic_partner",
                    models.ForeignKey(
                        blank=True,
                        db_column="sp_id",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="policies",
                        to="ilm_server_2.strategicpartner",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="policies",
                        to="ilm_server_2.supplier",
                    ),
                ),
                (
                    "file",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="policy_files",
                        to="ilm_server_2.sharedfile",
                    ),
                ),
                (
                    "categories",
                    models.ManyToManyField(
                        blank=True,
                        related_name="policies",
                        to="ilm_server_2.policycompliance",
                    ),
                ),
            ],
            options={
                "db_table": "policies",
                "managed": True,
            },
        ),
        migrations.AddConstraint(
            model_name="policy",
            constraint=models.CheckConstraint(
                check=models.Q(
                    models.Q(
                        ("strategic_partner__isnull", False),
                        ("supplier__isnull", True),
                    ),
                    models.Q(
                        ("strategic_partner__isnull", True),
                        ("supplier__isnull", False),
                    ),
                    _connector="OR",
                ),
                name="policy_owner_xor",
            ),
        ),
        migrations.RunPython(seed_categories, unseed_categories),
    ]
