from app.schemas.spatial import NearestSpotItem, NearestResponse, LandmarksResponse, LandmarkItem
from app.schemas.eco_locations import EcoLocationItem, CategoryCounts, EcoLocationsResponse
from app.schemas.weather import LiveWeatherResponse
from app.schemas.voice_assistant import (
    VoiceSampleCommandResponse,
    VoiceProcessRequest,
    VoiceProcessResponse,
    VoiceHistoryItemResponse,
)

__all__ = [
    "NearestSpotItem",
    "NearestResponse",
    "LandmarksResponse",
    "LandmarkItem",
    "EcoLocationItem",
    "CategoryCounts",
    "EcoLocationsResponse",
    "LiveWeatherResponse",
    "VoiceSampleCommandResponse",
    "VoiceProcessRequest",
    "VoiceProcessResponse",
    "VoiceHistoryItemResponse",
]
