# exec(open('scripts/clean_kpis.py').read())
from django.db import connection
from django.db.models import Count
from django.db.models.expressions import RawSQL

from issara.ilm_server_2.models import Case, SupplierKpi, SupplierKpiUpdate

def remove_zero_call_kpis():
    ids = []

    skpis = SupplierKpi.objects.all().annotate(
                calls=RawSQL(
                    '''
                        SELECT GROUP_CONCAT(cases_kpis.case_id)
                        FROM ilm_2.supplier_kpis temp_supplier_kpis
                        LEFT OUTER JOIN ilm_2.cases_kpis on ilm_2.cases_kpis.kpi_id=temp_supplier_kpis.kpi_id
                        LEFT OUTER JOIN ilm_2.cases on ilm_2.cases.id=ilm_2.cases_kpis.case_id
                        WHERE ilm_2.cases.supplier_id=temp_supplier_kpis.supplier_id and ilm_2.supplier_kpis.id = temp_supplier_kpis.id
                        GROUP by temp_supplier_kpis.id
                    ''', ()
                )
            )

    for skpi in skpis:
        if not skpi.calls:
            ids.append(skpi.id)


    SupplierKpi.objects.filter(id__in=ids).delete()
    SupplierKpi.objects.filter(id__in=ids).count()


def remove_zero_updates_kpis():
    ids = []
    skpis = SupplierKpi.objects.filter(opened_at__gte='2020-12-20', opened_at__lte='2021-01-09')

    for skpi in skpis:
        if len(skpi.updates.all()) == 0:
            ids.append(skpi.id)

    SupplierKpi.objects.filter(id__in=ids).delete()
    print(ids)


def detect_dirty_kpis():
    ids = []

    skpis = SupplierKpi.objects.all().annotate(
                calls=RawSQL(
                    '''
                        SELECT GROUP_CONCAT(cases_kpis.case_id)
                        FROM ilm_2.supplier_kpis temp_supplier_kpis
                        LEFT OUTER JOIN ilm_2.cases_kpis on ilm_2.cases_kpis.kpi_id=temp_supplier_kpis.kpi_id
                        LEFT OUTER JOIN ilm_2.cases on ilm_2.cases.id=ilm_2.cases_kpis.case_id
                        WHERE ilm_2.cases.supplier_id=temp_supplier_kpis.supplier_id and ilm_2.supplier_kpis.id = temp_supplier_kpis.id
                        GROUP by temp_supplier_kpis.id
                    ''', ()
                )
            ).filter(status_id=1)

    for skpi in skpis:


        calls = [int(i) for i in skpi.calls.split(',') if i.strip()]

        if len(calls) > 0:
            calls.sort()
            last_call_id = calls[-1]

            interactions = Case.objects.get(pk=last_call_id).case_interactions.all()
            updates = skpi.updates.all()

            if interactions.count() == 0:
                continue

            if updates.count() == 0:
                continue

            latest_interaction = interactions.latest('interacted')
            latest_update = updates.latest('id')

            if skpi.opened_at > latest_interaction.interacted and latest_update.status_id == 3:
                print(latest_update.status.name)
                ids.append(skpi.id)


    print(ids)


def update_kpis(ids):

    for id in ids:
        print('START ', id)
        supplier_kpi = SupplierKpi.objects.filter(id=id)
        updates = supplier_kpi[0].updates.all()

        if updates.count() > 0:
            latest_update = updates.latest('id')

            print(
                latest_update.overview_date,
                latest_update.opened_at,
                latest_update.closed_at,
                latest_update.remediation_documents_deadline,
                latest_update.systems_change_deadline
            )

            supplier_kpi.update(
                overview_date=latest_update.overview_date,
                status=latest_update.status,
                closed_quality=latest_update.closed_quality,
                closed_notes=latest_update.closed_notes,
                affected_workers=latest_update.affected_workers,
                retaliation=latest_update.retaliation,
                remediation_issara_recommendation=latest_update.remediation_issara_recommendation,
                remediation_progress=latest_update.remediation_progress,
                remediation_business_steps_taken = latest_update.remediation_business_steps_taken,
                remediation_business_steps_remaining = latest_update.remediation_business_steps_remaining,
                # remediation_payment_deadline = latest_update.remediation_payment_deadline,

                remediation_owed_baht = latest_update.remediation_owed_baht,
                remediation_owed_kyat = latest_update.remediation_owed_kyat,
                remediation_owed_ringitt = latest_update.remediation_owed_kyat,
                remediation_owed_usd = latest_update.remediation_owed_usd,

                remediation_paid_baht = latest_update.remediation_paid_baht,
                remediation_paid_kyat = latest_update.remediation_paid_kyat,
                remediation_paid_ringitt = latest_update.remediation_paid_ringitt,
                remediation_paid_usd = latest_update.remediation_paid_usd,

                remediation_workers_paid = latest_update.remediation_workers_paid,
                remediation_documents_owed = latest_update.remediation_documents_owed,
                remediation_documents_provided = latest_update.remediation_documents_provided,
                # remediation_documents_deadline = latest_update.remediation_documents_provided,
                remediation_notes = latest_update.remediation_notes,

                systems_change_issara_recommendation = latest_update.systems_change_issara_recommendation,
                systems_change_progress = latest_update.systems_change_progress,
                systems_change_aligned = latest_update.systems_change_aligned,
                systems_change_business_steps_taken = latest_update.systems_change_business_steps_taken,
                systems_change_business_steps_remaining = latest_update.systems_change_business_steps_remaining,
                systems_change_deadline = latest_update.systems_change_deadline,

                open = latest_update.status_id != 3,
                opened_at = latest_update.opened_at,
                closed_at = latest_update.closed_at
            )
