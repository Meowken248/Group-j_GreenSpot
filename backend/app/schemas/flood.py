from typing import Literal, Optional
from pydantic import BaseModel


FloodLevel = Literal["LOW", "MEDIUM", "HIGH", "EMERGENCY"]


class FloodPointBase(BaseModel):
    road: str
    district: str
    lat: float
    lng: float
    water_depth_cm: int
    level: FloodLevel
    source: str
    description: str


class FloodPointResponse(FloodPointBase):
    id: int
    updated_at: str

    model_config = {"from_attributes": True}


class FloodGeoJSONFeatureProperties(BaseModel):
    id: int
    road: str
    district: str
    water_depth_cm: int
    level: FloodLevel
    source: str
    description: str
    updated_at: str


class FloodGeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: list[float]


class FloodGeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: FloodGeoJSONGeometry
    properties: FloodGeoJSONFeatureProperties


class FloodGeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[FloodGeoJSONFeature]
