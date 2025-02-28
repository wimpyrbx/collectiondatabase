import React, { useState } from 'react';
import Page from '@/components/page/Page';
import { useSalesCache } from '@/hooks/viewHooks';
import { SaleViewItem, SALE_STATUSES } from '@/types/sale';
import { FaShoppingCart, FaUser, FaCalendar, FaMoneyBillWave, FaBoxes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { Button, DisplayError } from '@/components/ui';
import { BaseStyledContainer } from '@/components/ui/BaseStyledContainer';
import { TooltipWrapper } from '@/components/tooltip/TooltipWrapper';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { notify } from '@/utils/notifications';
import clsx from 'clsx';
import { SaleModal } from '@/components/modal/SaleModal';

const Sales = () => {
  const { data, isLoading, isError, error } = useSalesCache();
  const [selectedSale, setSelectedSale] = useState<SaleViewItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateSale = () => {
    setSelectedSale(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEditSale = (sale: SaleViewItem) => {
    setSelectedSale(sale);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleDeleteSale = async (saleId: number) => {
    if (!confirm('Are you sure you want to delete this sale? This will disconnect all inventory items from this sale.')) {
      return;
    }

    try {
      // First update all inventory items to remove the sale_id
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          sale_id: null,
          inventory_status: 'For Sale' 
        })
        .eq('sale_id', saleId);

      if (inventoryError) throw inventoryError;

      // Then delete the sale items
      const { error: saleItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);

      if (saleItemsError) throw saleItemsError;

      // Finally delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (saleError) throw saleError;

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Sale deleted successfully');
    } catch (error) {
      console.error('Error deleting sale:', error);
      notify('error', 'Failed to delete sale');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Reserved':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Completed':
        return 'bg-green-500/20 text-green-400';
      case 'Cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const columns: Column<SaleViewItem>[] = [
    {
      key: 'sale_id',
      header: 'ID',
      width: '60px',
      accessor: (item) => `#${item.sale_id}`,
      align: 'left',
      sortable: true
    },
    {
      key: 'buyer_name',
      header: 'Buyer',
      icon: <FaUser className="w-4 h-4" />,
      accessor: (item) => item.buyer_name || 'N/A',
      align: 'left',
      sortable: true
    },
    {
      key: 'sale_status',
      header: 'Status',
      width: '120px',
      accessor: (item) => (
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs',
          getStatusColor(item.sale_status)
        )}>
          {item.sale_status}
        </span>
      ),
      align: 'left',
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Date',
      icon: <FaCalendar className="w-4 h-4" />,
      width: '120px',
      accessor: (item) => new Date(item.created_at).toLocaleDateString(),
      align: 'left',
      sortable: true
    },
    {
      key: 'number_of_items',
      header: 'Items',
      icon: <FaBoxes className="w-4 h-4" />,
      width: '80px',
      accessor: (item) => item.number_of_items,
      align: 'center',
      sortable: true
    },
    {
      key: 'total_sold_price',
      header: 'Total',
      icon: <FaMoneyBillWave className="w-4 h-4" />,
      width: '120px',
      accessor: (item) => item.total_sold_price ? `NOK ${item.total_sold_price.toFixed(0)},-` : 'NOK 0,-',
      align: 'right',
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      accessor: (item) => (
        item.number_of_items === 0 ? (
          <div className="flex items-center justify-end gap-2">
            <TooltipWrapper
              content="Delete Sale"
              placement="left"
              style="minimal"
             > 
            <BaseStyledContainer
              as="button"
              bgColor="bg-red-500/20"
              iconLeft={<FaTrash className="w-3 h-3" />}
              size="xs"
              elementProps={{
                onClick: () => handleDeleteSale(item.sale_id)
              }}
            />
          </TooltipWrapper>
            </div>
        ) : (
          <>
          </>
        )
      ),
      align: 'right'
    }
  ];

  const tableState = useTableState({
    initialSort: 'created_at',
    data: data || [],
    getFilterConfigs: (data) => {
      // Create Maps for faster lookups
      const statusMap = new Map<string, number>();
      
      // Single pass through data to count all values
      data.forEach(item => {
        if (item.sale_status) {
          statusMap.set(item.sale_status, (statusMap.get(item.sale_status) || 0) + 1);
        }
      });
      
      return [
        {
          key: 'sale_status',
          label: 'Status',
          options: Array.from(statusMap.entries()).map(([value, count]) => ({
            value,
            label: value,
            count
          }))
        }
      ];
    }
  });

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    
    return data.filter(item => {
      // Apply filters
      const filtersPassed = Object.entries(tableState.selectedFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        
        // For other filters, use the existing logic
        const itemValue = item[key as keyof SaleViewItem];
        return values.includes(String(itemValue));
      });

      // Apply search
      const searchPassed = !tableState.searchTerm || 
        (item.buyer_name && item.buyer_name.toLowerCase().includes(tableState.searchTerm.toLowerCase())) ||
        String(item.sale_id).includes(tableState.searchTerm);

      return filtersPassed && searchPassed;
    });
  }, [data, tableState.selectedFilters, tableState.searchTerm]);

  return (
    <Page
      title="Sales"
      icon={<FaShoppingCart />}
      bgColor="bg-green-900"
      iconColor="text-green-500"
      subtitle="Manage your sales"
    >
      <Card className="w-full">
        <Card.Header
          title="Sales"
          icon={<FaShoppingCart />}
          iconColor="text-green-500"
          collapsible={true}
          rightContent={
            <Button
              bgColor="bg-green-800"
              iconColor="text-green-600"
              textColor="text-white"
              iconLeft={<FaPlus className="w-4 h-4" />}
              onClick={handleCreateSale}
            >
              New Sale
            </Button>
          }
        />
        <Card.Body>
          {isError && <DisplayError errors={[error?.message || 'An error occurred']} />}
          
          <BaseFilterableTable<SaleViewItem>
            columns={columns}
            data={filteredData}
            keyExtractor={(item) => item.sale_id.toString()}
            isLoading={isLoading}
            error={error}
            filters={tableState.filters}
            selectedFilters={tableState.selectedFilters}
            onFilterChange={tableState.onFilterChange}
            searchTerm={tableState.searchTerm}
            onSearchChange={tableState.onSearchChange}
            sortBy={tableState.sortBy}
            sortDirection={tableState.sortDirection}
            onSort={tableState.onSort}
            pagination={tableState.pagination}
            onRowClick={handleEditSale}
            fixedHeight="h-[36px]"
            navigationLocation="top"
            updateAgeColumn="updated_at"
          />
        </Card.Body>
      </Card>

      {/* TODO: Add SaleModal component here */}
      {isModalOpen && (
        <SaleModal
          sale={selectedSale}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={isCreating ? 'create' : 'edit'}
          onSuccess={(saleId) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setIsModalOpen(false);
          }}
        />
      )}
    </Page>
  );
};

export default Sales; 