export interface TagsRelationshipView {
  combined_data: {
    products: Record<string, string[]>;  // Format: "tagname=value" or just "tagname" for boolean
    inventory: Record<string, string[]>;  // Format: "tagname=value" or just "tagname" for boolean
  };
}

export interface Tag {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export type TagType = 'boolean' | 'set' | 'text';

export interface BaseTag {
  id: number;
  created_at: string;
  tag_name: string | null;
  tag_description: string | null;
  tags_display_in_table: boolean;
  tags_display_in_table_order: number | null;
  tag_type: TagType;
  tag_values: string[] | null;
  tag_product_types: string[] | null;
  tag_product_groups: string[] | null;
}

export interface ProductTag extends BaseTag {}

export interface InventoryTag extends BaseTag {}

// Helper type for getting tags by ID
export type TagsByIdGetter = (id: number) => string[];

export default {}; 