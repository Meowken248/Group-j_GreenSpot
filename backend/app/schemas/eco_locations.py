from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class EcoLocationItem(BaseModel):
    id: str
    name: str
    category: str
    district: str
    address: str
    latitude: float
    longitude: float
    status: str
    statusText: str
    metricLabel: str
    metricValue: str
    distanceKm: Optional[float] = None
    severity: Optional[str] = None
    severityLevel: Optional[str] = None
    causeType: Optional[str] = None
    causeDesc: Optional[str] = None
    riskScore: Optional[float] = None
    isImpassableBikes: Optional[bool] = None
    isImpassableCars: Optional[bool] = None
    roadCorridor: Optional[Any] = None
    description: Optional[str] = None
    trackingCode: Optional[str] = None
    upvotes: Optional[int] = None
    wasteType: Optional[str] = None
    reportedAt: Optional[str] = None
    rating: Optional[float] = None
    acceptedTypes: Optional[str] = None
    contactPhone: Optional[str] = None
    managingOrg: Optional[str] = None
    sensorType: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class CategoryCounts(BaseModel):
    all: int
    incident: int
    green_spot: int
    recycling: int
    sensor: int
    flood: Optional[int] = 0


class EcoLocationsResponse(BaseModel):
    success: bool = True
    total: int
    counts: CategoryCounts
    data: List[EcoLocationItem]
