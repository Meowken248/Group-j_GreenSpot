import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Tự động đính kèm Access Token vào mọi yêu cầu cần xác thực
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("greenspot_access_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


