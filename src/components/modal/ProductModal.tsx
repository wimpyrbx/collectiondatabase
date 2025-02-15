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

  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [initialFormState, setInitialFormState] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Reset form state when modal opens/product changes
  useEffect(() => {
    if (isOpen && mode === 'edit' && product) {
      setInitialFormState({
        product_title: product.product_title || '',
        product_variant: product.product_variant || '',
        release_year: product.release_year?.toString() || '',
        pricecharting_id: product.pricecharting_id || '',
        product_group_name: product.product_group_name || '',
        product_type_name: product.product_type_name || '',
        product_notes: product.product_notes || '',
        region: product.region_name || '',
        rating: product.rating_name || ''
      });
      setHasFormChanges(false);
    } else if (mode === 'create') {
      setInitialFormState({
        product_title: '',
        product_variant: '',
        release_year: '',
        pricecharting_id: '',
        product_group_name: '',
        product_type_name: '',
        product_notes: '',
        region: '',
        rating: ''
      });
      setHasFormChanges(true); // Always enable save for new products
    }
  }, [isOpen, product, mode]);

  // Track form changes
  useEffect(() => {
    if (mode === 'create') return; // Don't track changes for new products
    
    if (initialFormState && formData) {
      const hasChanges = Object.keys(initialFormState).some(key => {
        const initial = initialFormState[key];
        let current = '';

        // Handle special cases for region and rating
        if (key === 'region') {
          current = regionRating.region || '';
        } else if (key === 'rating') {
          current = regionRating.rating || '';
        } else {
          current = formData[key as keyof typeof formData]?.toString() || '';
        }

        // Normalize values for comparison (treat null, undefined, and empty string as equivalent)
        const normalizedInitial = initial === null || initial === undefined ? '' : initial.toString();
        const normalizedCurrent = current === null || current === undefined ? '' : current.toString();

        const hasChanged = normalizedInitial !== normalizedCurrent;
        
        if (hasChanged) {
          console.log(`Field ${key} changed:`, {
            initial: initial,
            normalizedInitial,
            current: current,
            normalizedCurrent,
          });
        }

        return hasChanged;
      });

      console.log('Form changes detected:', {
        initialState: initialFormState,
        currentState: {
          ...formData,
          region: regionRating.region,
          rating: regionRating.rating
        },
        hasChanges
      });
      
      setHasFormChanges(hasChanges);
    }
  }, [formData, initialFormState, mode, regionRating]);

  // Only show delete button if product exists and has no inventory items
  const canDelete = product && (!product.total_count || product.total_count === 0);

  const confirmDelete = async () => {
    try {
      await handleDelete();
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

  // Modify the handleSubmit to only work if there are changes
  const wrappedHandleSubmit = (e: React.FormEvent) => {
    if (!hasFormChanges) {
      e.preventDefault();
      return;
    }
    handleSubmit(e);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <Card modal className="w-[1024px]">
          <Card.Header
            icon={<FaLayerGroup />}
            iconColor="text-cyan-500"
            title={mode === 'create' ? 'New Product' : `Product: ${product?.product_title}`}
            bgColor="bg-cyan-500/50"
            rightContent={
              <div className="shrink-0 ml-4 whitespace-nowrap">
                {product ? `ID: ${product.product_id}` : undefined}
              </div>
            }
          />
          <Card.Body>
            <div className="h-[350px] overflow-y-auto px-6">
              <form id="product-form" onSubmit={wrappedHandleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Image Column */}
                  <div className="col-span-3">
                    <ImageContainer
                      type="product"
                      id={product?.product_id || -1}
                      title={product?.product_title || 'New Product'}
                      onError={(message) => setErrors(prev => [...prev, message])}
                      className="h-[250px] w-full"
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

                    <div className="grid grid-cols-[5fr_1fr] gap-4">
                        {/* Region & Rating Selector */}
                        <div className="col-span-1">
                            <RegionRatingSelector
                                value={regionRating}
                                onChange={setRegionRating}
                            />
                        </div>

                        {/* Rating Image */}
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
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex items-center justify-between w-full">
              {/* Left side - Previous and Cancel */}
              <div className="flex gap-2">
                {onNavigate && (
                  <Button
                    onClick={() => handleNavigate('prev')}
                    bgColor="bg-gray-800"
                    hoverBgColor={true}
                    iconLeft={<FaChevronLeft />}
                    disabled={!tableData.length || tableData[0]?.product_id === product?.product_id}
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  bgColor="bg-orange-800"
                  hoverBgColor={true}
                >
                  Cancel
                </Button>
              </div>

              {/* Center - Delete button or explanation */}
              <div className="flex-1 flex justify-center">
                {canDelete ? (
                  <Button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    bgColor="bg-red-900/50"
                    hoverBgColor={true}
                    iconLeft={<FaTrash />}
                  >
                    Delete
                  </Button>
                ) : product && (
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <FaExclamationTriangle className="text-yellow-500" />
                    Cannot delete - {product.total_count} item{product.total_count !== 1 ? 's' : ''} in inventory
                  </span>
                )}
              </div>

              {/* Right side - Save and Next */}
              <div className="flex gap-2">
                <Button
                  onClick={wrappedHandleSubmit}
                  bgColor="bg-green-600/50"
                  hoverBgColor={false}
                  iconLeft={<FaSave />}
                  disabled={!hasFormChanges || isUpdating}
                  className={clsx(
                    "transition-colors duration-200",
                    (!hasFormChanges || isUpdating) && "opacity-50 bg-gray-800/50 cursor-not-allowed"
                  )}
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                {onNavigate && (
                  <Button
                    onClick={() => handleNavigate('next')}
                    bgColor="bg-gray-800"
                    hoverBgColor={true}
                    iconRight={<FaChevronRight />}
                    disabled={!tableData.length || tableData[tableData.length - 1]?.product_id === product?.product_id}
                  >
                    Next
                  </Button>
                )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-200 mb-4">
              Delete Product
            </Dialog.Title>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsDeleteConfirmOpen(false)}
                bgColor="bg-gray-800"
                hoverBgColor={true}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                bgColor="bg-red-900/50"
                hoverBgColor={true}
                iconLeft={<FaTrash />}
              >
                Delete
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}; 