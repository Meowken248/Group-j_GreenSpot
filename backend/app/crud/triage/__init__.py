"""
CRUD Triage package.
Export repository instances for incident triage.
"""

from app.crud.triage.triage_repository import (
    TriageRepository,
    triage_repository,
)
from app.crud.triage.spatial_facility_repository import (
    SpatialFacilityRepository,
    spatial_facility_repository,
)

__all__ = [
    "TriageRepository",
    "triage_repository",
    "SpatialFacilityRepository",
    "spatial_facility_repository",
]
