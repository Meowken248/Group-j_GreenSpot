"""
Emergency Alert Repository Registry.
"""

from app.crud.emergency_alert.alert_repository import (
    EmergencyAlertRepository,
    SafetyCheckRepository,
)

__all__ = [
    "EmergencyAlertRepository",
    "SafetyCheckRepository",
]
