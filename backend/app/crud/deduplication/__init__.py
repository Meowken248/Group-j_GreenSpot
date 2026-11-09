"""
CRUD Deduplication package.
Export repository instance for incident deduplication and clustering.
"""

from app.crud.deduplication.deduplication_repository import (
    DeduplicationRepository,
    deduplication_repository,
)

__all__ = ["DeduplicationRepository", "deduplication_repository"]
