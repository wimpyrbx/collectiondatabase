import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { ProductViewItem } from '@/types/product';
import { useProductsTable } from '@/hooks/useProductsTable';
import RegionRatingSelector, { type RegionRatingValue } from '@/components/product/RegionRatingSelector';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import productGroupsData from '@/data/product_groups.json';
import { FormElement } from '@/components/formelement/FormElement';
import { FormElementLabel } from '@/components/formelement/FormElementLabel';
import { type SelectionValue, type TextValue } from '@/components/formelement/FormElement';
import { Button } from '@/components/ui/';
import DisplayError from '@/components/ui/DisplayError';
import { FaBox, FaTag, FaBoxes, FaCalendar, FaStickyNote, FaLayerGroup, FaCubes, FaTimes, FaCheck, FaExclamationTriangle, FaDollarSign, FaUpload, FaChevronLeft, FaChevronRight, FaTrash, FaSave, FaGlobe, FaTags } from 'react-icons/fa';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { useProductModal } from '@/hooks/useProductModal';
import { ImageContainerProduct } from '@/components/image/ImageContainerProduct';
import { Dialog } from '@headlessui/react';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import { deleteImage } from '@/utils/imageUtils';
import clsx from 'clsx';
import { FiClock } from 'react-icons/fi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TagWithRelationships } from '@/types/tags';
import Pill from '@/components/ui/Pill';
import * as Icons from 'react-icons/fa';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TooltipStyle } from '@/utils/tooltip';

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

// Add this new component before the ProductModal component
const TagButton: React.FC<{
  tag: TagWithRelationships;
  isSelected: boolean;
  onToggle: (tag: TagWithRelationships) => void;
}> = ({ tag, isSelected, onToggle }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { color = 'gray' } = tag;

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle(tag)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          isSelected ? ["bg-green-500/20", "text-green-300"] : ["bg-gray-800 hover:bg-gray-700", "text-gray-300"]
        )}
      >
        {tag.display_type === 'icon' && tag.display_value ? (
          React.createElement((Icons as any)[tag.display_value], {
            className: clsx("w-3 h-3", "text-white", "mr-1")
          })
        ) : tag.display_type === 'image' && tag.display_value ? (
          <img
            src={tag.display_value}
            alt={tag.name}
            className="w-4 h-4"
          />
        ) : null}
        <span className="text-sm">{tag.name}</span>
        {isSelected && (
          <FaCheck className="w-3 h-3" />
        )}
      </button>
      <Tooltip
        text={`Click to ${isSelected ? 'remove' : 'add'} ${tag.name} tag`}
        isOpen={isHovered}
        elementRef={buttonRef}
        placement="top"
        size="sm"
        style={TooltipStyle.minimal}
      />
    </div>
  );
};

