# Generated manually on 2026-03-30
#
# Changes:
#   - Drop strategic_partner_details (intermediate detail table removed)
#   - Rename sp_detail_sourcing_countries  -> strategic_partner_sourcing_countries
#   - Rename sp_detail_industries          -> strategic_partner_industries
#   - Rename sp_detail_product_categories  -> strategic_partner_product_categories
#   - FK column on each join table: strategic_partner_detail_id -> strategic_partner_id
#     pointing directly to strategic_partners instead of strategic_partner_details

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ilm_server_2", "0153_strategic_partner_detail_and_policy_compliance"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # ------------------------------------------------------------------
            # DATABASE side: raw SQL so we fully control column names / types
            # ------------------------------------------------------------------
            database_operations=[
                # Drop join tables first (they FK into strategic_partner_details)
                migrations.RunSQL(
                    "DROP TABLE IF EXISTS `sp_detail_product_categories`;",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    "DROP TABLE IF EXISTS `sp_detail_industries`;",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    "DROP TABLE IF EXISTS `sp_detail_sourcing_countries`;",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                # Drop the now-redundant detail table
                migrations.RunSQL(
                    "DROP TABLE IF EXISTS `strategic_partner_details`;",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                # Re-create join tables with direct FK to strategic_partners
                migrations.RunSQL(
                    """
                    CREATE TABLE `strategic_partner_sourcing_countries` (
                        `id`                   INT NOT NULL AUTO_INCREMENT,
                        `strategic_partner_id` INT NOT NULL,
                        `country_id`           INT NOT NULL,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uq_sp_country` (`strategic_partner_id`, `country_id`),
                        CONSTRAINT `fk_spsc_sp`
                            FOREIGN KEY (`strategic_partner_id`)
                            REFERENCES `strategic_partners` (`id`)
                            ON DELETE CASCADE,
                        CONSTRAINT `fk_spsc_country`
                            FOREIGN KEY (`country_id`)
                            REFERENCES `countries` (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    """,
                    reverse_sql="DROP TABLE IF EXISTS `strategic_partner_sourcing_countries`;",
                ),
                migrations.RunSQL(
                    """
                    CREATE TABLE `strategic_partner_industries` (
                        `id`                   INT NOT NULL AUTO_INCREMENT,
                        `strategic_partner_id` INT NOT NULL,
                        `industry_id`          INT NOT NULL,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uq_sp_industry` (`strategic_partner_id`, `industry_id`),
                        CONSTRAINT `fk_spi_sp`
                            FOREIGN KEY (`strategic_partner_id`)
                            REFERENCES `strategic_partners` (`id`)
                            ON DELETE CASCADE,
                        CONSTRAINT `fk_spi_industry`
                            FOREIGN KEY (`industry_id`)
                            REFERENCES `industries` (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    """,
                    reverse_sql="DROP TABLE IF EXISTS `strategic_partner_industries`;",
                ),
                migrations.RunSQL(
                    """
                    CREATE TABLE `strategic_partner_product_categories` (
                        `id`                   INT NOT NULL AUTO_INCREMENT,
                        `strategic_partner_id` INT NOT NULL,
                        `product_category_id`  INT NOT NULL,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uq_sp_product_category` (`strategic_partner_id`, `product_category_id`),
                        CONSTRAINT `fk_sppc_sp`
                            FOREIGN KEY (`strategic_partner_id`)
                            REFERENCES `strategic_partners` (`id`)
                            ON DELETE CASCADE,
                        CONSTRAINT `fk_sppc_pc`
                            FOREIGN KEY (`product_category_id`)
                            REFERENCES `product_categories` (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    """,
                    reverse_sql="DROP TABLE IF EXISTS `strategic_partner_product_categories`;",
                ),
            ],

            # ------------------------------------------------------------------
            # STATE side: walk Django's migration state from 0153 to the new shape
            # ------------------------------------------------------------------
            state_operations=[
                # 1. Detach M2M fields so StrategicPartnerDetail can be deleted
                migrations.RemoveField(
                    model_name="strategicpartnerdetail",
                    name="sourcing_countries",
                ),
                migrations.RemoveField(
                    model_name="strategicpartnerdetail",
                    name="industries",
                ),
                migrations.RemoveField(
                    model_name="strategicpartnerdetail",
                    name="product_categories",
                ),

                # 2. Re-point each join table's FK from StrategicPartnerDetail
                #    to StrategicPartner (keeping old field name for now so
                #    unique_together can reference it before rename)
                migrations.AlterField(
                    model_name="strategicpartnerdetailcountry",
                    name="strategic_partner_detail",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sourcing_countries",
                        to="ilm_server_2.strategicpartner",
                    ),
                ),
                migrations.AlterField(
                    model_name="strategicpartnerdetailindustry",
                    name="strategic_partner_detail",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="industries",
                        to="ilm_server_2.strategicpartner",
                    ),
                ),
                migrations.AlterField(
                    model_name="strategicpartnerdetailproductcategory",
                    name="strategic_partner_detail",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_categories",
                        to="ilm_server_2.strategicpartner",
                    ),
                ),

                # 3. Remove the detail model (no model has a FK into it anymore)
                migrations.DeleteModel(
                    name="StrategicPartnerDetail",
                ),

                # 4. Rename FK field on each join table
                migrations.RenameField(
                    model_name="strategicpartnerdetailcountry",
                    old_name="strategic_partner_detail",
                    new_name="strategic_partner",
                ),
                migrations.RenameField(
                    model_name="strategicpartnerdetailindustry",
                    old_name="strategic_partner_detail",
                    new_name="strategic_partner",
                ),
                migrations.RenameField(
                    model_name="strategicpartnerdetailproductcategory",
                    old_name="strategic_partner_detail",
                    new_name="strategic_partner",
                ),

                # 5. Update unique_together to use the new field name
                migrations.AlterUniqueTogether(
                    name="strategicpartnerdetailcountry",
                    unique_together={("strategic_partner", "country")},
                ),
                migrations.AlterUniqueTogether(
                    name="strategicpartnerdetailindustry",
                    unique_together={("strategic_partner", "industry")},
                ),
                migrations.AlterUniqueTogether(
                    name="strategicpartnerdetailproductcategory",
                    unique_together={("strategic_partner", "product_category")},
                ),

                # 6. Rename the DB table in Django state
                migrations.AlterModelTable(
                    name="strategicpartnerdetailcountry",
                    table="strategic_partner_sourcing_countries",
                ),
                migrations.AlterModelTable(
                    name="strategicpartnerdetailindustry",
                    table="strategic_partner_industries",
                ),
                migrations.AlterModelTable(
                    name="strategicpartnerdetailproductcategory",
                    table="strategic_partner_product_categories",
                ),
                migrations.RenameModel(
                    old_name="StrategicPartnerDetailCountry",
                    new_name="StrategicPartnerSourcingCountry",
                ),
                migrations.RenameModel(
                    old_name="StrategicPartnerDetailIndustry",
                    new_name="StrategicPartnerIndustry",
                ),
                migrations.RenameModel(
                    old_name="StrategicPartnerDetailProductCategory",
                    new_name="StrategicPartnerProductCategory",
                ),
            ],
        ),
    ]
