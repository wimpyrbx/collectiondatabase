import React, { useRef, useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import type { Product } from '@/types/tables';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import { TagSelector, type TagSelectorRef } from '@/components/product/TagSelector';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';
import FormElement from '@/components/formelement/FormElement';
import { Button } from '@/components/ui/';
import DisplayError from '@/components/ui/DisplayError';
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck, FaExclamationTriangle, FaUpload, FaImage } from 'react-icons/fa';
import { getProductImageUrl, useImageUpload } from '@/utils/imageUtils';
import clsx from 'clsx';
import { getRatingDisplayInfo } from '@/utils/productUtils';

interface ProductModalProps {
  product: ProductViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: (productId: number) => void;
}

// Add form data type that allows string for release_year
interface ProductFormData extends Omit<Partial<Product>, 'release_year'> {
  release_year?: string | number | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateSuccess
}) => {
  const { updateProduct, isUpdating } = useProductsTable();
  const [formData, setFormData] = React.useState<ProductFormData>({});
  const [errors, setErrors] = React.useState<string[]>([]);
  const tagSelectorRef = useRef<TagSelectorRef>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [regionRating, setRegionRating] = React.useState<RegionRatingValue>({
    region: '',
    ratingSystem: undefined,
    rating: undefined
  });

  // Use the centralized image upload hook
  const {
    handleDragEnter: onDragEnter,
    handleDragLeave: onDragLeave,
    handleDragOver,
    handleDrop: onDrop,
    handleFileInputChange
  } = useImageUpload(
    'product',
    product?.product_id || 0,
    {
      onUploadStart: () => {
        setIsUploading(true);
        setErrors([]);
      },
      onUploadSuccess: () => {
        // Refresh the image with a cache-busting query parameter
        if (product) {
          setImageSrc(`${getProductImageUrl(product.product_id)}&t=${Date.now()}`);
        }
      },
      onUploadError: (message) => {
        setErrors(prev => [...prev, message]);
      },
      onUploadComplete: () => {
        setIsUploading(false);
      }
    }
  );

  // Wrap the drag handlers to manage the isDragging state
  const handleDragEnter = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragEnter(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragging(false);
    onDrop(e);
  };

  // Function to reset form data from product
  const resetFormData = React.useCallback((product: ProductViewItem | null) => {
    if (product) {
      // Convert release_year to string for the form input
      setFormData({
        product_title: product.product_title,
        product_variant: product.product_variant,
        release_year: product.release_year?.toString() || '',
        product_notes: product.product_notes,
        product_group: product.product_group_name,
        product_type: product.product_type_name,
      });

      // Find the rating system for the given rating
      let foundRegion = '';
      let foundRatingSystem = undefined;
      let foundRating = undefined;

      // Always set region if it exists, regardless of rating
      if (product.region_name) {
        const region = regionsData.regions.find(r => r.name === product.region_name);
        if (region) {
          foundRegion = region.name;
          
          // Only look for rating system and rating if rating_name exists
          if (product.rating_name) {
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
      setErrors([]); // Clear any previous errors
    }
  }, [product, resetFormData, isOpen]);

  // Handle image loading when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setImageSrc(`${getProductImageUrl(product.product_id)}&t=${Date.now()}`);
    }
  }, [isOpen, product]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(''); // Clear the image
    }
  }, [isOpen]);

  // Handle modal close
  const handleClose = () => {
    resetFormData(product); // Reset form data to original values
    setErrors([]); // Clear any errors
    setImageSrc(''); // Clear the image immediately
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validate required fields
    const validationErrors: string[] = [];
    
    // Title validation
    if (!formData.product_title?.trim()) {
      validationErrors.push('Product title is required');
    }

    // Region/Rating validation
    if (regionRating.rating && !regionRating.region) {
      validationErrors.push('Region must be selected when a rating is specified');
    }

    // Validate that if rating system is selected, a rating must be selected
    if (regionRating.ratingSystem && !regionRating.rating) {
      validationErrors.push('Please select a rating when a rating system is chosen');
    }

    // Release year validation (from 1970 to current year)
    if (formData.release_year) {
      const year = Number(formData.release_year);
      if (isNaN(year) || year < 1970 || year > new Date().getFullYear()) {
        validationErrors.push('Release year must be a valid year between 1970 and ' + (new Date().getFullYear()));
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Include region and rating in the update
    const updates = {
      ...formData,
      // Convert release_year to number or null
      release_year: formData.release_year ? Number(formData.release_year) : null,
      region: regionRating.region || null,
      rating: regionRating.rating || null
    };

    try {
      await updateProduct({ id: product.product_id, updates });
      // Apply tag changes after successful product update
      tagSelectorRef.current?.applyChanges();
      setErrors([]);
      if (onUpdateSuccess) {
        onUpdateSuccess(product.product_id);
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      // Handle database constraint errors
      if (error instanceof Error) {
        if (error.message.includes('release_year')) {
          setErrors(['Release year must be a valid year number']);
        } else if (error.message.includes('violates foreign key constraint')) {
          setErrors(['One or more selected values are invalid. Please check your selections.']);
        } else {
          setErrors([error.message]);
        }
      } else {
        setErrors(['Failed to update product']);
      }
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setErrors([]); // Clear errors when user makes changes
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!product) return null;

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
          icon={<FaBox />}
          iconColor="text-yellow-500"
          title="Edit Product"
          bgColor="bg-orange-600/50"
          rightContent={`ID: ${product.product_id}`}
        />
        <Card.Body>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-12 gap-4 h-full">
              {/* Image Column */}
              <div className="col-span-3 h-full">
                <div 
                  className={clsx(
                    "relative w-full h-full rounded-lg overflow-hidden",
                    "bg-gray-900/50 border border-gray-700",
                    isDragging && "border-blue-500 border-2",
                    "transition-all duration-200",
                    "flex items-center justify-center" // Center content
                  )}
                  style={{ maxHeight: '400px' }} // Limit maximum height
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={product.product_title}
                      className={clsx(
                        "max-w-full max-h-full object-contain", // Show entire image
                        isDragging && "opacity-50"
                      )}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FaImage className="w-12 h-12 mb-2" />
                      <span className="text-sm">No image</span>
                    </div>
                  )}

                  {/* Upload Overlay */}
                  <div 
                    className={clsx(
                      "absolute inset-0 flex flex-col items-center justify-center",
                      "bg-black/50 backdrop-blur-sm",
                      "transition-opacity duration-200",
                      "items-center",
                      isDragging || isUploading ? "opacity-100" : "opacity-0 hover:opacity-100"
                    )}
                  >
                    {isUploading ? (
                      <div className="text-blue-400">
                        <FaUpload className="w-8 h-8 mb-2 animate-bounce" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-center flex flex-col items-center justify-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                        <FaUpload className="w-24 h-24 mb-6 text-gray-500" />
                        <span className="text-sm text-gray-300">
                          {isDragging ? 'Drop to upload' : 'Click or drag to upload'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Column */}
              <div className="col-span-6 space-y-4">
                <DisplayError 
                  errors={errors}
                  header="Please correct the following issues:"
                  icon={FaExclamationTriangle}
                  iconColor="text-red-400"
                  bgColor="bg-red-900/50"
                  borderColor="border-red-700"
                  textColor="text-red-200"
                />

                {/* Title, Variant, and Year Row */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <FormElement
                      key={`title-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="Title"
                      labelIcon={<FaTag />}
                      labelIconColor="text-blue-400"
                      initialValue={formData.product_title || ''}
                      onValueChange={(value) => handleInputChange('product_title', value)}
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
                      onValueChange={(value) => handleInputChange('product_variant', value)}
                      labelPosition="above"
                    />
                  </div>
                  <div className="col-span-2">
                    <FormElement
                      key={`year-${isOpen}-${product.product_id}`}
                      elementType="input"
                      label="Year"
                      labelIcon={<FaCalendar />}
                      labelIconColor="text-yellow-400"
                      maxLength={4}
                      initialValue={formData.release_year || ''}
                      onValueChange={(value) => handleInputChange('release_year', value)}
                      labelPosition="above"
                      numericOnly
                    />
                  </div>
                </div>

                {/* Region & Rating Selector */}
                <RegionRatingSelector
                  value={regionRating}
                  onChange={setRegionRating}
                  className="mt-4"
                />

                {/* Rating Image using getRatingDisplayInfo */}
                <div className="col-span-3">
                  <div className="aspect-square p-2 w-16 h-16 bg-gray-900/50 border border-gray-700 flex items-center justify-center">
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

                {/* Product Group and Type Row */}
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-4">
                  <FormElement
                    key={`group-${isOpen}-${product.product_id}`}
                    elementType="listsingle"
                    label="Product Group"
                    labelIcon={<FaLayerGroup />}
                    labelIconColor="text-indigo-400"
                    options={productGroupOptions}
                    selectedOptions={formData.product_group || ''}
                    onValueChange={(value) => handleInputChange('product_group', value)}
                    labelPosition="above"
                  />
                  <FormElement
                    key={`type-${isOpen}-${product.product_id}`}
                    elementType="listsingle"
                    label="Product Type"
                    labelIcon={<FaCubes />}
                    labelIconColor="text-pink-400"
                    options={productTypeOptions}
                    selectedOptions={formData.product_type || ''}
                    onValueChange={(value) => handleInputChange('product_type', value)}
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
                    onValueChange={(value) => handleInputChange('product_notes', value)}
                    labelPosition="above"
                    rows={3}
                  />
                </div>

              </div>

              {/* Tags Column */}
              <div className="col-span-3">
                <div className="rounded-lg bg-gray-900/50 border border-gray-700 p-4">
                  {product && (
                    <TagSelector
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
          <div className="grid grid-cols-2 gap-4">
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
                disabled={isUpdating || isUploading}
                bgColor="bg-green-900"
                iconLeft={<FaCheck />}
                className="w-32"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card.Footer>
      </Card>
    </Modal>
  );
}; 