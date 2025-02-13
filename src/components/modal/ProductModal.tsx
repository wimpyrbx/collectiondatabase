import React, { useEffect, useState, useCallback } from 'react';
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
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck, FaExclamationTriangle, FaDollarSign, FaUpload, FaChevronLeft, FaChevronRight, FaTrash, FaSave } from 'react-icons/fa';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { useProductModal } from '@/hooks/useProductModal';
import { ImageContainer } from '@/components/image/ImageContainer';
import { Dialog } from '@headlessui/react';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import { deleteImage } from '@/utils/imageUtils';
import clsx from 'clsx';

interface ProductModalProps {
  product?: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productId: number) => void;
  mode?: 'create' | 'edit';
  tableData?: ProductViewItem[];
  onNavigate?: (productId: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
  mode = product ? 'edit' : 'create',
  tableData = [],
  onNavigate,
  currentPage = 1,
  onPageChange,
  pageSize = 10
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
    handlePendingImageChange,
    handleDelete
  } = useProductModal({
    product,
    isOpen,
    onClose,
    onSuccess,
    mode
  });

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Only show delete button if product exists and has no inventory items
  const canDelete = product && product.total_count === 0;

  const confirmDelete = async () => {
    try {
      await handleDelete();
      // Delete the product image if it exists
      await deleteImage('product', product!.product_id);
      onClose();
    } catch (error) {
      setErrors(['Failed to delete product']);
    }
    setIsDeleteConfirmOpen(false);
  };

  // Convert product types and groups to options format
  const productTypeOptions = productTypesData.types.map(type => ({
    value: type.name,
    label: type.display_name
  }));

  const productGroupOptions = productGroupsData.groups.map(group => ({
    value: group.name,
    label: group.display_name
  }));

  // Navigation functions
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!product || !tableData.length) return;

    const currentIndex = tableData.findIndex(item => item.product_id === product.product_id);
    if (currentIndex === -1) return;

    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= tableData.length) return;

    // Calculate new page if needed
    const newPage = Math.floor(newIndex / pageSize) + 1;
    
    // Update page if needed
    if (newPage !== currentPage && onPageChange) {
      onPageChange(newPage);
    }

    // Navigate to the new product
    const newProduct = tableData[newIndex];
    if (newProduct && onNavigate) {
      onNavigate(newProduct.product_id);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || mode !== 'edit') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input element
      const activeElement = document.activeElement;
      const isInFormElement = activeElement?.tagName === 'INPUT' || 
                             activeElement?.tagName === 'TEXTAREA' || 
                             activeElement?.tagName === 'SELECT';

      if (isInFormElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, product, tableData]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <Card modal>
          <Card.Header
            icon={<FaLayerGroup />}
            iconColor="text-cyan-500"
            title={mode === 'create' ? 'New Product' : `Product: ${product?.product_title}`}
            bgColor="bg-cyan-500/50"
            rightContent={
              <div className="flex items-center gap-2">
                {mode === 'edit' && (
                  <>
                    <Button
                      onClick={() => handleNavigate('prev')}
                      bgColor="bg-gray-700"
                      iconLeft={<FaChevronLeft />}
                      type="button"
                      className="w-10 !p-0"
                      disabled={!tableData.length || tableData[0]?.product_id === product?.product_id}
                    />
                    <Button
                      onClick={() => handleNavigate('next')}
                      bgColor="bg-gray-700"
                      iconLeft={<FaChevronRight />}
                      type="button"
                      className="w-10 !p-0"
                      disabled={!tableData.length || tableData[tableData.length - 1]?.product_id === product?.product_id}
                    />
                    <div className="w-4" /> {/* Spacer */}
                  </>
                )}
                {canDelete && (
                  <Button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    variant="danger"
                    size="sm"
                    icon={<FaTrash />}
                  >
                    Delete
                  </Button>
                )}
                {product ? `ID: ${product.product_id}` : undefined}
              </div>
            }
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleClose}
                  bgColor="bg-gray-800"
                  hoverBgColor="hover:bg-gray-700"
                >
                  Cancel
                </Button>
                {mode === 'edit' && (
                  <Button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    bgColor="bg-red-900/50"
                    hoverBgColor="hover:bg-red-900/75"
                    iconLeft={<FaTrash />}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  bgColor="bg-blue-900/50"
                  hoverBgColor="hover:bg-blue-900/75"
                  iconLeft={<FaSave />}
                >
                  Save
                </Button>
              </div>
              {mode === 'edit' && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleNavigate('prev')}
                    bgColor="bg-gray-800"
                    hoverBgColor="hover:bg-gray-700"
                    iconLeft={<FaChevronLeft />}
                    disabled={!tableData.length || tableData[0]?.product_id === product?.product_id}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => handleNavigate('next')}
                    bgColor="bg-gray-800"
                    hoverBgColor="hover:bg-gray-700"
                    iconLeft={<FaChevronRight />}
                    disabled={!tableData.length || tableData[tableData.length - 1]?.product_id === product?.product_id}
                  >
                    Next
                  </Button>
                </div>
              )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-200 mb-4">
              Delete Product
            </Dialog.Title>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setIsDeleteConfirmOpen(false)}
                bgColor="bg-gray-800"
                hoverBgColor="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                bgColor="bg-red-900/50"
                hoverBgColor="hover:bg-red-900/75"
                iconLeft={<FaTrash />}
              >
                Delete
              </Button>
              <Button
                onClick={handleSubmit}
                bgColor="bg-blue-900/50"
                hoverBgColor="hover:bg-blue-900/75"
                iconLeft={<FaSave />}
              >
                Confirm
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}; 