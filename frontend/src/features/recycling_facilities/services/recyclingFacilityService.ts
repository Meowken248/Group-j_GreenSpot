export const recyclingFacilityService = {
  getFacilities: async () => ({ items: [], total: 0 }),
  getFacilityById: async () => null,
  createFacility: async () => ({ id: "mock-id" }),
  updateFacility: async () => ({ id: "mock-id" }),
  deleteFacility: async () => true,
  getDistricts: async () => [],
  checkNameUnique: async () => ({ is_unique: true }),
  checkProximity: async () => ({ is_valid: true }),
};
