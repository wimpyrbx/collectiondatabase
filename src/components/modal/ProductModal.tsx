import React, { useRef } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import { TypedTagSelector, type TypedTagSelectorRef } from '@/components/product/TypedTagSelector';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';
import { FormElement, FormElementLabel } from '@/components/formelement';
import { Button } from '@/components/ui/';
import DisplayError from '@/components/ui/DisplayError';
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck, FaExclamationTriangle, FaTags, FaDollarSign } from 'react-icons/fa';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { useProductModal } from '@/hooks/useProductModal';
import { ImageContainer } from '@/components/image/ImageContainer';

interface ProductModalProps {
  product: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: (productId: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateSuccess
}) => {
  const { updateProduct, isUpdating } = useProductsTable();
  const {
    formData,
    errors,
    tagSelectorRef,
    regionRating,
    setRegionRating,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating: useProductModalUpdating,
    setErrors
  } = useProductModal({
    product,
    isOpen,
    onClose,
    onUpdateSuccess
  });

  // Convert product types and groups to options format
  const productTypeOptions = productTypesData.types.map(type => ({
    value: type.name,
    label: type.display_name
  }));

  const productGroupOptions = productGroupsData.groups.map(group => ({
    value: group.name,
    label: group.display_name
  }));

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <Card modal>
        <Card.Header
          icon={<FaLayerGroup />}
          iconColor="text-cyan-500"
          title={`Product: ${product.product_title}`}
          bgColor="bg-cyan-500/50"
          rightContent={`ID: ${product.product_id}`}
        />
        <Card.Body>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-12 gap-2 h-full">
              {/* Image Column */}
              <div className="col-span-2 w-full">
                <ImageContainer
                  type="product"
                  id={product.product_id}
                  title={product.product_title}
                  onError={(message) => setErrors(prev => [...prev, message])}
                  className="max-h-[400px]"
                />
              </div>

              {/* Form Column */}
              <div className="col-span-6 space-y-4">
                {/* Title, Variant, and Year Row */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <FormElement
                      key={`title-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="Title"
                      labelIcon={<FaTag />}
                      labelIconColor="text-blue-400"
                      initialValue={formData.product_title || ''}
                      onValueChange={(value) => handleInputChange('product_title', String(value))}
                      labelPosition="above"
                    />
                  </div>
                  <div className="col-span-4">
                    <FormElement
                      key={`variant-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="Variant"
                      labelIcon={<FaBoxes />}
                      labelIconColor="text-purple-400"
                      initialValue={formData.product_variant || ''}
                      onValueChange={(value) => handleInputChange('product_variant', String(value))}
                      labelPosition="above"
                      className={`transition-opacity duration-200 ${!formData.product_variant ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormElement
                      key={`year-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="Year"
                      labelIcon={<FaCalendar />}
                      labelIconColor="text-yellow-400"
                      initialValue={formData.release_year?.toString() || ''}
                      onValueChange={(value) => handleInputChange('release_year', value ? Number(value) : null)}
                      labelPosition="above"
                      className={`transition-opacity duration-200 ${!formData.release_year ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
                    />
                  </div>
                  <div className="col-span-4">
                    <FormElement
                      key={`pricecharting-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="PriceCharting ID"
                      labelIcon={<FaDollarSign />}
                      labelIconColor="text-green-400"
                      initialValue={formData.pricecharting_id || ''}
                      onValueChange={(value) => handleInputChange('pricecharting_id', String(value) || null)}
                      labelPosition="above"
                      className={`transition-opacity duration-200 ${!formData.pricecharting_id ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[5fr_1fr] gap-2">
                    {/* Region & Rating Selector */}
                    <div className="col-span-1">
                        <RegionRatingSelector
                            value={regionRating}
                            onChange={setRegionRating}
                        />
                    </div>

                    {/* Rating Image */}
                    <div className="col-span-1">
                        <div className="aspect-square p-2 mt-[16px] w-full h-[73px] rounded-md bg-gray-900 border border-gray-700 flex items-center justify-center">
                            {regionRating.rating ? (() => {
                                const ratingInfo = getRatingDisplayInfo(regionRating.region, regionRating.rating, regionsData.regions);
                                    return ratingInfo && ratingInfo.imagePath ? (
                                    <img 
                                        src={ratingInfo.imagePath} 
                                        alt={regionRating.rating} 
                                        className="max-w-full max-h-full object-contain" 
                                    />
                                    ) : null;
                                })() : (
                                <span className="text-gray-600 text-xs">No Rating</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Product Group and Type Row */}
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-2">
                  <FormElement
                    key={`group-${isOpen}-${product.product_id}`}
                    elementType="listsingle"
                    label="Product Group"
                    labelIcon={<FaLayerGroup />}
                    labelIconColor="text-indigo-400"
                    options={productGroupOptions}
                    selectedOptions={formData.product_group_name || ''}
                    onValueChange={(value) => handleInputChange('product_group_name', String(value))}
                    labelPosition="above"
                  />
                  <FormElement
                    key={`type-${isOpen}-${product.product_id}`}
                    elementType="listsingle"
                    label="Product Type"
                    labelIcon={<FaCubes />}
                    labelIconColor="text-pink-400"
                    options={productTypeOptions}
                    selectedOptions={formData.product_type_name || ''}
                    onValueChange={(value) => handleInputChange('product_type_name', String(value))}
                    labelPosition="above"
                  />
                  {/* Notes */}
                  <FormElement
                    key={`notes-${isOpen}-${product.product_id}`}
                    elementType="textarea"
                    label="Notes"
                    labelIcon={<FaStickyNote />}
                    labelIconColor="text-green-400"
                    initialValue={formData.product_notes || ''}
                    onValueChange={(value) => handleInputChange('product_notes', String(value))}
                    labelPosition="above"
                    rows={3}
                    className={`transition-opacity duration-200 ${!formData.product_notes ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
                  />
                </div>

              </div>

              {/* Tags Column */}
              <div className="col-span-4">
                <FormElementLabel
                  label="Product Tags"
                  labelIcon={<FaTags />}
                  labelIconColor="text-orange-500"
                />
                <div className="rounded-lg bg-gray-900/50 border border-gray-700 p-3 pt-0 pb-0 mb-0 mt-[3px]">
                  {product && (
                    <TypedTagSelector
                      key={`tags-${isOpen}-${product.product_id}`}
                      ref={tagSelectorRef}
                      productId={product.product_id}
                    />
                  )}
                </div>
              </div>
            </div>
          </form>
        </Card.Body>
        <Card.Footer>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-start">
              <Button
                onClick={handleClose}
                bgColor="bg-red-900"
                iconLeft={<FaTimes />}
                type="button"
                className="w-32"
              >
                Cancel
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                form="product-form"
                disabled={useProductModalUpdating}
                bgColor="bg-green-900"
                iconLeft={<FaCheck />}
                className="w-32"
              >
                {useProductModalUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card.Footer>
      </Card>
      {errors.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50">
          <DisplayError 
            errors={errors}
            header="Please correct the following issues:"
            icon={FaExclamationTriangle}
            iconColor="text-red-400"
            bgColor="bg-red-900/50"
            borderColor="border-red-700"
            textColor="text-red-200"
          />
        </div>
      )}
    </Modal>
  );
}; 