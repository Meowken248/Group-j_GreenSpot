"""
Triage & Spatial Facility API Module (STT 39 & STT 40)
"""
from app.api.v1.triage.incidents_triage import router as incidents_triage_router
from app.api.v1.triage.spatial_facilities import router as spatial_facilities_router
from app.api.v1.triage.router import triage_composite_router

__all__ = [
    "incidents_triage_router",
    "spatial_facilities_router",
    "triage_composite_router",
]
