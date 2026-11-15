"""
CRUD Navigation package.
Export repository instances for safe navigation.
"""

from app.crud.navigation.navigation_repository import (
    NavigationRepository,
    navigation_repository,
)

__all__ = ["NavigationRepository", "navigation_repository"]
