"""
Backward compatibility re-export for Safe Navigation interfaces.
The authoritative interfaces are located in app.interface.navigation.navigation_interface.
"""

from app.interface.navigation.navigation_interface import (
    ISafeNavigationService,
    INavigationRepository,
)

__all__ = ["ISafeNavigationService", "INavigationRepository"]
