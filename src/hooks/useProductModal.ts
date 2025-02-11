import { useRef, useCallback, useState } from 'react';
import { useModalForm } from './useModalForm';
import { useProductService } from './useProductService';
import type { ProductViewItem } from '@/types/product';
import type { TypedTagSelectorRef } from '@/components/product/TypedTagSelector';
import type { RegionRatingValue } from '@/components/product/RegionRatingSelector';
import type { ProductUpdateDTO } from '@/services/ProductService';
import regionsData from '@/data/regions.json';
import type { Region, RatingSystem, Rating } from '@/types/data';

interface UseProductModalOptions {
  product: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: (productId: number) => void;
}

export function useProductModal({
  product,
  isOpen,
  onClose,
  onUpdateSuccess
}: UseProductModalOptions) {
  const productService = useProductService();
  const tagSelectorRef = useRef<TypedTagSelectorRef>(null);
  const [regionRating, setRegionRating] = useState<RegionRatingValue>({
    region: '',
    ratingSystem: undefined,
    rating: undefined
  });

  // Transform product data for the form
  const transformInitialData = useCallback((product: ProductViewItem) => {
    // Find the rating system for the given rating
    let foundRegion = '';
    let foundRatingSystem = undefined;
    let foundRating = undefined;

    // Always set region if it exists, regardless of rating
    if (product.region_name) {
      foundRegion = product.region_name;
      
      // Only look for rating system and rating if rating_name exists
      if (product.rating_name) {
        const region = regionsData.regions.find((r: Region) => r.name === product.region_name);
        if (region) {
          for (const system of region.rating_systems) {
            const rating = system.ratings.find((r: Rating) => r.name === product.rating_name);
            if (rating) {
              foundRatingSystem = system.name;
              foundRating = rating.name;
              break;
            }
          }
        }
      }
    }

    // Set initial region and rating
    setRegionRating({
      region: foundRegion,
      ratingSystem: foundRatingSystem,
      rating: foundRating
    });

    return {
      product_title: product.product_title,
      product_variant: product.product_variant,
      release_year: product.release_year?.toString() || '',
      product_notes: product.product_notes,
      product_group_name: product.product_group_name || '',
      product_type_name: product.product_type_name || '',
      pricecharting_id: product.pricecharting_id
    };
  }, []);

  const {
    formData,
    errors,
    setErrors,
    handleInputChange,
    handleClose: closeForm
  } = useModalForm({
    initialData: product,
    isOpen,
    onClose,
    transform: transformInitialData
  });

  const handleClose = useCallback(() => {
    closeForm();
    setRegionRating({
      region: '',
      ratingSystem: undefined,
      rating: undefined
    });
  }, [closeForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Prepare update data
    const updateData: ProductUpdateDTO = {
      product_title: formData.product_title,
      product_variant: formData.product_variant,
      release_year: formData.release_year ? Number(formData.release_year) : null,
      product_notes: formData.product_notes,
      product_group: formData.product_group_name,
      product_type: formData.product_type_name,
      pricecharting_id: formData.pricecharting_id,
      region: regionRating.region || null,
      rating: regionRating.rating || null
    };

    const { data, errors } = await productService.updateWithTags(
      product.product_id,
      updateData,
      tagSelectorRef
    );

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    onUpdateSuccess?.(product.product_id);
    handleClose();
  };

  return {
    formData,
    errors,
    tagSelectorRef,
    regionRating,
    setRegionRating,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating: false, // This would come from the service if needed
    setErrors
  };
} 