export interface Rating {
  name: string;
  display_name: string;
  image_path?: string;
}

export interface RatingSystem {
  name: string;
  display_name: string;
  ratings: Rating[];
}

export interface Region {
  name: string;
  display_name: string;
  rating_systems: RatingSystem[];
} 