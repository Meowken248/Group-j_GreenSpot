export const scanQRCode = async () => ({
  success: true,
  points_awarded: 0,
  facility_name: "Trạm mẫu Mock",
  message: "Quét mã QR thành công (Mock)",
});
export const fetchQRCodeInfo = async () => ({
  code: "MOCK-CODE",
  facility_id: "mock-facility-id",
  facility_name: "Trạm mẫu Mock",
});
