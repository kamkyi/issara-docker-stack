"""
Enums and constants for the ILM Server 2 application.

This module contains all enum-like constants to avoid circular imports.
Models and other modules can safely import from here.
"""


class CaseRiskLevel:
    """Constants for case risk levels.

    The Low/Medium/High scale is what ILM-fronted's risk bar writes and what
    the existing `cases` rows hold. The Cascade Worker Voice form asks the
    question differently -- it names the two risks a CSO officer is actually
    identifying -- so those are added alongside rather than replacing anything.
    All five are valid values of the one shared column; each form offers the
    subset it asks for, and neither rewrites what the other saved.
    """

    RISK_LOW = "LOW"
    RISK_MEDIUM = "MEDIUM"
    RISK_HIGH = "HIGH"
    RISK_EARLY_WARNING = "EARLY_WARNING"
    RISK_FORCED_LABOR = "FORCED_LABOR"

    LEGACY_RISK_LEVEL_CHOICES = [
        (RISK_LOW, "Low"),
        (RISK_MEDIUM, "Medium"),
        (RISK_HIGH, "High"),
    ]

    WORKER_VOICE_RISK_LEVEL_CHOICES = [
        (RISK_EARLY_WARNING, "Early warning risk"),
        (RISK_FORCED_LABOR, "Forced labor risk"),
    ]

    RISK_LEVEL_CHOICES = (
        LEGACY_RISK_LEVEL_CHOICES + WORKER_VOICE_RISK_LEVEL_CHOICES
    )
