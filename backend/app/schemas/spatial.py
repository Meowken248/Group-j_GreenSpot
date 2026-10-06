from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LandmarkItem(BaseModel):
    id: str
    name: str
    district: str
    description: str
    longitude: float
    latitude: float
    zoom: float
    pitch: float
    bearing: float
    tag: str
    status: str


class NearestSpotItem(BaseModel):
    category: str
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    distanceMeters: float
    extraInfo: Optional[str] = None


class NearestResponse(BaseModel):
    success: bool = True
    origin: Dict[str, float]
    radiusKm: float
    total: int
    data: List[NearestSpotItem]


class LandmarksResponse(BaseModel):
    success: bool = True
    data: List[LandmarkItem]
