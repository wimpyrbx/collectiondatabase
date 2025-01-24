import { Region, ProductType, Rating } from '@/types/data';

interface DisplayInfo {
  displayName: string;
  imagePath: string | null;
}

/**
 * Gets the display information for a rating based on the region and rating name
 */
export const getRatingDisplayInfo = (
  regionName: string | null, 
  ratingName: string | null,
  regions: Region[]
): DisplayInfo => {
  if (!regionName || !ratingName) return { displayName: '', imagePath: null };
  
  const region = regions.find((r: Region) => r.name === regionName);
  if (!region) return { displayName: ratingName, imagePath: null };

  for (const system of region.rating_systems) {
    const rating = system.ratings.find((r: Rating) => r.name === ratingName);
    if (rating) {
      return {
        displayName: rating.display_name,
        imagePath: rating.image_path
      };
    }
  }
  return { displayName: ratingName, imagePath: null };
};

/**
 * Gets the display information for a product type based on the type name
 */
export const getProductTypeInfo = (
  typeName: string | null,
  productTypes: ProductType[]
): DisplayInfo => {
  if (!typeName) return { displayName: '', imagePath: null };
  
  const productType = productTypes.find((t: ProductType) => t.name === typeName);
  return {
    displayName: productType?.display_name || typeName,
    imagePath: productType?.image_path || null
  };
}; 