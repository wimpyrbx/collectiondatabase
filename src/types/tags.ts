export interface TagsRelationshipView {
  combined_data: {
    products: Record<string, string[]>;
    inventory: Record<string, string[]>;
  };
}

// Helper type for getting tags by ID
export type TagsByIdGetter = (id: number) => string[] | undefined;

export default {}; 