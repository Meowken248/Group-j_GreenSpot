from pydantic import BaseModel


class LiveWeatherResponse(BaseModel):
    success: bool = True
    city: str
    temp: str
    temperature: int
    desc: str
    humidity: str
    wind: str
    aqi: int
    aqiStatus: str
    pm25: float
    pm10: float
    updatedAt: str
