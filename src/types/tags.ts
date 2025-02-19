export type TagDisplayType = 'icon' | 'text' | 'image';

export interface BaseTag {
    id: number;
    name: string;
    product_groups: string[] | null;
    product_types: string[] | null;
    description: string | null;
    display_type: TagDisplayType;
    display_value: string;
    color: string | null;
    created_at: string;
}

export interface ProductTag extends BaseTag {}
export interface InventoryTag extends BaseTag {}

export interface TagRelationship {
    tag_id: number;
    created_at: string;
}

export interface ProductTagRelationship extends TagRelationship {
    product_id: number;
}

export interface InventoryTagRelationship extends TagRelationship {
    inventory_id: number;
}

export interface TagWithRelationships extends BaseTag {
    relationships_count: number;
}

// DTOs for creating new tags
export interface NewTag {
    name: string;
    product_groups?: string[] | null;
    product_types?: string[] | null;
    description?: string | null;
    display_type: TagDisplayType;
    display_value: string;
    color?: string | null;
}

export type NewProductTag = NewTag;
export type NewInventoryTag = NewTag;

// View types that include the tag information
export interface TagInfo {
    id: number;
    name: string;
    display_type: TagDisplayType;
    display_value: string;
    description: string | null;
    color: string | null;
}

export interface WithTags {
    tags: TagInfo[];
} 