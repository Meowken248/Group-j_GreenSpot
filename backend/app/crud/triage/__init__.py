"""
CRUD Triage package.
Export repository instances for incident triage.
"""

from app.crud.triage.triage_repository import (
    TriageRepository,
    triage_repository,
)

__all__ = ["TriageRepository", "triage_repository"]
