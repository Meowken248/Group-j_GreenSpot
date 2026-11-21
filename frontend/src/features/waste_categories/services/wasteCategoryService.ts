export const wasteCategoryService = {
  getCategories: async () => ({ items: [], total: 0 }),
  getCategoryById: async () => null,
  createCategory: async () => ({ id: "mock-id" }),
  updateCategory: async () => ({ id: "mock-id" }),
  deleteCategory: async () => true,
  checkCodeUnique: async () => ({ is_unique: true }),
  checkNameUnique: async () => ({ is_unique: true }),
};
