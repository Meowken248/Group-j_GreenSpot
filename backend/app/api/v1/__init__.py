from fastapi import APIRouter
from app.api.v1.eco_locations import router as eco_locations_router
from app.api.v1.spatial import router as spatial_router
from app.api.v1.weather import router as weather_router
from app.api.v1.flood import router as flood_router
from app.api.v1.air_quality import router as air_quality_router
from app.api.v1.auth import router as auth_router
from app.api.v1.rbac import router as rbac_router
from app.api.v1.user_management import router as user_management_router
from app.api.v1.rewards import router as rewards_router
from app.api.v1.challenges import router as challenges_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.waste_handbook import router as waste_handbook_router
from app.api.v1.leaderboards import router as leaderboards_router
from app.api.v1.heatmap import router as heatmap_router
from app.api.v1.qr_scan import router as qr_scan_router
from app.api.v1.lucky_wheel import router as lucky_wheel_router
from app.api.v1.milestone import router as milestone_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(rbac_router)
api_v1_router.include_router(user_management_router)
api_v1_router.include_router(rewards_router)
api_v1_router.include_router(challenges_router)
api_v1_router.include_router(audit_logs_router)
api_v1_router.include_router(waste_handbook_router)
api_v1_router.include_router(leaderboards_router)
api_v1_router.include_router(heatmap_router)
api_v1_router.include_router(qr_scan_router)
api_v1_router.include_router(lucky_wheel_router)
api_v1_router.include_router(milestone_router)
api_v1_router.include_router(eco_locations_router)
api_v1_router.include_router(spatial_router)
api_v1_router.include_router(weather_router)
api_v1_router.include_router(flood_router)
api_v1_router.include_router(air_quality_router)

