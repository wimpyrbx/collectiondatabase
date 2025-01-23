import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { useTagsCache } from '@/hooks/useTagsCache';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import type { Product } from '@/types/tables';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';
import FormElement from '@/components/formelement/FormElement';
import { Button } from '@/components/ui/';
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck } from 'react-icons/fa';

interface ProductModalProps {
  product: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { updateProduct, isUpdating } = useProductsTable();
  const { getProductTags } = useTagsCache();
  const [formData, setFormData] = React.useState<Partial<Product>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [regionRating, setRegionRating] = React.useState<RegionRatingValue>({
    region: '',
    ratingSystem: undefined,
    rating: undefined
  });

  // Function to reset form data from product
  const resetFormData = React.useCallback((product: ProductViewItem | null) => {
    if (product) {
      setFormData({
        product_title: product.product_title,
        product_variant: product.product_variant,
        release_year: product.release_year,
        product_notes: product.product_notes,
        product_group: product.product_group_name,
        product_type: product.product_type_name,
      });

      // Find the rating system for the given rating
      let foundRegion = '';
      let foundRatingSystem = undefined;
      let foundRating = undefined;

      if (product.region_name && product.rating_name) {
        // Find the region
        const region = regionsData.regions.find(r => r.name === product.region_name);
        if (region) {
          foundRegion = region.name;
          
          // Search through rating systems to find the one containing our rating
          for (const system of region.rating_systems) {
            const rating = system.ratings.find(r => r.name === product.rating_name);
            if (rating) {
              foundRatingSystem = system.name;
              foundRating = rating.name;
              break;
            }
          }
        }
      }

      // Set initial region and rating with the found values
      setRegionRating({
        region: foundRegion,
        ratingSystem: foundRatingSystem,
        rating: foundRating
      });
    }
  }, []);

  // Reset form when product changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      resetFormData(product);
      setError(null); // Clear any previous errors
    }
  }, [product, resetFormData, isOpen]);

  // Handle modal close
  const handleClose = () => {
    resetFormData(product); // Reset form data to original values
    setError(null); // Clear any errors
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validate required fields
    if (!formData.product_title?.trim()) {
      setError('Product title is required');
      return;
    }

    // Include region and rating in the update
    const updates = {
      ...formData,
      region: regionRating.region || null,
      rating: regionRating.rating || null
    };

    try {
      await updateProduct({ id: product.product_id, updates });
      setError(null);
      onClose();
    } catch (error) {
      console.error('Failed to update product:', error);
      setError(error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setError(null); // Clear error when user makes changes
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!product) return null;

  const productTags = getProductTags(product.product_id);

  // Convert product types and groups to options format
  const productTypeOptions = productTypesData.types.map(type => ({
    value: type.name,
    label: type.display_name
  }));

  const productGroupOptions = productGroupsData.groups.map(group => ({
    value: group.name,
    label: group.display_name
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Card modal>
        <Card.Header
          icon={<FaBox />}
          iconColor="text-orange-500"
          title="Edit Product"
          bgColor="bg-orange-800/50"
        />
        <Card.Body>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm rounded bg-red-900/50 border border-red-700 text-red-200">
                {error}
              </div>
            )}

            {/* Title */}
            <FormElement
              key={`title-${isOpen}-${product.product_id}`}
              elementType="input"
              label="Title"
              labelIcon={<FaTag />}
              initialValue={formData.product_title || ''}
              onValueChange={(value) => handleInputChange('product_title', value)}
              labelPosition="above"
            />

            {/* Variant */}
            <FormElement
              key={`variant-${isOpen}-${product.product_id}`}
              elementType="input"
              label="Variant"
              labelIcon={<FaBoxes />}
              initialValue={formData.product_variant || ''}
              onValueChange={(value) => handleInputChange('product_variant', value)}
              labelPosition="above"
            />

            {/* Release Year */}
            <FormElement
              key={`year-${isOpen}-${product.product_id}`}
              elementType="input"
              label="Release Year"
              labelIcon={<FaCalendar />}
              initialValue={formData.release_year || ''}
              onValueChange={(value) => handleInputChange('release_year', value)}
              labelPosition="above"
              numericOnly
            />

            {/* Region & Rating Selector */}
            <RegionRatingSelector
              value={regionRating}
              onChange={setRegionRating}
              className="mt-4"
            />

            {/* Notes */}
            <FormElement
              key={`notes-${isOpen}-${product.product_id}`}
              elementType="textarea"
              label="Notes"
              labelIcon={<FaStickyNote />}
              initialValue={formData.product_notes || ''}
              onValueChange={(value) => handleInputChange('product_notes', value)}
              labelPosition="above"
              rows={3}
            />

            {/* Product Group */}
            <FormElement
              key={`group-${isOpen}-${product.product_id}`}
              elementType="listsingle"
              label="Product Group"
              labelIcon={<FaLayerGroup />}
              options={productGroupOptions}
              selectedOptions={formData.product_group || ''}
              onValueChange={(value) => handleInputChange('product_group', value)}
              labelPosition="above"
            />

            {/* Product Type */}
            <FormElement
              key={`type-${isOpen}-${product.product_id}`}
              elementType="listsingle"
              label="Product Type"
              labelIcon={<FaCubes />}
              options={productTypeOptions}
              selectedOptions={formData.product_type || ''}
              onValueChange={(value) => handleInputChange('product_type', value)}
              labelPosition="above"
            />

            {/* Tags Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Tags
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {productTags && productTags.length > 0 ? (
                  productTags.map(tag => (
                    <span 
                      key={tag}
                      className="px-3 py-1 text-sm rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 italic">No tags</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex grid grid-cols-2 gap-2 pt-4 border-t border-gray-700">
              <div>
                <Button
                  onClick={handleClose}
                  bgColor="bg-red-900"
                  iconLeft={<FaTimes />}
                >
                  Cancel
                </Button>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  bgColor="bg-green-900"
                  iconLeft={<FaCheck />}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Modal>
  );
}; 