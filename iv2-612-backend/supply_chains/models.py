from django.db import models


class SupplyChain(models.Model):
    name = models.CharField(max_length=512)
    strategic_partner = models.ForeignKey(
        "ilm_server_2.StrategicPartner", on_delete=models.CASCADE, null=True, blank=True
    )
    suppliers = models.ManyToManyField(
        "ilm_server_2.Supplier",
        blank=True,
        through="SupplierSupplyChain",
    )

    class Meta:
        verbose_name_plural = "Supplier Chains"
        managed = True
        db_table = "supply_chains"

    def __str__(self):
        return self.name

    def __repr__(self):
        repr = (
            f"ID: {self.id} \n"
            f"NAME: {self.name} \n"
            f"SP: {self.strategic_partner} \n"
            f'suppliers: [{", ".join([supplier.name for supplier in self.suppliers.all()])}] \n'
        )

        return repr


class SupplierSupplyChain(models.Model):
    STATUS_PRE_PROUDCTION = "pre_production"
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_FORMER_SUPPLIER = "former_supplier"
    STATUS_PENDING = "pending"

    STATUS_CHOICES = (
        (STATUS_PRE_PROUDCTION, "Pre Production"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_FORMER_SUPPLIER, "Former Supplier"),
        (STATUS_PENDING, "Pending Verification"),
    )

    supplier = models.ForeignKey("ilm_server_2.Supplier", on_delete=models.CASCADE)
    supply_chain = models.ForeignKey(SupplyChain, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default=STATUS_ACTIVE
    )

    class Meta:
        db_table = "ilm_server_2_suppliersupplychain"
        indexes = (
            models.Index(fields=("status",), name="ilm_server__status_cf07e6_idx"),
        )
        unique_together = (("supplier", "supply_chain"),)

    def __repr__(self):
        return f"{self.status}-{self.supplier}"

    def __str__(self):
        return f"{self.status}-{self.supplier}"


class BuyerPartnerFlag(models.Model):
    """
    Stores Ask/Flag submissions from suppliers about their buyer partners
    on the CASCADE Company Dashboard. The CASCADE strategic-partners team
    reviews these in Django admin and either resolves them (e.g. flips a
    SupplierSupplyChain.status) or dismisses them.
    """

    REASON_NO_LONGER_SOURCES = "no_longer_sources"
    REASON_UPDATE_STATUS = "update_status"
    REASON_CORRECT_INFO = "correct_info"
    REASON_GENERAL = "general"

    REASON_CHOICES = (
        (REASON_NO_LONGER_SOURCES, "This buyer no longer sources from us"),
        (REASON_UPDATE_STATUS, "Update our relationship status"),
        (REASON_CORRECT_INFO, "Correct this buyer's information"),
        (REASON_GENERAL, "General question or note"),
    )

    STATUS_PENDING = "pending"
    STATUS_RESOLVED = "resolved"
    STATUS_DISMISSED = "dismissed"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
    )

    supplier = models.ForeignKey(
        "ilm_server_2.Supplier",
        on_delete=models.CASCADE,
        related_name="buyer_partner_flags",
    )
    strategic_partner = models.ForeignKey(
        "ilm_server_2.StrategicPartner",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_flags",
        help_text="Buyer this flag is about (if it's a listed CASCADE buyer).",
    )
    reason = models.CharField(max_length=64, choices=REASON_CHOICES)
    note = models.TextField(blank=True)
    submitted_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buyer_partner_flags_submitted",
    )
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buyer_partner_flags_resolved",
    )
    resolution_note = models.TextField(blank=True)

    class Meta:
        db_table = "buyer_partner_flags"
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("status",), name="bpf_status_idx"),
            models.Index(fields=("supplier",), name="bpf_supplier_idx"),
        )

    def __str__(self):
        target = self.strategic_partner.name if self.strategic_partner_id else "—"
        return f"{self.status} · {self.supplier} → {target} ({self.reason})"
