export interface HCMLocation {
  id: string;
  name: string;
  district: string;
  category: "center" | "landmark" | "nature" | "modern" | "culture";
  icon: string;
  badge: string;
  description: string;
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export const HCM_LANDMARKS: HCMLocation[] = [
  {
    id: "quan-1",
    name: "Trung tâm Quận 1",
    district: "Quận 1",
    category: "center",
    icon: "🏙️",
    badge: "Trung tâm",
    description: "Khu vực Bến Thành, phố đi bộ Nguyễn Huệ, Nhà hát TP & Tòa tháp Bitexco",
    longitude: 106.7025,
    latitude: 10.7745,
    zoom: 15.8,
    pitch: 60,
    bearing: -25,
  },
  {
    id: "landmark-81",
    name: "Landmark 81",
    district: "Bình Thạnh",
    category: "landmark",
    icon: "🗼",
    badge: "Biểu tượng",
    description: "Tòa tháp cao nhất Việt Nam bên sông Sài Gòn & công viên ven sông 14 hecta",
    longitude: 106.7218,
    latitude: 10.7950,
    zoom: 16.2,
    pitch: 65,
    bearing: 40,
  },
  {
    id: "thu-thiem",
    name: "Đô thị mới Thủ Thiêm",
    district: "TP. Thủ Đức",
    category: "modern",
    icon: "🌿",
    badge: "Sinh thái mới",
    description: "Bán đảo sinh thái xanh, công viên bờ sông và trung tâm tài chính tương lai",
    longitude: 106.7197,
    latitude: 10.7684,
    zoom: 15.2,
    pitch: 50,
    bearing: 25,
  },
  {
    id: "phu-my-hung",
    name: "Phú Mỹ Hưng",
    district: "Quận 7",
    category: "modern",
    icon: "🏘️",
    badge: "Đô thị kiểu mẫu",
    description: "Hồ Bán Nguyệt, Cầu Ánh Sao, mảng xanh quy hoạch chuẩn quốc tế",
    longitude: 106.7185,
    latitude: 10.7289,
    zoom: 15.0,
    pitch: 55,
    bearing: -15,
  },
  {
    id: "thanh-da",
    name: "Bán đảo Thanh Đa",
    district: "Bình Thạnh",
    category: "nature",
    icon: "🛶",
    badge: "Vùng sinh thái",
    description: "Vùng đất trù phú bao bọc bởi dòng sông Sài Gòn êm đềm",
    longitude: 106.7280,
    latitude: 10.8250,
    zoom: 14.2,
    pitch: 45,
    bearing: 15,
  },
  {
    id: "can-gio",
    name: "Rừng Sác Cần Giờ",
    district: "Huyện Cần Giờ",
    category: "nature",
    icon: "🌳",
    badge: "Lá phổi xanh",
    description: "Khu dự trữ sinh quyển thế giới với thảm rừng ngập mặn kỳ vĩ",
    longitude: 106.9189,
    latitude: 10.4682,
    zoom: 12.0,
    pitch: 35,
    bearing: 0,
  },
];
