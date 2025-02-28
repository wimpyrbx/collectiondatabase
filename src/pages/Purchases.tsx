import React, { useState } from 'react';
import Page from '@/components/page/Page';
import { usePurchasesCache } from '@/hooks/viewHooks';
import { PurchaseViewItem } from '@/types/purchase';
import { FaShoppingBag, FaUser, FaCalendar, FaMoneyBillWave, FaBoxes, FaPlus, FaEdit, FaTrash, FaGlobe } from 'react-icons/fa';
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
import { PurchaseModal } from '@/components/modal/PurchaseModal';

const Purchases = () => {
  const { data, isLoading, isError, error } = usePurchasesCache();
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseViewItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreatePurchase = () => {
    setSelectedPurchase(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEditPurchase = (purchase: PurchaseViewItem) => {
    setSelectedPurchase(purchase);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleDeletePurchase = async (purchaseId: number) => {
    if (!confirm('Are you sure you want to delete this purchase? This will disconnect all inventory items from this purchase.')) {
      return;
    }

    try {
      // First update all inventory items to remove the purchase_id
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ purchase_id: null })
        .eq('purchase_id', purchaseId);

      if (inventoryError) throw inventoryError;

      // Then delete the purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (purchaseError) throw purchaseError;

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Purchase deleted successfully');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      notify('error', 'Failed to delete purchase');
    }
  };

  const columns: Column<PurchaseViewItem>[] = [
    {
      key: 'purchase_id',
      header: 'ID',
      width: '60px',
      accessor: (item) => `#${item.purchase_id}`,
      align: 'left',
      sortable: true
    },
    {
      key: 'seller_name',
      header: 'Seller',
      icon: <FaUser className="w-4 h-4" />,
      accessor: (item) => item.seller_name || 'N/A',
      align: 'left',
      sortable: true
    },
    {
      key: 'origin',
      header: 'Origin',
      icon: <FaGlobe className="w-4 h-4" />,
      accessor: (item) => item.origin || 'N/A',
      align: 'left',
      sortable: true
    },
    {
      key: 'purchase_date',
      header: 'Date',
      icon: <FaCalendar className="w-4 h-4" />,
      width: '120px',
      accessor: (item) => item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A',
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
      key: 'total_cost',
      header: 'Total Cost',
      icon: <FaMoneyBillWave className="w-4 h-4" />,
      width: '120px',
      accessor: (item) => item.total_cost ? `NOK ${item.total_cost.toFixed(0)},-` : 'NOK 0,-',
      align: 'right',
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-2">
          <TooltipWrapper
            content="Edit Purchase"
            placement="top"
            style="minimal"
          >
            <BaseStyledContainer
              as="button"
              bgColor="bg-indigo-500/20"
              iconLeft={<FaEdit className="w-3 h-3" />}
              size="xs"
              elementProps={{
                onClick: () => handleEditPurchase(item)
              }}
            />
          </TooltipWrapper>
          
          <TooltipWrapper
            content="Delete Purchase"
            placement="top"
            style="minimal"
          >
            <BaseStyledContainer
              as="button"
              bgColor="bg-red-500/20"
              iconLeft={<FaTrash className="w-3 h-3" />}
              size="xs"
              elementProps={{
                onClick: () => handleDeletePurchase(item.purchase_id)
              }}
            />
          </TooltipWrapper>
        </div>
      ),
      align: 'right'
    }
  ];

  const tableState = useTableState({
    initialSort: 'purchase_date',
    data: data || [],
    getFilterConfigs: (data) => {
      // Create Maps for faster lookups
      const originMap = new Map<string, number>();
      const sellerMap = new Map<string, number>();
      
      // Single pass through data to count all values
      data.forEach(item => {
        if (item.origin) {
          originMap.set(item.origin, (originMap.get(item.origin) || 0) + 1);
        }
        if (item.seller_name) {
          sellerMap.set(item.seller_name, (sellerMap.get(item.seller_name) || 0) + 1);
        }
      });
      
      return [
        {
          key: 'origin',
          label: 'Origin',
          options: Array.from(originMap.entries()).map(([value, count]) => ({
            value,
            label: value,
            count
          }))
        },
        {
          key: 'seller_name',
          label: 'Seller',
          options: Array.from(sellerMap.entries()).map(([value, count]) => ({
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
        const itemValue = item[key as keyof PurchaseViewItem];
        return values.includes(String(itemValue));
      });

      // Apply search
      const searchPassed = !tableState.searchTerm || 
        (item.seller_name && item.seller_name.toLowerCase().includes(tableState.searchTerm.toLowerCase())) ||
        (item.origin && item.origin.toLowerCase().includes(tableState.searchTerm.toLowerCase())) ||
        String(item.purchase_id).includes(tableState.searchTerm);

      return filtersPassed && searchPassed;
    });
  }, [data, tableState.selectedFilters, tableState.searchTerm]);

  return (
    <Page
      title="Purchases"
      icon={<FaShoppingBag />}
      bgColor="bg-indigo-900"
      iconColor="text-indigo-500"
      subtitle="Manage your purchases"
    >
      <Card className="w-full">
        <Card.Header
          title="Purchases"
          icon={<FaShoppingBag />}
          iconColor="text-indigo-500"
          collapsible={true}
          rightContent={
            <Button
              bgColor="bg-indigo-600"
              iconLeft={<FaPlus className="w-4 h-4" />}
              onClick={handleCreatePurchase}
            >
              New Purchase
            </Button>
          }
        />
        <Card.Body>
          {isError && <DisplayError errors={[error?.message || 'An error occurred']} />}
          
          <BaseFilterableTable<PurchaseViewItem>
            columns={columns}
            data={filteredData}
            keyExtractor={(item) => item.purchase_id.toString()}
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
            onRowClick={handleEditPurchase}
            fixedHeight="h-[36px]"
            navigationLocation="top"
            updateAgeColumn="updated_at"
          />
        </Card.Body>
      </Card>

      {/* TODO: Add PurchaseModal component here */}
      {isModalOpen && (
        <PurchaseModal
          purchase={selectedPurchase}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode={isCreating ? 'create' : 'edit'}
          onSuccess={(purchaseId) => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setIsModalOpen(false);
          }}
        />
      )}
    </Page>
  );
};

export default Purchases; 