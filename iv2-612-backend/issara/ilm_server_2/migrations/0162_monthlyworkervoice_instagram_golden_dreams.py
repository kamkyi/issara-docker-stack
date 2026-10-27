# Generated manually on 2026-05-21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0161_ermetrics_workers_pre_departure_th"),
    ]

    operations = [
        # Burmese - Myanmar
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="yangon_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Instagram in Myanmar"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="yangon_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Golden Dreams in Myanmar"
            ),
        ),
        # Burmese - Thailand
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="mm_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Instagram in Thailand"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="mm_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Golden Dreams in Thailand"
            ),
        ),
        # Burmese - Malaysia
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="my_burmese_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Instagram in Malaysia"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="my_burmese_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Burmese Golden Dreams in Malaysia"
            ),
        ),
        # Khmer - Thailand and Cambodia
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="cb_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Khmer Instagram"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="cb_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Khmer Golden Dreams"
            ),
        ),
        # Thai - Thailand
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="thai_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Thai Instagram"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="thai_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Thai Golden Dreams"
            ),
        ),
        # Nepali
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="nepal_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Nepali Instagram"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="nepal_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Nepali Golden Dreams"
            ),
        ),
        # Bangladeshi
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="bangladeshi_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Bangladeshi Instagram"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="bangladeshi_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Bangladeshi Golden Dreams"
            ),
        ),
        # Vietnamese
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="vietnamese_instagram",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Vietnamese Instagram"
            ),
        ),
        migrations.AddField(
            model_name="monthlyworkervoice",
            name="vietnamese_golden_dreams",
            field=models.IntegerField(
                blank=True, null=True, verbose_name="Vietnamese Golden Dreams"
            ),
        ),
    ]
