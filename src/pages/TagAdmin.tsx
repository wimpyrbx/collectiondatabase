import React from 'react';
import Page from '@/components/page/Page';
import { Card } from '@/components/card';
import { FaTags, FaPlus } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Button } from '@/components/ui';
import { TagWithRelationships, TagDisplayType } from '@/types/tags';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ProductTagService, InventoryTagService } from '@/services/TagService';
import * as Icons from 'react-icons/fa';
import { TagModal } from '@/components/modal/TagModal';
import { useProductGroups, useProductTypes } from '@/hooks/viewHooks';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TagDisplay } from '@/components/tag/TagDisplay';

interface TooltipCellProps {
  values?: string[] | null;
  text?: string;
  maxLength?: number;
}

const TooltipCell: React.FC<TooltipCellProps> = ({ values, text, maxLength = 25 }) => {
  const elementRef = React.useRef<HTMLSpanElement>(null);
  const [isTooltipVisible, setIsTooltipVisible] = React.useState(false);

  // Handle array input
  if (values !== undefined) {
    if (!values?.length) return <>All</>;
    if (values.length === 1) return <>{values[0]}</>;
    
    return (
      <span 
        ref={elementRef} 
        className="cursor-help"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        [Multiple]
        <Tooltip
          text={values.join(', ')}
          placement="top"
          style="minimal"
          size="xs"
          elementRef={elementRef}
          isOpen={isTooltipVisible}
        />
      </span>
    );
  }

  // Handle string input
  if (!text) return null;
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.substring(0, maxLength)}...` : text;

  if (!shouldTruncate) return <>{displayText}</>;

  return (
    <span 
      ref={elementRef} 
      className="cursor-help"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      {displayText}
      <Tooltip
        text={text}
        placement="top"
        style="minimal"
        size="xs"
        elementRef={elementRef}
        isOpen={isTooltipVisible}
      />
    </span>
  );
};

const TagAdmin = () => {
  const queryClient = useQueryClient();
  const productTagService = new ProductTagService(supabase, queryClient);
  const inventoryTagService = new InventoryTagService(supabase, queryClient);
  const [selectedTag, setSelectedTag] = React.useState<TagWithRelationships | undefined>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit'>('create');
  const [modalType, setModalType] = React.useState<'product' | 'inventory'>('product');
  
  const { data: productGroups = [] } = useProductGroups();
  const { data: productTypes = [] } = useProductTypes();

  const { data: productTags = [], isLoading: isLoadingProductTags } = useQuery({
    queryKey: ['product_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('view_product_tags').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: inventoryTags = [], isLoading: isLoadingInventoryTags } = useQuery({
    queryKey: ['inventory_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('view_inventory_tags').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const handleDelete = async (id: number, type: 'product' | 'inventory') => {
    const service = type === 'product' ? productTagService : inventoryTagService;
    const { canDelete, reason } = await service.canDelete(id);
    
    if (!canDelete) {
      alert(reason);
      return;
    }

    if (confirm('Are you sure you want to delete this tag?')) {
      await service.delete(id);
    }
  };

  const handleEdit = (tag: TagWithRelationships, type: 'product' | 'inventory') => {
    setSelectedTag(tag);
    setModalMode('edit');
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCreate = (type: 'product' | 'inventory') => {
    setSelectedTag(undefined);
    setModalMode('create');
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleSuccess = (tagId: number) => {
    setIsModalOpen(false);
    setSelectedTag(undefined);
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['product_tags'] });
    queryClient.invalidateQueries({ queryKey: ['inventory_tags'] });
  };

  const columns: Column<TagWithRelationships>[] = [
    {
      key: 'name',
      header: 'Name',
      accessor: (item) => item.name,
      width: '200px'
    },
    {
      key: 'display',
      header: 'Display',
      width: '100px',
      accessor: (item) => {
        return <TagDisplay key={item.id} tag={item} />;
      }
    },
    {
      key: 'product_groups',
      header: 'Groups',
      width: '200px',
      accessor: (item) => <TooltipCell values={item.product_groups} />
    },
    {
      key: 'product_types',
      header: 'Types',
      width: '200px',
      accessor: (item) => <TooltipCell values={item.product_types} />
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (item) => <TooltipCell text={item.description || ''} maxLength={20} />
    },
    {
      key: 'relationships_count',
      header: 'In Use',
      width: '80px',
      align: 'center',
      accessor: (item) => item.relationships_count.toString()
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      accessor: (item) => {
        const type = modalType;
        const isDisabled = item.relationships_count > 0;
        return (
          <div className="flex justify-end">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id, type);
              }}
              disabled={isDisabled}
              title={isDisabled ? 'Cannot delete tag that is in use' : 'Delete tag'}
              bgColor={isDisabled ? 'bg-gray-800/50' : 'bg-red-900/50'}
              textColor={isDisabled ? 'text-gray-500' : 'text-red-400'}
              className="w-8 h-8 !p-0"
            >
              🗑️
            </Button>
          </div>
        );
      }
    }
  ];

  const getFilterConfigs = React.useCallback((data: TagWithRelationships[]) => {
    if (!data?.length) return [];
    
    const uniqueTypes = Array.from(new Set(data.map(item => item.display_type)));
    
    return [
      {
        key: 'display_type',
        label: 'Display Type',
        options: uniqueTypes.map(type => ({
          value: type,
          label: type,
          count: data.filter(item => item.display_type === type).length
        }))
      }
    ];
  }, []);

  const productTableState = useTableState({
    initialSort: 'name',
    data: productTags || [],
    getFilterConfigs
  });

  const inventoryTableState = useTableState({
    initialSort: 'name',
    data: inventoryTags || [],
    getFilterConfigs
  });

  return (
    <Page
      title="Tag Administration"
      icon={<FaTags />}
      bgColor="bg-gray-800"
      iconColor="text-purple-500"
    >
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <Card.Header
            title="Product Tags"
            icon={<FaTags />}
            iconColor="text-purple-500"
            bgColor="bg-purple-500/50"
            rightContent={
              <Button
                onClick={() => handleCreate('product')}
                bgColor="bg-purple-900/50"
                className="flex items-center gap-2"
              >
                <FaPlus />
                New Tag
              </Button>
            }
          />
          <Card.Body>
            <BaseFilterableTable
              {...productTableState}
              columns={columns}
              data={productTags}
              keyExtractor={(item) => item.id.toString()}
              isLoading={isLoadingProductTags}
              onRowClick={(item) => handleEdit(item, 'product')}
            />
          </Card.Body>
        </Card>

        <Card>
          <Card.Header
            title="Inventory Tags"
            icon={<FaTags />}
            iconColor="text-indigo-500"
            bgColor="bg-indigo-500/50"
            rightContent={
              <Button
                onClick={() => handleCreate('inventory')}
                bgColor="bg-indigo-900/50"
                className="flex items-center gap-2"
              >
                <FaPlus />
                New Tag
              </Button>
            }
          />
          <Card.Body>
            <BaseFilterableTable
              {...inventoryTableState}
              columns={columns}
              data={inventoryTags}
              keyExtractor={(item) => item.id.toString()}
              isLoading={isLoadingInventoryTags}
              onRowClick={(item) => handleEdit(item, 'inventory')}
            />
          </Card.Body>
        </Card>
      </div>

      <TagModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        tag={selectedTag}
        mode={modalMode}
        type={modalType}
        productGroups={productGroups}
        productTypes={productTypes}
      />
    </Page>
  );
};

export default TagAdmin; 