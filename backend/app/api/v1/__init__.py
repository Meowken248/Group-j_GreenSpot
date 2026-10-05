from fastapi import APIRouter
from app.api.v1.eco_locations import router as eco_locations_router
from app.api.v1.spatial import router as spatial_router
from app.api.v1.weather import router as weather_router
from app.api.v1.flood import router as flood_router
from app.api.v1.air_quality import router as air_quality_router
from app.api.v1.voice_assistant import voice_router

api_v1_router = APIRouter()
api_v1_router.include_router(eco_locations_router)
api_v1_router.include_router(spatial_router)
api_v1_router.include_router(weather_router)
api_v1_router.include_router(flood_router)
api_v1_router.include_router(air_quality_router)
api_v1_router.include_router(voice_router)
