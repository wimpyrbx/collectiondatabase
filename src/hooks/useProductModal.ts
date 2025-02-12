import { useRef, useCallback, useState } from 'react';
import { useModalForm } from './useModalForm';
import { useProductService } from './useProductService';
import type { ProductViewItem } from '@/types/product';
import type { RegionRatingValue } from '@/components/product/RegionRatingSelector';
import type { ProductUpdateDTO, ProductCreateDTO } from '@/services/ProductService';
import regionsData from '@/data/regions.json';
import type { Region, RatingSystem, Rating } from '@/types/data';
import { uploadImage } from '@/utils/imageUtils';

interface UseProductModalOptions {
  product: ProductViewItem | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productId: number) => void;
  mode?: 'create' | 'edit';
}

export function useProductModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  mode = 'edit'
}: UseProductModalOptions) {
  const productService = useProductService();
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [regionRating, setRegionRating] = useState<RegionRatingValue>({
    region: '',
    ratingSystem: undefined,
    rating: undefined
  });

  // Reset all form state
  const resetForm = useCallback(() => {
    setRegionRating({
      region: '',
      ratingSystem: undefined,
      rating: undefined
    });
    setPendingImage(null);
  }, []);

  // Transform product data for the form
  const transformInitialData = useCallback((product: ProductViewItem | null) => {
    if (!product) {
      // Set default region and rating for new products
      setRegionRating({
        region: 'PAL',
        ratingSystem: 'PEGI',
        rating: 'PEGI 16'
      });
      setPendingImage(null);

      return {
        product_title: '',
        product_variant: '',
        release_year: '',
        product_notes: '',
        product_group_name: 'Xbox 360',
        product_type_name: 'Game',
        pricecharting_id: ''
      };
    }

    // Reset pending image when editing existing product
    setPendingImage(null);

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
    transform: transformInitialData,
    onReset: resetForm
  });

  const handleClose = useCallback(() => {
    closeForm();
    resetForm();
  }, [closeForm, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data
    const data = {
      product_title: formData.product_title,
      product_variant: formData.product_variant || null,
      release_year: formData.release_year ? Number(formData.release_year) : null,
      product_notes: formData.product_notes || null,
      product_group: formData.product_group_name || null,
      product_type: formData.product_type_name,
      pricecharting_id: formData.pricecharting_id || null,
      region: regionRating.region || null,
      rating: regionRating.rating || null
    };

    if (mode === 'create') {
      const { data: createdProduct, errors: createErrors } = await productService.create(data as ProductCreateDTO);
      if (createErrors.length > 0) {
        setErrors(createErrors);
        return;
      }

      // If we have a pending image, upload it now that we have the product ID
      if (pendingImage && createdProduct) {
        try {
          const { success, message } = await uploadImage(pendingImage, 'product', createdProduct.id);
          if (!success) {
            setErrors(prev => [...prev, `Image upload failed: ${message}`]);
          }
        } catch (error) {
          setErrors(prev => [...prev, 'Failed to upload image']);
        }
      }

      onSuccess?.(createdProduct!.id);
    } else if (product) {
      const { data: updatedProduct, errors: updateErrors } = await productService.update(product.product_id, data as ProductUpdateDTO);
      if (updateErrors.length > 0) {
        setErrors(updateErrors);
        return;
      }
      onSuccess?.(product.product_id);
    }

    handleClose();
  };

  const handlePendingImageChange = (file: File | null) => {
    setPendingImage(file);
  };

  return {
    formData,
    errors,
    regionRating,
    setRegionRating,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating: false,
    setErrors,
    pendingImage,
    handlePendingImageChange
  };
} 