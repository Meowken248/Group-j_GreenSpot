export const FALLBACK_CLUSTERS = [];
export const FALLBACK_TOP5 = [];

export const hotspotApi = {
  getHotspotMap: async () => ({ hotspots: [], clusters: [] }),
  getAreas: async () => [],
  getForecast: async () => ({ forecasts: [], summary: "Mock" }),
  exportForecast: async () => ({ export_url: "#" }),
  getHotspotDetail: async () => null,
};
