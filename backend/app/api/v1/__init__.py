from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.rbac import router as rbac_router
from app.api.v1.user_management import router as user_management_router
from app.api.v1.profile import router as profile_router
from app.api.v1.eco_locations import router as eco_locations_router
from app.api.v1.spatial import router as spatial_router
from app.api.v1.weather import router as weather_router
from app.api.v1.flood import router as flood_router
from app.api.v1.air_quality import router as air_quality_router
from app.api.v1.voice_assistant import voice_router
from app.api.v1.friends import router as friends_router
from app.api.v1.deduplication import router as deduplication_router
from app.api.v1.triage import triage_composite_router
from app.api.v1.settings import settings_router
from app.api.v1.penalties import router as penalties_router
from app.api.v1.posts import router as posts_router
from app.api.v1.navigation import navigation_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.risk_dashboard.router import router as risk_dashboard_router
from app.api.v1.dispatch.router import router as dispatch_router
from app.api.v1.hotspots.router import router as hotspots_router
from app.api.v1.emergency_alert import router as emergency_alerts_router
from app.api.v1.incidents import router as incidents_router
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
api_v1_router.include_router(profile_router)
api_v1_router.include_router(friends_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(deduplication_router)
api_v1_router.include_router(triage_composite_router)
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
api_v1_router.include_router(voice_router)
api_v1_router.include_router(penalties_router)
api_v1_router.include_router(posts_router)
api_v1_router.include_router(navigation_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(risk_dashboard_router)
api_v1_router.include_router(dispatch_router)
api_v1_router.include_router(hotspots_router)
api_v1_router.include_router(emergency_alerts_router)
api_v1_router.include_router(incidents_router)
