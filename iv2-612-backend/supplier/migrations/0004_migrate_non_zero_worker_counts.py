# Data migration to populate TotalNumberOfWorkers table with non-zero data

from django.db import migrations


def migrate_non_zero_worker_counts(apps, schema_editor):
    """
    Migrate worker count data from Supplier to TotalNumberOfWorkers table,
    but only for suppliers with non-zero worker data.
    """
    Supplier = apps.get_model('ilm_server_2', 'Supplier')
    TotalNumberOfWorkers = apps.get_model('supplier', 'TotalNumberOfWorkers')
    
    # Define the worker count fields to check and migrate
    worker_count_fields = [
        'total_num_workers',
        'total_num_men_workers',
        'total_num_women_workers',
        'total_num_thai_workers',
        'total_num_cambodian_workers',
        'total_num_myanmar_workers',
        'total_num_lao_workers',
        'total_num_vietnamese_workers',
        'total_num_nepalese_workers',
        'total_num_bangladeshi_workers',
        'total_num_indonesian_workers',
        'total_num_malaysian_workers',
        'total_num_indian_workers',
        'total_num_pakistani_workers',
        'total_num_sri_lankan_workers',
    ]
    
    # Clear existing TotalNumberOfWorkers records
    TotalNumberOfWorkers.objects.all().delete()
    
    # Get all suppliers
    suppliers = Supplier.objects.all()
    
    # Filter suppliers that have non-zero worker count data
    suppliers_with_data = []
    
    for supplier in suppliers:
        has_data = False
        for field in worker_count_fields:
            value = getattr(supplier, field, None)
            if value is not None and value > 0:
                has_data = True
                break
        
        if has_data:
            suppliers_with_data.append(supplier)
    
    # Create TotalNumberOfWorkers records for suppliers with data
    created_count = 0
    
    for supplier in suppliers_with_data:
        # Extract worker count data from supplier
        worker_data = {}
        for field in worker_count_fields:
            value = getattr(supplier, field, None)
            worker_data[field] = value if value is not None else 0
        
        # Create TotalNumberOfWorkers record
        TotalNumberOfWorkers.objects.create(
            supplier=supplier,
            **worker_data
        )
        created_count += 1
    
    print(f"✅ Data migration complete:")
    print(f"   Total suppliers: {suppliers.count()}")
    print(f"   Suppliers with worker data: {len(suppliers_with_data)}")
    print(f"   TotalNumberOfWorkers records created: {created_count}")
    print(f"   Suppliers skipped (no data): {suppliers.count() - len(suppliers_with_data)}")


def reverse_migrate_worker_counts(apps, schema_editor):
    """
    Reverse migration: delete all TotalNumberOfWorkers records
    """
    TotalNumberOfWorkers = apps.get_model('supplier', 'TotalNumberOfWorkers')
    deleted_count = TotalNumberOfWorkers.objects.count()
    TotalNumberOfWorkers.objects.all().delete()
    print(f"✅ Reverse migration: Deleted {deleted_count} TotalNumberOfWorkers records")


class Migration(migrations.Migration):

    dependencies = [
        ('supplier', '0002_totalnumberofworkers'),
        ('ilm_server_2', '0136_auto_20250703_1004'),  # Make sure Supplier model is available
    ]

    operations = [
        migrations.RunPython(
            migrate_non_zero_worker_counts,
            reverse_migrate_worker_counts,
        ),
    ]