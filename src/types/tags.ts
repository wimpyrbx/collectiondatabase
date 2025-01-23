export interface TagsRelationshipView {
  combined_data: {
    products: Record<string, string[]>;
    inventory: Record<string, string[]>;
  };
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProductTag {
  id: number;
  created_at: string;
  tag_name: string | null;
  tag_description: string | null;
}

export interface InventoryTag {
  id: number;
  created_at: string;
  tag_name: string | null;
  tag_description: string | null;
}

// Helper type for getting tags by ID
export type TagsByIdGetter = (id: number) => string[] | undefined;

export default {}; 