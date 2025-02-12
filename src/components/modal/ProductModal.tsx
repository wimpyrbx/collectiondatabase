import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';
import { FormElement, FormElementLabel } from '@/components/formelement';
import { Button } from '@/components/ui/';
import DisplayError from '@/components/ui/DisplayError';
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck, FaExclamationTriangle, FaDollarSign, FaUpload } from 'react-icons/fa';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { useProductModal } from '@/hooks/useProductModal';
import { ImageContainer } from '@/components/image/ImageContainer';

interface ProductModalProps {
  product?: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productId: number) => void;
  mode?: 'create' | 'edit';
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
  mode = product ? 'edit' : 'create'
}) => {
  const { updateProduct, createProduct, isUpdating, isCreating } = useProductsTable();
  const {
    formData,
    errors,
    regionRating,
    setRegionRating,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating: useProductModalUpdating,
    setErrors,
    pendingImage,
    handlePendingImageChange
  } = useProductModal({
    product,
    isOpen,
    onClose,
    onSuccess,
    mode
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <Card modal>
        <Card.Header
          icon={<FaLayerGroup />}
          iconColor="text-cyan-500"
          title={mode === 'create' ? 'New Product' : `Product: ${product?.product_title}`}
          bgColor="bg-cyan-500/50"
          rightContent={product ? `ID: ${product.product_id}` : undefined}
        />
        <Card.Body>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-12 gap-2 h-full">
              {/* Image Column */}
              <div className="col-span-3 w-full">
                <ImageContainer
                  type="product"
                  id={product?.product_id || -1}
                  title={product?.product_title || 'New Product'}
                  onError={(message) => setErrors(prev => [...prev, message])}
                  className="max-h-[400px]"
                  pendingImage={pendingImage}
                  onPendingImageChange={handlePendingImageChange}
                  isCreateMode={mode === 'create'}
                />
              </div>

              {/* Form Column */}
              <div className="col-span-9 space-y-4">
                {/* Title, Variant, and Year Row */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <FormElement
                      key={`title-${isOpen}-${product?.product_id ?? 'new'}`}
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
                      key={`variant-${isOpen}-${product?.product_id ?? 'new'}`}
                      elementType="input"
                      label="Variant"
                      labelIcon={<FaBoxes />}
                      labelIconColor="text-purple-400"
                      initialValue={formData.product_variant || ''}
                      onValueChange={(value) => handleInputChange('product_variant', String(value))}
                      labelPosition="above"
                    />
                  </div>
                  <div className="col-span-2">
                    <FormElement
                      key={`year-${isOpen}-${product?.product_id ?? 'new'}`}
                      elementType="input"
                      label="Year"
                      labelIcon={<FaCalendar />}
                      labelIconColor="text-yellow-400"
                      initialValue={formData.release_year?.toString() || ''}
                      onValueChange={(value) => handleInputChange('release_year', value ? Number(value) : null)}
                      labelPosition="above"
                    />
                  </div>
                  <div className="col-span-4">
                    <FormElement
                      key={`pricecharting-${isOpen}-${product?.product_id ?? 'new'}`}
                      elementType="input"
                      label="PriceCharting ID"
                      labelIcon={<FaDollarSign />}
                      labelIconColor="text-green-400"
                      initialValue={formData.pricecharting_id || ''}
                      onValueChange={(value) => handleInputChange('pricecharting_id', String(value) || null)}
                      labelPosition="above"
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
                    {/* if no rating selected add transition opacity */}
                    <div className="col-span-1">
                        <div className={`aspect-square p-2 mt-[16px] w-full h-[73px] rounded-md bg-gray-900 border border-gray-700 flex items-center justify-center ${!regionRating.rating ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}>
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
                    key={`group-${isOpen}-${product?.product_id ?? 'new'}`}
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
                    key={`type-${isOpen}-${product?.product_id ?? 'new'}`}
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
                    key={`notes-${isOpen}-${product?.product_id ?? 'new'}`}
                    elementType="textarea"
                    label="Notes"
                    labelIcon={<FaStickyNote />}
                    labelIconColor="text-green-400"
                    initialValue={formData.product_notes || ''}
                    onValueChange={(value) => handleInputChange('product_notes', String(value))}
                    labelPosition="above"
                    rows={4}
                  />
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
                bgColor="bg-orange-600"
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
                bgColor="bg-green-900"
                iconLeft={<FaCheck />}
                type="submit"
                className="w-32"
                disabled={isUpdating || isCreating || useProductModalUpdating}
              >
                {mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
          {errors.length > 0 && (
            <div className="mt-4">
              <DisplayError
                errors={errors}
              />
            </div>
          )}
        </Card.Footer>
      </Card>
    </Modal>
  );
}; 