import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';

interface ProductType {
  id: number;
  name: string;
  display_name: string;
  image_path: string;
}

interface ProductGroup {
  id: number;
  name: string;
  display_name: string;
}

export const useProductMetadata = () => {
  const productTypes = productTypesData.types as ProductType[];
  const productGroups = productGroupsData.groups as ProductGroup[];

  return {
    productTypes,
    productGroups,
    productTypeNames: productTypes.map(type => type.name),
    productGroupNames: productGroups.map(group => group.name)
  };
}; 