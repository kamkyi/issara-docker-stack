# exec(open('scripts/check_ids.py').read())
from django.db import connection


def dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM legacy_worker_jan_nov_2018")

    counter = 0

    for row in dictfetchall(cursor):
        s = row['how_hear_issara_ids']

        if s:
            l = [int(i) for i in s.split(',') if i.strip()]

            print(l)

            if len(l) > 0:
                counter += 1


    print(counter)
