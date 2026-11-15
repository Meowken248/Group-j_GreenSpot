"""
Emergency Alert Interface Registry.
"""

from app.interface.emergency_alert.alert_interface import (
    IEmergencyAlertRepository,
    ISafetyCheckRepository,
)

__all__ = [
    "IEmergencyAlertRepository",
    "ISafetyCheckRepository",
]
