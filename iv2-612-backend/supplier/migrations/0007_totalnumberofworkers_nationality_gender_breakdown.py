from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('supplier', '0006_workerfeedback_additional_attachments'),
    ]

    operations = [
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_thai_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Thai male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_thai_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Thai female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_cambodian_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Cambodian male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_cambodian_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Cambodian female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_myanmar_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Myanmar male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_myanmar_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Myanmar female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_lao_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Lao male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_lao_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Lao female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_vietnamese_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Vietnamese male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_vietnamese_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Vietnamese female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_nepalese_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Nepalese male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_nepalese_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Nepalese female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_bangladeshi_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Bangladeshi male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_bangladeshi_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Bangladeshi female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_indonesian_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Indonesian male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_indonesian_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Indonesian female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_malaysian_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Malaysian male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_malaysian_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Malaysian female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_indian_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Indian male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_indian_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Indian female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_pakistani_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Pakistani male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_pakistani_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Pakistani female workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_sri_lankan_male_workers',
            field=models.IntegerField(default=0, help_text='Number of Sri Lankan male workers'),
        ),
        migrations.AddField(
            model_name='totalnumberofworkers',
            name='total_num_sri_lankan_female_workers',
            field=models.IntegerField(default=0, help_text='Number of Sri Lankan female workers'),
        ),
    ]