// First, add this new component near the top of the file, after the imports
const ProductTitleSuggestions: React.FC<{
  suggestions: string[];
  onSelect: (title: string) => void;
  visible: boolean;
}> = ({ suggestions, onSelect, visible }) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-gray-800 border border-gray-700 shadow-lg">
      <ul className="py-1">
        {suggestions.map((title, index) => (
          <li
            key={index}
            className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer"
            onClick={() => onSelect(title)}
          >
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
};

const VariantSuggestions: React.FC<{
  suggestions: string[];
  onSelect: (variant: string) => void;
  visible: boolean;
}> = ({ suggestions, onSelect, visible }) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-gray-800 border border-gray-700 shadow-lg">
      <ul className="py-1">
        {suggestions.map((variant, index) => (
          <li
            key={index}
            className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer"
            onClick={() => onSelect(variant)}
          >
            {variant}
          </li>
        ))}
      </ul>
    </div>
  );
};

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
  
  // Update the tag state management
  const [selectedTags, setSelectedTags] = useState<TagWithRelationships[]>([]);
  
  // Query to fetch available product tags
  const queryClient = useQueryClient();
  const { data: availableTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['product_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('view_product_tags').select('*');
      if (error) throw error;
      return data as TagWithRelationships[] || [];
    }
  });

  // Add this new state and query
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [variantSuggestions, setVariantSuggestions] = useState<string[]>([]);
  const [showVariantSuggestions, setShowVariantSuggestions] = useState(false);

  // Use the cached products data instead of separate queries
  const productsQuery = useQuery<ProductViewItem[]>({
    queryKey: ['products'],
    enabled: isOpen // Only fetch when modal is open
  });
  const cachedProducts = productsQuery.data || [];

  // Compute unique titles and variants from cached data
  const productTitles: string[] = React.useMemo(() => {
    return Array.from(new Set(cachedProducts
      .map((p: ProductViewItem) => p.product_title)
      .filter((title: string | null): title is string => 
        Boolean(title && title.trim() !== ''))))
      .sort();
  }, [cachedProducts]);

  const productVariants: string[] = React.useMemo(() => {
    return Array.from(new Set(cachedProducts
      .map((p: ProductViewItem) => p.product_variant)
      .filter((variant: string | null): variant is string => 
        Boolean(variant && variant.trim() !== ''))))
      .sort();
  }, [cachedProducts]);

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
        rating: product.rating_name || '',
        tags: product.tags?.map(t => t.id) || []
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
        rating: '',
        tags: []
      });
      setHasFormChanges(true); // Always enable save for new products
    }
  }, [isOpen, product, mode]);

  // Track form changes including tags
  useEffect(() => {
    if (mode === 'create') return; // Don't track changes for new products
    
    if (initialFormState && formData) {
      const compareValues = (initial: any, current: any) => {
        const normalizedInitial = initial === null || initial === undefined ? '' : initial.toString();
        const normalizedCurrent = current === null || current === undefined ? '' : current.toString();
        return normalizedInitial !== normalizedCurrent;
      };

      const hasChanges = Object.keys(initialFormState).some(key => {
        const initial = initialFormState[key];
        let current = '';

        // Handle special cases for region, rating, and tags
        if (key === 'region') {
          current = regionRating.region || '';
          return compareValues(initial, current);
        } 
        if (key === 'rating') {
          current = regionRating.rating || '';
          return compareValues(initial, current);
        } 
        if (key === 'tags') {
          const initialTags = product?.tags?.map(t => t.id).sort() || [];
          const currentTags = selectedTags.map(t => t.id).sort();
          return JSON.stringify(initialTags) !== JSON.stringify(currentTags);
        }
        
        current = formData[key as keyof typeof formData]?.toString() || '';
        return compareValues(initial, current);
      });
      
      if (hasFormChanges !== hasChanges) {
        setHasFormChanges(hasChanges);
      }
    }
  }, [formData, initialFormState, mode, regionRating.region, regionRating.rating, selectedTags, product?.tags, hasFormChanges]);

  // Initialize selected tags when product changes
  useEffect(() => {
    if (product?.tags) {
      const productTags = availableTags.filter(tag => 
        product.tags.some(t => t.id === tag.id)
      );
      setSelectedTags(productTags);
    } else {
      setSelectedTags([]);
    }
  }, [product, availableTags]);

  // Handle tag selection
  const handleTagToggle = async (tag: TagWithRelationships) => {
    if (!product) {
      // For new products, just update the local state
      setSelectedTags(prev => {
        const isSelected = prev.some(t => t.id === tag.id);
        return isSelected
          ? prev.filter(t => t.id !== tag.id)
          : [...prev, tag];
      });
      return;
    }

    try {
      const isSelected = selectedTags.some(t => t.id === tag.id);
      
      if (isSelected) {
        // Remove tag relationship
        const { error } = await supabase
          .from('product_tag_relationships')
          .delete()
          .match({ 
            product_id: product.product_id, 
            tag_id: tag.id 
          });
        
        if (error) throw error;
      } else {
        // Add tag relationship
        const { error } = await supabase
          .from('product_tag_relationships')
          .insert({ 
            product_id: product.product_id, 
            tag_id: tag.id 
          });
        
        if (error) throw error;
      }

      // Update local state
      setSelectedTags(prev => {
        return isSelected
          ? prev.filter(t => t.id !== tag.id)
          : [...prev, tag];
      });

      // Update cache
      queryClient.setQueryData<ProductViewItem[]>(['products'], old => {
        if (!old) return old;
        return old.map(p => {
          if (p.product_id === product.product_id) {
            return {
              ...p,
              tags: isSelected
                ? p.tags.filter(t => t.id !== tag.id)
                : [...p.tags, tag]
            };
          }
          return p;
        });
      });

    } catch (error) {
      console.error('Error toggling tag:', error);
      setErrors(prev => [...prev, 'Failed to update tag']);
    }
  };

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

  // Update wrappedHandleSubmit to remove tag handling since it's now handled in handleTagToggle
  const wrappedHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasFormChanges) {
      return;
    }

    try {
      // Submit the form without handling tags
      await handleSubmit(e);
    } catch (error: any) {
      setErrors(prev => [...prev, error.message]);
    }
  };

  // Add this function to handle title suggestions
  const handleTitleSearch = (value: SelectionValue) => {
    const textValue = Array.isArray(value) ? value[0] : value;
    handleInputChange('product_title', String(textValue));
    
    if (typeof textValue !== 'string' || textValue.length < 2) {
      setTitleSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = productTitles.filter(title =>
      title.toLowerCase().includes(textValue.toLowerCase())
    ).slice(0, 5);

    setTitleSuggestions(matches);
    setShowSuggestions(true);
  };

  const handleVariantSearch = (value: SelectionValue) => {
    const textValue = Array.isArray(value) ? value[0] : value;
    handleInputChange('product_variant', String(textValue));
    
    if (typeof textValue !== 'string' || textValue.length < 2) {
      setVariantSuggestions([]);
      setShowVariantSuggestions(false);
      return;
    }

    const matches = productVariants.filter(variant =>
      variant.toLowerCase().includes(textValue.toLowerCase())
    ).slice(0, 5);

    setVariantSuggestions(matches);
    setShowVariantSuggestions(true);
  };

  const handleTitleSelect = (title: string) => {
    handleInputChange('product_title', title);
    setShowSuggestions(false);
  };

  const handleVariantSelect = (variant: string) => {
    handleInputChange('product_variant', variant);
    setShowVariantSuggestions(false);
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
              <div className="shrink-0 ml-4 whitespace-nowrap flex items-center gap-4">
                {product?.products_updated_secondsago !== undefined && 
                 product.products_updated_secondsago <= 3600 && (
                  <span className="text-cyan-300 text-sm flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    Recently Updated
                  </span>
                )}
                {product ? `ID: ${product.product_id}` : undefined}
              </div>
            }
          />
          <Card.Body>
            <div className="min-h-[350px] max-h-[600px] overflow-y-auto px-2">
              <form id="product-form" onSubmit={wrappedHandleSubmit} className="space-y-6">
                <div className="grid grid-cols-[255px_1fr] gap-6">
                  {/* Image Column - 255px */}
                  <div className="col-span-1">
                    <ImageContainerProduct
                      id={product?.product_id || -1}
                      title={product?.product_title || 'New Product'}
                      onError={(message) => setErrors(prev => [...prev, message])}
                      className="w-full"
                      pendingImage={pendingImage}
                      onPendingImageChange={handlePendingImageChange}
                      isCreateMode={mode === 'create'}
                    />
                  </div>

                  {/* Form Column */}
                  <div className="col-span-1 space-y-4">
                    {/* Title, Variant, and Year Row */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <div className="relative" 
                          onBlur={() => {
                            setTimeout(() => setShowSuggestions(false), 200);
                          }}
                          onFocus={() => {
                            if (formData.product_title?.length >= 2) {
                              setShowSuggestions(true);
                            }
                          }}
                        >
                          <FormElement
                            key={`title-${isOpen}-${product?.product_id ?? 'new'}`}
                            elementType="input"
                            label="Title"
                            labelIcon={<FaTag />}
                            labelIconColor="text-blue-400"
                            initialValue={formData.product_title || ''}
                            onValueChange={handleTitleSearch}
                            labelPosition="above"
                          />
                          <ProductTitleSuggestions
                            suggestions={titleSuggestions}
                            onSelect={handleTitleSelect}
                            visible={showSuggestions}
                          />
                        </div>
                      </div>
                      <div className="col-span-4">
                        <div className="relative" 
                          onBlur={() => {
                            setTimeout(() => setShowVariantSuggestions(false), 200);
                          }}
                          onFocus={() => {
                            if (formData.product_variant?.length >= 2) {
                              setShowVariantSuggestions(true);
                            }
                          }}
                        >
                          <FormElement
                            key={`variant-${isOpen}-${product?.product_id ?? 'new'}`}
                            elementType="input"
                            label="Variant"
                            labelIcon={<FaBoxes />}
                            labelIconColor="text-purple-400"
                            initialValue={formData.product_variant || ''}
                            onValueChange={handleVariantSearch}
                            labelPosition="above"
                          />
                          <VariantSuggestions
                            suggestions={variantSuggestions}
                            onSelect={handleVariantSelect}
                            visible={showVariantSuggestions}
                          />
                        </div>
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

                    {/* Pricing Section */}
                    <div className="flex items-center gap-4">
                      {/* PriceCharting Logo */}
                      <img 
                        src="/images/logos/pricecharting.webp" 
                        alt="PriceCharting" 
                        className="h-8 opacity-75"
                      />

                      {/* Pricing Box */}
                      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 flex-1">
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-4">
                            <div className="flex items-center gap-2">
                              <FormElement
                                key={`pricecharting-${isOpen}-${product?.product_id ?? 'new'}`}
                                elementType="input"
                                label="PriceCharting"
                                labelIcon={<FaDollarSign />}
                                labelIconColor="text-green-400"
                                initialValue={formData.pricecharting_id || ''}
                                onValueChange={(value) => handleInputChange('pricecharting_id', String(value) || null)}
                                labelPosition="left"
                                className="whitespace-nowrap flex-1"
                              />
                              {formData.pricecharting_id && (
                                <a
                                  href={`https://www.pricecharting.com/game/${formData.pricecharting_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors mt-[2px]"
                                  title="Open in PriceCharting"
                                >
                                  <FaGlobe className="text-blue-400" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="col-span-4">
                            <FormElement
                              key={`price-usd-${isOpen}-${product?.product_id ?? 'new'}`}
                              elementType="input"
                              label="Price CIB"
                              labelIcon={<FaDollarSign />}
                              labelIconColor="text-green-400"
                              initialValue={formData.price_usd?.toFixed(2) || ''}
                              onValueChange={(value) => {
                                const numValue = value ? Number(value) : null;
                                handleInputChange('price_usd', numValue !== null && !isNaN(numValue) ? numValue : null);
                              }}
                              labelPosition="left"
                              placeholder="0.00"
                              className="whitespace-nowrap"
                            />
                          </div>
                          <div className="col-span-4">
                            <FormElement
                              key={`price-new-usd-${isOpen}-${product?.product_id ?? 'new'}`}
                              elementType="input"
                              label="Price New"
                              labelIcon={<FaDollarSign />}
                              labelIconColor="text-green-400"
                              initialValue={formData.price_new_usd?.toFixed(2) || ''}
                              onValueChange={(value) => {
                                const numValue = value ? Number(value) : null;
                                handleInputChange('price_new_usd', numValue !== null && !isNaN(numValue) ? numValue : null);
                              }}
                              labelPosition="left"
                              placeholder="0.00"
                              className="whitespace-nowrap"
                            />
                          </div>
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

                    {/* Tags Section */}
                    <div className="col-span-12">
                      <FormElementLabel
                        label="Product Tags"
                        labelIcon={<FaTags />}
                        labelIconColor="text-purple-400"
                      />
                      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 mt-1">
                        <div className="flex flex-wrap gap-2">
                          {isLoadingTags ? (
                            <div className="text-gray-400 text-sm">Loading tags...</div>
                          ) : availableTags.length === 0 ? (
                            <div className="text-gray-400 text-sm">No tags available</div>
                          ) : (
                            availableTags.map(tag => (
                              <TagButton
                                key={tag.id}
                                tag={tag}
                                isSelected={selectedTags.some(t => t.id === tag.id)}
                                onToggle={handleTagToggle}
                              />
                            ))
                          )}
                        </div>
                      </div>
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