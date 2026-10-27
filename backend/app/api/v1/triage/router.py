"""
Aggregate Triage & Spatial Facility API Router (STT 39 & STT 40)
"""
from fastapi import APIRouter
from app.api.v1.triage.incidents_triage import router as incidents_triage_router
from app.api.v1.triage.spatial_facilities import router as spatial_facilities_router

triage_composite_router = APIRouter()
triage_composite_router.include_router(incidents_triage_router)
triage_composite_router.include_router(spatial_facilities_router)
