import type { FeatureCollection } from "geojson";

export interface DistrictProperties {
  id: string;
  name: string;
  role: string;
  incidents: number;
  greenIndex: string;
  color: string;
  areaKm2: number;
  population: number;
  center: [number, number]; // [lng, lat]
}

export const HCM_FULL_DISTRICT_BOUNDARIES: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    // 1. TP. THỦ ĐỨC
    {
      type: "Feature",
      properties: {
        id: "thu-duc",
        name: "TP. Thủ Đức",
        role: "Đô thị Sáng tạo, Giáo dục & Công nghệ cao",
        incidents: 28,
        greenIndex: "32.6%",
        color: "#10b981",
        areaKm2: 211.56,
        population: 1210000,
        center: [106.7584, 10.8494],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.715, 10.765],
            [106.745, 10.745],
            [106.785, 10.755],
            [106.845, 10.835],
            [106.835, 10.885],
            [106.805, 10.895],
            [106.745, 10.865],
            [106.715, 10.815],
            [106.715, 10.765],
          ],
        ],
      },
    },

    // 2. QUẬN 1
    {
      type: "Feature",
      properties: {
        id: "quan-1",
        name: "Quận 1",
        role: "Trung tâm Hành chính, Tài chính & Thương mại",
        incidents: 12,
        greenIndex: "18.4%",
        color: "#3b82f6",
        areaKm2: 7.72,
        population: 142000,
        center: [106.6975, 10.7765],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.685, 10.768],
            [106.697, 10.761],
            [106.708, 10.769],
            [106.707, 10.789],
            [106.696, 10.793],
            [106.685, 10.781],
            [106.685, 10.768],
          ],
        ],
      },
    },

    // 3. QUẬN 3
    {
      type: "Feature",
      properties: {
        id: "quan-3",
        name: "Quận 3",
        role: "Đô thị Di sản Kiến trúc & Ngoại giao",
        incidents: 8,
        greenIndex: "21.0%",
        color: "#6366f1",
        areaKm2: 4.92,
        population: 190000,
        center: [106.6842, 10.7845],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.672, 10.772],
            [106.685, 10.768],
            [106.696, 10.793],
            [106.688, 10.798],
            [106.675, 10.788],
            [106.672, 10.772],
          ],
        ],
      },
    },

    // 4. QUẬN 4
    {
      type: "Feature",
      properties: {
        id: "quan-4",
        name: "Quận 4",
        role: "Đảo ngọc sông Sài Gòn & Cảng biển",
        incidents: 11,
        greenIndex: "14.5%",
        color: "#ec4899",
        areaKm2: 4.18,
        population: 175000,
        center: [106.7045, 10.7610],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.692, 10.755],
            [106.715, 10.758],
            [106.718, 10.770],
            [106.702, 10.767],
            [106.692, 10.755],
          ],
        ],
      },
    },

    // 5. QUẬN 5
    {
      type: "Feature",
      properties: {
        id: "quan-5",
        name: "Quận 5",
        role: "Thương mại Truyền thống & Phố Cổ Chợ Lớn",
        incidents: 14,
        greenIndex: "16.2%",
        color: "#f43f5e",
        areaKm2: 4.27,
        population: 178000,
        center: [106.6645, 10.7540],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.652, 10.748],
            [106.676, 10.748],
            [106.678, 10.761],
            [106.655, 10.761],
            [106.652, 10.748],
          ],
        ],
      },
    },

    // 6. QUẬN 6
    {
      type: "Feature",
      properties: {
        id: "quan-6",
        name: "Quận 6",
        role: "Đầu mối Giao thương Phía Tây Nam",
        incidents: 16,
        greenIndex: "17.8%",
        color: "#d946ef",
        areaKm2: 7.14,
        population: 233000,
        center: [106.6410, 10.7480],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.626, 10.738],
            [106.652, 10.748],
            [106.655, 10.761],
            [106.635, 10.762],
            [106.626, 10.738],
          ],
        ],
      },
    },

    // 7. QUẬN 7
    {
      type: "Feature",
      properties: {
        id: "quan-7",
        name: "Quận 7",
        role: "Khu đô thị Kiểu mẫu Nam Sài Gòn & Phú Mỹ Hưng",
        incidents: 15,
        greenIndex: "26.8%",
        color: "#8b5cf6",
        areaKm2: 35.76,
        population: 360000,
        center: [106.7315, 10.7345],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.695, 10.745],
            [106.745, 10.748],
            [106.755, 10.715],
            [106.715, 10.705],
            [106.695, 10.725],
            [106.695, 10.745],
          ],
        ],
      },
    },

    // 8. QUẬN 8
    {
      type: "Feature",
      properties: {
        id: "quan-8",
        name: "Quận 8",
        role: "Mạng lưới Kênh rạch Đô thị & Chợ Đầu Mối",
        incidents: 22,
        greenIndex: "19.5%",
        color: "#06b6d4",
        areaKm2: 19.18,
        population: 424000,
        center: [106.6550, 10.7280],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.615, 10.720],
            [106.665, 10.722],
            [106.695, 10.725],
            [106.695, 10.745],
            [106.652, 10.748],
            [106.615, 10.720],
          ],
        ],
      },
    },

    // 9. QUẬN 10
    {
      type: "Feature",
      properties: {
        id: "quan-10",
        name: "Quận 10",
        role: "Thương mại, Y tế Chuyên sâu & Giáo dục",
        incidents: 9,
        greenIndex: "19.2%",
        color: "#0284c7",
        areaKm2: 5.72,
        population: 234000,
        center: [106.6670, 10.7740],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.655, 10.761],
            [106.678, 10.761],
            [106.676, 10.784],
            [106.656, 10.782],
            [106.655, 10.761],
          ],
        ],
      },
    },

    // 10. QUẬN 11
    {
      type: "Feature",
      properties: {
        id: "quan-11",
        name: "Quận 11",
        role: "Văn hóa Đầm Sen, Tiểu thủ công nghiệp & Dịch vụ",
        incidents: 10,
        greenIndex: "20.4%",
        color: "#14b8a6",
        areaKm2: 5.14,
        population: 209000,
        center: [106.6500, 10.7680],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.638, 10.761],
            [106.655, 10.761],
            [106.656, 10.782],
            [106.640, 10.778],
            [106.638, 10.761],
          ],
        ],
      },
    },

    // 11. QUẬN 12
    {
      type: "Feature",
      properties: {
        id: "quan-12",
        name: "Quận 12",
        role: "Cửa ngõ Tây Bắc, Công viên Phần mềm Quang Trung",
        incidents: 24,
        greenIndex: "38.5%",
        color: "#15803d",
        areaKm2: 52.74,
        population: 620000,
        center: [106.6550, 10.8650],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.610, 10.840],
            [106.660, 10.842],
            [106.705, 10.875],
            [106.685, 10.895],
            [106.630, 10.885],
            [106.610, 10.840],
          ],
        ],
      },
    },

    // 12. QUẬN BÌNH THẠNH
    {
      type: "Feature",
      properties: {
        id: "binh-thanh",
        name: "Quận Bình Thạnh",
        role: "Cửa ngõ Đông Bắc, Landmark 81 & Bán đảo Thanh Đa",
        incidents: 19,
        greenIndex: "24.1%",
        color: "#f59e0b",
        areaKm2: 20.78,
        population: 499000,
        center: [106.7105, 10.8015],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.685, 10.795],
            [106.735, 10.795],
            [106.745, 10.835],
            [106.715, 10.845],
            [106.685, 10.815],
            [106.685, 10.795],
          ],
        ],
      },
    },

    // 13. QUẬN GÒ VẤP
    {
      type: "Feature",
      properties: {
        id: "go-vap",
        name: "Quận Gò Vấp",
        role: "Đô thị Dân cư Đông đúc & Dịch vụ Thương mại",
        incidents: 18,
        greenIndex: "22.8%",
        color: "#ea580c",
        areaKm2: 19.73,
        population: 676000,
        center: [106.6750, 10.8380],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.650, 10.825],
            [106.685, 10.820],
            [106.700, 10.845],
            [106.680, 10.865],
            [106.650, 10.845],
            [106.650, 10.825],
          ],
        ],
      },
    },

    // 14. QUẬN PHÚ NHUẬN
    {
      type: "Feature",
      properties: {
        id: "phu-nhuan",
        name: "Quận Phú Nhuận",
        role: "Trung tâm Kết nối Cửa ngõ Hàng không Tân Sơn Nhất",
        incidents: 7,
        greenIndex: "25.0%",
        color: "#ca8a04",
        areaKm2: 4.86,
        population: 163000,
        center: [106.6800, 10.7980],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.668, 10.792],
            [106.688, 10.795],
            [106.685, 10.812],
            [106.665, 10.808],
            [106.668, 10.792],
          ],
        ],
      },
    },

    // 15. QUẬN TÂN BÌNH
    {
      type: "Feature",
      properties: {
        id: "tan-binh",
        name: "Quận Tân Bình",
        role: "Cảng hàng không Quốc tế Tân Sơn Nhất & Logistics",
        incidents: 13,
        greenIndex: "23.5%",
        color: "#16a34a",
        areaKm2: 22.43,
        population: 474000,
        center: [106.6550, 10.8050],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.635, 10.785],
            [106.668, 10.792],
            [106.665, 10.825],
            [106.635, 10.820],
            [106.635, 10.785],
          ],
        ],
      },
    },

    // 16. QUẬN TÂN PHÚ
    {
      type: "Feature",
      properties: {
        id: "tan-phu",
        name: "Quận Tân Phú",
        role: "Trung tâm Thương mại Aeon & Đô thị Mới",
        incidents: 15,
        greenIndex: "21.6%",
        color: "#059669",
        areaKm2: 15.97,
        population: 485000,
        center: [106.6280, 10.7900],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.615, 10.775],
            [106.635, 10.785],
            [106.635, 10.815],
            [106.618, 10.810],
            [106.615, 10.775],
          ],
        ],
      },
    },

    // 17. QUẬN BÌNH TÂN
    {
      type: "Feature",
      properties: {
        id: "binh-tan",
        name: "Quận Bình Tân",
        role: "Khu Công nghiệp Tân Tạo & Bến xe Miền Tây",
        incidents: 25,
        greenIndex: "25.2%",
        color: "#b45309",
        areaKm2: 52.02,
        population: 784000,
        center: [106.6050, 10.7650],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.585, 10.735],
            [106.615, 10.745],
            [106.615, 10.795],
            [106.595, 10.805],
            [106.585, 10.735],
          ],
        ],
      },
    },

    // 18. HUYỆN CỦ CHI
    {
      type: "Feature",
      properties: {
        id: "cu-chi",
        name: "Huyện Củ Chi",
        role: "Đất thép Thành đồng, Nông nghiệp Công nghệ cao",
        incidents: 8,
        greenIndex: "68.5%",
        color: "#166534",
        areaKm2: 434.77,
        population: 462000,
        center: [106.4950, 11.0050],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.395, 10.965],
            [106.565, 10.945],
            [106.595, 11.085],
            [106.525, 11.145],
            [106.395, 10.965],
          ],
        ],
      },
    },

    // 19. HUYỆN HÓC MÔN
    {
      type: "Feature",
      properties: {
        id: "hoc-mon",
        name: "Huyện Hóc Môn",
        role: "Vùng đất 18 Thôn Vườn Trầu & Vành đai Xanh",
        incidents: 12,
        greenIndex: "52.0%",
        color: "#15803d",
        areaKm2: 109.17,
        population: 542000,
        center: [106.5950, 10.8850],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.545, 10.855],
            [106.625, 10.865],
            [106.645, 10.915],
            [106.575, 10.925],
            [106.545, 10.855],
          ],
        ],
      },
    },

    // 20. HUYỆN BÌNH CHÁNH
    {
      type: "Feature",
      properties: {
        id: "binh-chanh",
        name: "Huyện Bình Chánh",
        role: "Cửa ngõ Tây Nam về Đồng bằng Sông Cửu Long",
        incidents: 26,
        greenIndex: "48.2%",
        color: "#047857",
        areaKm2: 252.56,
        population: 705000,
        center: [106.5650, 10.6850],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.495, 10.635],
            [106.615, 10.645],
            [106.615, 10.735],
            [106.565, 10.745],
            [106.495, 10.635],
          ],
        ],
      },
    },

    // 21. HUYỆN NHÀ BÈ
    {
      type: "Feature",
      properties: {
        id: "nha-be",
        name: "Huyện Nhà Bè",
        role: "Khu Đô thị Cảng Hiệp Phước & Sông nước Nam Sài Gòn",
        incidents: 10,
        greenIndex: "58.4%",
        color: "#0f766e",
        areaKm2: 100.43,
        population: 206000,
        center: [106.7250, 10.6550],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.695, 10.625],
            [106.755, 10.635],
            [106.755, 10.705],
            [106.705, 10.705],
            [106.695, 10.625],
          ],
        ],
      },
    },

    // 22. HUYỆN CẦN GIỜ
    {
      type: "Feature",
      properties: {
        id: "can-gio",
        name: "Huyện Cần Giờ",
        role: "Lá phổi Xanh & Khu Dự trữ Sinh quyển Thế giới UNESCO",
        incidents: 4,
        greenIndex: "84.5%",
        color: "#065f46",
        areaKm2: 704.45,
        population: 71500,
        center: [106.8850, 10.4150],
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.795, 10.615],
            [107.015, 10.455],
            [106.945, 10.375],
            [106.745, 10.465],
            [106.795, 10.615],
          ],
        ],
      },
    },
  ],
};
