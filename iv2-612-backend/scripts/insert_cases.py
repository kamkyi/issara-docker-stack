# exec(open('scripts/insert_cases.py').read())
import datetime

from django.db import connection, transaction
from django.db.models import Count
from django.db.models.expressions import RawSQL

from issara.ilm_server_2.models import Case, CaseInteraction, HowHearIssara, Kpi, SupplierKpi, SupplierKpiUpdate


def dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def get_cases():
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM legacy_worker_jan_nov_2018")

        cases = dictfetchall(cursor)
        # filtered_cases = []
        #
        # for case in cases:
        #     kpis = [int(i) for i in case['kpis'].split('|') if i.strip()]
        #     if len(kpis) == 0:
        #         filtered_cases.append(case)

        return cases

def get_cases_with_kpis():
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM legacy_worker_jan_nov_2018")

        cases = dictfetchall(cursor)
        filtered_cases = []

        for case in cases:
            kpis = [int(i) for i in case['kpis'].split('|') if i.strip()]
            if len(kpis) > 0 and case['supplier_id']:
                filtered_cases.append(case)

        return filtered_cases

def insert_cases():
    with transaction.atomic():
        cases = get_cases()

        for case in cases:

            new_case = Case(
                created=case['timestamp'],
                client_nickname=case['cases_client_nickname'][:44],
                client_phonenumber=case['cases_client_phonenumber'][:44],
                client_line_account=case['cases_client_line_account'],
                client_facebook_account=case['cases_client_facebook_account'],
                client_viber_account=case['cases_client_viber_account'],
                client_share_info_consent=case['cases_client_share_info_consent'],
                client_time_at_job=case['cases_client_time_at_job'],
                # issara_supply_chain
                # non_supply_chain
                description=case['cases_issues_description'],
                debt_bondage=case['cases_debt_bondage'][:44],
                debt_bondage_detail=case['cases_debt_bondage_detail'],
                # debt_bondage_broker
                # debt_bondage_detail_broker
                vot_needs=case['cases_vot_needs'],
                referral_notes=case['cases_referral_notes'],
                next_steps=case['cases_next_steps'],
                # work_place_details
                # dead_line_date
                final_remarks=case['cases_final_remarks'],
                source_upstream_broker=case['source_upstream_broker'][:111],

                rating_source_broker=case['rating_source_broker'],
                rating_source_recruiter=case['rating_source_recruiter'],
                rating_dest_recruiter=case['rating_dest_recruiter'],
                rating_dest_employer=case['rating_dest_employer'],

                case_status_id=2, # mark as 2 (closed) since these are very old cases

                supplier_id=case['supplier_id'],
                work_place_id=case['workplace_id'],
                issara_staff_id=case['issara_staff_id'],
                # next_steps_issara_staff_id
                source_recruiter_id=case['recruiter_id'],
                # destination_recruiter_id
                client_contract_type_id=case['contract_type_id'],
                client_document_type_id=case['document_type_id'],
                client_gender_id=case['client_gender_id'],
                client_ethnicity_id=case['client_ethnicity_id'],
                client_nationality_id=case['client_nationality_id'],
                case_category_id=case['issue_category_id'],
                client_type_id=case['client_type_id'],
                client_status_id=case['client_status_id'],
                referral_action_id=case['referral_action_id'],

                country_id=case['country_id'],
                province_id=case['province_id'],
                # district_id

                # client_origin_country_id
                client_origin_province_id=case['origin_province_id'],
                client_origin_district_id=case['origin_district_id'],

                # client_crossing_country_id
                client_crossing_province_id=case['crossing_province_id'],
                # client_crossing_district_id

                issue_description=case['cases_issues_description'],
                # issue_legacy_level

                issue_category_id=case['issue_category_id'],
                issue_workers_affected=case['workers_affected'],
                issue_workers_affected_description=case['case_issues_issue_workers_affected_description'],
                issue_getting_better=case['case_issue_getting_better'],
                issue_getting_better_description=case['case_issue_getting_better_description'],

                original_ilm_one_id=case['id']
            )

            if not case['supplier_id']:
                new_case.industry_id = case['industry_id']
                new_case.subindustry_id = case['subindustry_id']

            # use bulk create so post_save pre_save signals are not called
            Case.objects.bulk_create([
                new_case
            ])

            new_case = Case.objects.get(original_ilm_one_id=case['id'])

            interaction = CaseInteraction.objects.create(
                type=case['case_interactions_type'],
                # summary
                interacted=case['call_date'],
                created=case['call_date'],
                issara_staff_id=case['issara_staff_id'],
                interaction_reason_id=case['interaction_reason_id'],
                interaction_channel_id=case['interaction_channel_id']
            )

            # add interactions
            new_case.case_interactions.add(interaction)

            # add how hear issara
            how_hear_issara = case['how_hear_issara_ids']
            if how_hear_issara:
                ids = [int(i) for i in how_hear_issara.split(',') if i.strip()]
                if len(ids) > 0:
                    for id in ids:
                        new_case.case_how_hear_issara.add(HowHearIssara.objects.get(id=id))


def insert_kpis():
    with transaction.atomic():
        cases = get_cases_with_kpis()

        for case in cases:
            caseInDjango=Case.objects.get(original_ilm_one_id=case['id'])
            kpis = set([int(i) for i in case['kpis'].split('|') if i.strip()])

            for kpi in kpis:

                caseInDjango.kpis.add(Kpi.objects.get(id=kpi))

                try:
                    supplierKpi = SupplierKpi.objects.get(supplier_id=case['supplier_id'], kpi_id=kpi)

                    update = SupplierKpiUpdate.objects.create(
                        supplier_kpi=supplierKpi,
                        overview_date=case['timestamp'],
                        status_id=3, #closed
                        closed_quality='Okay',
                        closed_notes='2018 data, closed by script in 2021',
                        affected_workers=case['workers_affected'],
                        opened_at = case['call_date'],
                        closed_at = case['timestamp']
                    )
                    print('UPDATE')

                except Exception as e:
                    print(e)
                    supplierKpi = SupplierKpi.objects.create(
                        supplier_id=case['supplier_id'],
                        kpi_id=kpi,
                        overview_date=case['timestamp'],
                        status_id=3, #closed
                        closed_quality='Okay',
                        closed_notes='2018 data, closed by script in 2021',
                        affected_workers=case['workers_affected'],
                        opened_at=case['call_date'],
                        closed_at=case['timestamp'],
                        open=False
                    )
                    print('NEW')



insert_kpis()
