from django.db import migrations, models


# The finalized Worker Voice form needs a standard nationality library rather
# than the 13 rows the `nationalities` table carried from ILM 1. Seeding keeps
# `Case.client_nationality` a foreign key, so existing reporting still works.
NATIONALITIES = [
    "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan",
    "Argentine", "Armenian", "Australian", "Austrian", "Azerbaijani",
    "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian",
    "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian",
    "Botswanan", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe",
    "Burmese", "Burundian", "Cambodian", "Cameroonian", "Canadian",
    "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese",
    "Colombian", "Comorian", "Congolese", "Costa Rican", "Croatian", "Cuban",
    "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch",
    "Ecuadorian", "Egyptian", "Emirati", "Eritrean", "Estonian", "Ethiopian",
    "Fijian", "Filipino", "Finnish", "French", "Gabonese", "Gambian",
    "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan",
    "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic",
    "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian",
    "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan",
    "Korean", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese",
    "Liberian", "Libyan", "Liechtenstein", "Lithuanian", "Luxembourgish",
    "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian",
    "Maltese", "Mauritanian", "Mauritian", "Mexican", "Micronesian",
    "Moldovan", "Monacan", "Mongolian", "Montenegrin", "Moroccan",
    "Mozambican", "Namibian", "Nepali", "New Zealander", "Nicaraguan",
    "Nigerian", "Norwegian", "Omani", "Pakistani", "Palauan", "Palestinian",
    "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish",
    "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Samoan",
    "Saudi", "Senegalese", "Serbian", "Sierra Leonean", "Singaporean",
    "Slovak", "Slovenian", "Somali", "South African", "South Sudanese",
    "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swazi", "Swedish",
    "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Timorese",
    "Togolese", "Trinidadian", "Tunisian", "Turkish", "Turkmen", "Ugandan",
    "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan", "Vietnamese", "Yemeni",
    "Zambian", "Zimbabwean"
]

# Rows already in the table under a different spelling. Seeding the variant
# would create a second row for the same nationality and split live case data,
# so these are skipped. The existing row wins.
NATIONALITY_ALIASES = {
    "Laotian": "Lao",
    "Nepali": "Nepalese",
    "Pakistani": "Pakistanis",
}

# --- CSO-facing option sets for the Worker Voice form -----------------------
#
# The convention already used by ReferralAction and InteractionReason: an
# option a CSO should see is either neutral (both flags False) or `cso_only`;
# an option a CSO should not see is `hide_for_cso`. Existing rows are never
# renamed -- ~47k live cases point at them and the Issara-facing screens still
# display them -- so org-neutral wording is added as new `cso_only` rows.

# name -> replacement wording for CSO users. Added, not renamed.
CSO_INTERACTION_REASONS = [
    "Coordination with organization",
    "General social/ empowerment talk",
    "Emotional talk",
    "Inquiry about labor policy or rights",
]

# Issara-worded or out-of-scope reasons, hidden from the CSO dropdown.
HIDE_REASONS_FOR_CSO = [
    "Inquiry about labour policy or rights",
    "Emotional support",
    "Social talk in general",
    "Recruitment fees survey",
    "Coordination with Issara",
    "test",
]

CSO_CLIENT_TYPES = [
    "Returnee - former worker, not exploited",
    "Returnee - former jobseeker, exploited",
    "Returnee - former worker, exploited",
]

# Superseded by the "Returnee - ..." wording above, or not on the form.
HIDE_CLIENT_TYPES_FOR_CSO = [
    "Exploited migrant worker, back in community",
    "Exploited job-seeker, back in community",
    "Migrant worker, exploited",
    "Other",
]

CSO_INTERACTION_CHANNELS = ["Reported In-person"]

HIDE_CHANNELS_FOR_CSO = [
    "Golden Dreams App",
    "Housing Outreach",
    "Canteen Outreach",
    "Source-Side Outreach",
    "Worker Satisfaction Survey-Related Fieldwork",
    "Company chat",
    "Complaint/ Feedback box",
    "Welfare committee",
    "HR office",
]

# Already org-neutral, so the form reuses them instead of adding duplicates.
SHOW_REFERRAL_ACTIONS_FOR_CSO = [
    "No referral made or information provided; none needed",
    "Information provided and referral made",
]

# Already CSO-worded, but legacy data marks it both cso_only and hide_for_cso,
# which contradicts itself and hid it from the only audience meant to see it.
CSO_ONLY_REFERRAL_ACTIONS = [
    "Referral information provided and the organization needs to monitor",
]

# Not part of the finalized five options.
HIDE_REFERRAL_ACTIONS_FOR_CSO = [
    "Information provided and organization to take action",
    "Information provided and refer to Issara Institute",
    "Details on the organization action (Referral Notes)",
    "Next steps for the organization follow-up and action",
    "No referal - organization to take action",
]


def seed_nationalities(apps, schema_editor):
    Nationality = apps.get_model("ilm_server_2", "Nationality")
    existing = set(Nationality.objects.values_list("name", flat=True))
    Nationality.objects.bulk_create(
        [
            Nationality(name=name)
            for name in NATIONALITIES
            if name not in existing
            and NATIONALITY_ALIASES.get(name, name) not in existing
        ]
    )


def seed_cso_options(apps, schema_editor):
    def add(model_name, names):
        """Create the CSO-worded rows, then flag them.

        The flags are applied to every name in `names`, not just the ones this
        run inserted, so the migration converges on the same state whether or
        not the rows already exist -- for instance after a rollback dropped a
        newly added flag column and re-adding it reset the values to the
        column default.
        """
        model = apps.get_model("ilm_server_2", model_name)
        existing = set(model.objects.values_list("name", flat=True))
        model.objects.bulk_create(
            [model(name=name) for name in names if name not in existing]
        )
        model.objects.filter(name__in=names).update(
            cso_only=True, hide_for_cso=False
        )

    def flag(model_name, names, **flags):
        model = apps.get_model("ilm_server_2", model_name)
        model.objects.filter(name__in=names).update(**flags)

    add("InteractionReason", CSO_INTERACTION_REASONS)
    flag("InteractionReason", HIDE_REASONS_FOR_CSO, hide_for_cso=True)

    add("ClientType", CSO_CLIENT_TYPES)
    flag("ClientType", HIDE_CLIENT_TYPES_FOR_CSO, hide_for_cso=True)

    add("InteractionChannel", CSO_INTERACTION_CHANNELS)
    flag("InteractionChannel", HIDE_CHANNELS_FOR_CSO, hide_for_cso=True)

    flag(
        "ReferralAction",
        SHOW_REFERRAL_ACTIONS_FOR_CSO,
        hide_for_cso=False,
        cso_only=False,
    )
    flag(
        "ReferralAction",
        CSO_ONLY_REFERRAL_ACTIONS,
        hide_for_cso=False,
        cso_only=True,
    )
    flag("ReferralAction", HIDE_REFERRAL_ACTIONS_FOR_CSO, hide_for_cso=True)


class Migration(migrations.Migration):
    """Lookup options for the CSO Worker Voice form (IV2-582)."""

    dependencies = [
        ("ilm_server_2", "0191_worker_voice_case_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="clienttype",
            name="cso_only",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="clienttype",
            name="hide_for_cso",
            field=models.BooleanField(default=False),
        ),
        # Seed data is retained on rollback so unapplying never cascades away
        # rows that live cases point at.
        migrations.RunPython(seed_nationalities, migrations.RunPython.noop),
        migrations.RunPython(seed_cso_options, migrations.RunPython.noop),
    ]
