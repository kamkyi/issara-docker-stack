# Generated migration for TotalNumberOfWorkers model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ilm_server_2', '0136_auto_20250703_1004'),
        ('supplier', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TotalNumberOfWorkers',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_num_workers', models.IntegerField(default=0, help_text='Total number of workers')),
                ('total_num_men_workers', models.IntegerField(default=0, help_text='Total number of male workers')),
                ('total_num_women_workers', models.IntegerField(default=0, help_text='Total number of female workers')),
                ('total_num_thai_workers', models.IntegerField(default=0, help_text='Number of Thai workers')),
                ('total_num_cambodian_workers', models.IntegerField(default=0, help_text='Number of Cambodian workers')),
                ('total_num_myanmar_workers', models.IntegerField(default=0, help_text='Number of Myanmar workers')),
                ('total_num_lao_workers', models.IntegerField(default=0, help_text='Number of Lao workers')),
                ('total_num_vietnamese_workers', models.IntegerField(default=0, help_text='Number of Vietnamese workers')),
                ('total_num_nepalese_workers', models.IntegerField(default=0, help_text='Number of Nepalese workers')),
                ('total_num_bangladeshi_workers', models.IntegerField(default=0, help_text='Number of Bangladeshi workers')),
                ('total_num_indonesian_workers', models.IntegerField(default=0, help_text='Number of Indonesian workers')),
                ('total_num_malaysian_workers', models.IntegerField(default=0, help_text='Number of Malaysian workers')),
                ('total_num_indian_workers', models.IntegerField(default=0, help_text='Number of Indian workers')),
                ('total_num_pakistani_workers', models.IntegerField(default=0, help_text='Number of Pakistani workers')),
                ('total_num_sri_lankan_workers', models.IntegerField(default=0, help_text='Number of Sri Lankan workers')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('supplier', models.OneToOneField(help_text='The supplier this worker count data belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='worker_counts', to='ilm_server_2.supplier')),
            ],
            options={
                'verbose_name': 'Total Number of Workers',
                'verbose_name_plural': 'Total Number of Workers',
                'db_table': 'total_number_of_workers',
                'ordering': ['-updated_at'],
            },
        ),
    ]