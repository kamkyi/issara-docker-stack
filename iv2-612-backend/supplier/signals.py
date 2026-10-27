"""
Django signals to automatically sync worker count data between 
Supplier model and TotalNumberOfWorkers model.

TEMPORARY: These signals exist during the migration period while worker count
fields still exist on the Supplier model. Once all usages are updated to use
TotalNumberOfWorkers and the fields are removed from Supplier, these signals
can be removed.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from issara.ilm_server_2.models import Supplier
from .models import TotalNumberOfWorkers


@receiver(post_save, sender=Supplier)
def sync_worker_counts_on_supplier_save(sender, instance, created, **kwargs):
    """
    Automatically create or update TotalNumberOfWorkers record 
    when a Supplier is created or updated.
    
    Note: This signal only syncs data TO TotalNumberOfWorkers.
    It doesn't modify the Supplier to avoid historical table issues.
    """
    # Define the worker count fields to sync
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
    
    # Extract worker count data from supplier
    worker_data = {}
    for field in worker_count_fields:
        value = getattr(instance, field, None)
        worker_data[field] = value if value is not None else 0
    
    try:
        # Create or update TotalNumberOfWorkers record
        worker_count_record, record_created = TotalNumberOfWorkers.objects.get_or_create(
            supplier=instance,
            defaults=worker_data
        )
        
        # If record already exists, update it with new values
        if not record_created:
            updated = False
            for field, value in worker_data.items():
                current_value = getattr(worker_count_record, field, None)
                if current_value != value:
                    setattr(worker_count_record, field, value)
                    updated = True
            
            if updated:
                worker_count_record.save()
                
    except Exception as e:
        # Log error but don't break the supplier save operation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error syncing worker counts for supplier {instance.id}: {str(e)}")


@receiver(post_delete, sender=Supplier)
def delete_worker_counts_on_supplier_delete(sender, instance, **kwargs):
    """
    Automatically delete TotalNumberOfWorkers record when Supplier is deleted.
    Note: This should happen automatically due to CASCADE, but included for completeness.
    """
    try:
        worker_count_record = TotalNumberOfWorkers.objects.get(supplier=instance)
        worker_count_record.delete()
    except TotalNumberOfWorkers.DoesNotExist:
        # Record doesn't exist, nothing to delete
        pass