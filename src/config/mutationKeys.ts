import { createMutationKey } from './queryConfig';

// Product mutations
export const PRODUCT_MUTATION_KEYS = {
  create: createMutationKey('createProduct'),
  update: createMutationKey('updateProduct'),
  delete: createMutationKey('deleteProduct'),
  addTag: createMutationKey('addProductTag'),
  removeTag: createMutationKey('removeProductTag'),
} as const;

// Inventory mutations
export const INVENTORY_MUTATION_KEYS = {
  create: createMutationKey('createInventory'),
  update: createMutationKey('updateInventory'),
  delete: createMutationKey('deleteInventory'),
  addTag: createMutationKey('addInventoryTag'),
  removeTag: createMutationKey('removeInventoryTag'),
} as const;

// Image mutations
export const IMAGE_MUTATION_KEYS = {
  update: createMutationKey('updateImage'),
  delete: createMutationKey('deleteImage'),
} as const;

// Tag mutations
export const TAG_MUTATION_KEYS = {
  add: createMutationKey('addTag'),
  remove: createMutationKey('removeTag'),
} as const; 