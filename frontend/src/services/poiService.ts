export interface LivePOI {
  id: string;
  name: string;
  fullAddress: string;
  longitude: number;
  latitude: number;
  icon?: string;
}

export async function searchLivePlacesAPI(
  query: string,
  lat = 10.7769,
  lng = 106.7009
): Promise<LivePOI[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&lat=${lat}&lon=${lng}&limit=8`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((feat: any) => {
      const p = feat.properties || {};
      const [featLng, featLat] = feat.geometry?.coordinates || [lng, lat];
      const houseNumber = p.housenumber || p.house_number || "";
      const street = p.street || p.road || "";
      const district = p.district || p.suburb || p.locality || p.city || "TP. Hồ Chí Minh";
      const city = p.city || "TP. Hồ Chí Minh";

      const addressParts: string[] = [];
      if (houseNumber && street) {
        addressParts.push(`Số ${houseNumber} ${street}`);
      } else if (street) {
        addressParts.push(street);
      } else if (houseNumber) {
        addressParts.push(`Số ${houseNumber}`);
      }
      if (district) addressParts.push(district);
      if (city && city !== district) addressParts.push(city);

      const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : (p.name || "TP. Hồ Chí Minh");
      const name = p.name || (houseNumber && street ? `Số ${houseNumber} ${street}` : fullAddress);

      return {
        id: `${p.osm_type || "N"}_${p.osm_id || Math.random()}`,
        name,
        fullAddress,
        longitude: featLng,
        latitude: featLat,
        icon: "📍",
      };
    });
  } catch (err) {
    console.warn("Lỗi gọi API tìm kiếm địa điểm:", err);
    return [];
  }
}
