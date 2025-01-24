export interface Rating {
  id: number;
  name: string;
  display_name: string;
  display_order: number;
  description: string;
  image_path: string;
}

export interface RatingSystem {
  id: number;
  name: string;
  display_name: string;
  display_order: number;
  description: string;
  ratings: Rating[];
}

export interface Region {
  id: number;
  name: string;
  display_name: string;
  display_order: number;
  description: string;
  rating_systems: RatingSystem[];
}

export interface ProductType {
  id: number;
  name: string;
  display_name: string;
  image_path: string;
}

export interface RegionsData {
  regions: Region[];
}

export interface ProductTypesData {
  types: ProductType[];
} 