export interface Province {
  slug: string;
  name: string;
  macro_region: string;
  sub_region: string;
  lat: number | null;
  lon: number | null;
}

export interface AQIMeta {
  level: string;
  label: string;
  color: string;
  code: string;
}

export interface HealthAdvice {
  status: string;
  general: string;
  children_elderly: string;
  outdoor: string;
}

export interface PollutantDetail {
  label: string;
  unit: string;
  current: number;
  avg: number;
  max: number;
  who_threshold: number;
  color: string;
  desc: string;
  exceeds: boolean;
  who_ratio_pct: number;
  status_label: string;
}

export interface AQIDistributionItem {
  label: string;
  code: string;
  color: string;
  range: string;
  count: number;
  percentage: number;
}

export interface RankingItem {
  slug: string;
  name: string;
  region: string;
  aqi: number;
  pm2_5: number;
  meta: AQIMeta;
}

export interface OverviewData {
  scope_label: string;
  target_slug: string | null;
  time_range: string;
  current_aqi: number;
  avg_aqi: number;
  aqi_meta: AQIMeta;
  health_advice: HealthAdvice;
  peak_time_slot: {
    slot: string;
    aqi: number;
  };
  pollutants: Record<string, PollutantDetail>;
  distribution: AQIDistributionItem[];
  rankings: {
    cleanest: RankingItem[];
    polluted: RankingItem[];
  };
}

export interface TrendHourlyPoint {
  timestamp: string;
  short_time: string;
  aqi: number;
  pm2_5: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  temp: number;
  humidity: number;
  wind_speed: number;
  rain: number;
}

export interface TrendDailyPoint {
  date: string;
  aqi: number;
  pm2_5: number;
  pm10: number;
  temp: number;
  rain: number;
  meta: AQIMeta;
}

export interface TrendData {
  province: string;
  hourly: TrendHourlyPoint[];
  daily: TrendDailyPoint[];
}

export interface PollutantComparisonItem {
  slug: string;
  name: string;
  region: string;
  value: number;
  exceeds: boolean;
}

export interface CorrelationRow {
  pollutant: string;
  values: number[];
}

export interface PollutantDetailsData {
  selected_pollutant: string;
  pollutant_meta: {
    label: string;
    unit: string;
    who: number;
    color: string;
    desc: string;
  };
  comparisons: PollutantComparisonItem[];
  correlation_matrix: {
    columns: string[];
    rows: CorrelationRow[];
  };
}

export interface WeatherKPI {
  avg_temp: number;
  avg_humidity: number;
  avg_wind: number;
  total_rain: number;
  avg_pressure: number;
}

export interface MonthlyTrendItem {
  month: string;
  avg_temp: number;
  max_temp: number;
  min_temp: number;
  humidity: number;
  rain: number;
  wind: number;
  aqi: number;
}

export interface ScatterProvinceItem {
  slug: string;
  name: string;
  region: string;
  temp: number;
  rain: number;
  aqi: number;
}

export interface WeatherData {
  kpi: WeatherKPI;
  monthly_trends: MonthlyTrendItem[];
  scatter_provinces: ScatterProvinceItem[];
}

export interface WindCurveItem {
  range: string;
  pm2_5: number;
  reduction_pct: number;
  sample_count: number;
}

export interface RainCurveItem {
  range: string;
  pm2_5: number;
  washout_reduction_pct: number;
  sample_count: number;
}

export interface CleaningProvinceItem {
  name: string;
  slug: string;
  region: string;
  washout_pct: number;
  baseline_pm: number;
  cleaned_pm: number;
}

export interface InteractionData {
  wind_curve: WindCurveItem[];
  rain_curve: RainCurveItem[];
  correlations: Record<string, number>;
  top_cleaning_provinces: CleaningProvinceItem[];
}

export interface ProvinceTableRow {
  slug: string;
  name: string;
  macro_region: string;
  sub_region: string;
  aqi: number;
  status_label: string;
  color: string;
  dominant_pollutant: string;
  pm2_5: number;
  pm10: number;
  temp: number;
  humidity: number;
  wind_speed: number;
  rain: number;
  timestamp: string;
}
