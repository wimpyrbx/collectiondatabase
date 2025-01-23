import React from 'react';
import { Dialog } from '@headlessui/react';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import type { Product } from '@/types/tables';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import regionsData from '@/data/regions.json';

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
  const [formData, setFormData] = React.useState<Partial<Product>>({});
  const [regionRating, setRegionRating] = React.useState<RegionRatingValue>({
    region: '',
    ratingSystem: undefined,
    rating: undefined
  });

  // Reset form when product changes
  React.useEffect(() => {
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
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Include region and rating in the update
    const updates = {
      ...formData,
      region: regionRating.region || null,
      rating: regionRating.rating || null
    };

    try {
      await updateProduct({ id: product.product_id, updates });
      onClose();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!product) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-700">
            <Dialog.Title className="text-lg font-medium text-gray-100">
              Edit Product
            </Dialog.Title>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Title
              </label>
              <input
                type="text"
                value={formData.product_title || ''}
                onChange={(e) => handleInputChange('product_title', e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Variant */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Variant
              </label>
              <input
                type="text"
                value={formData.product_variant || ''}
                onChange={(e) => handleInputChange('product_variant', e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Release Year */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Release Year
              </label>
              <input
                type="number"
                value={formData.release_year || ''}
                onChange={(e) => handleInputChange('release_year', parseInt(e.target.value) || null)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Region & Rating Selector */}
            <RegionRatingSelector
              value={regionRating}
              onChange={setRegionRating}
              className="mt-4"
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Notes
              </label>
              <textarea
                value={formData.product_notes || ''}
                onChange={(e) => handleInputChange('product_notes', e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Product Group */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Product Group
              </label>
              <input
                type="text"
                value={formData.product_group || ''}
                onChange={(e) => handleInputChange('product_group', e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Product Type
              </label>
              <input
                type="text"
                value={formData.product_type || ''}
                onChange={(e) => handleInputChange('product_type', e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}; 