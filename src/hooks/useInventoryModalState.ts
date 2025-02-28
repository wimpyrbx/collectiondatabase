// src/hooks/useInventoryModalState.ts

import { useReducer, useCallback } from 'react';
import { TagWithRelationships } from '@/types/tags';

// State interface
export interface InventoryModalState {
  tags: {
    selected: TagWithRelationships[];
    processing: Record<number, boolean>;
    isPanelProcessing: boolean;
  };
  sales: {
    isConnected: boolean;
    totals: Record<number, { items: number; total: number }>;
  };
  purchase: {
    searchQuery: string;
    isSearching: boolean;
  };
  delete: {
    isConfirmOpen: boolean;
    canDelete: boolean;
  };
  form: {
    isUpdating: boolean;
    errors: string[];
  };
}

// Action types
type InventoryModalAction =
  | { type: 'SET_SELECTED_TAGS'; payload: TagWithRelationships[] }
  | { type: 'SET_TAG_PROCESSING'; payload: { tagId: number; isProcessing: boolean } }
  | { type: 'SET_TAG_PANEL_PROCESSING'; payload: boolean }
  | { type: 'SET_SALE_CONNECTION'; payload: boolean }
  | { type: 'UPDATE_SALE_TOTALS'; payload: { saleId: number; items: number; total: number } }
  | { type: 'SET_PURCHASE_SEARCH'; payload: string }
  | { type: 'SET_PURCHASE_SEARCHING'; payload: boolean }
  | { type: 'SET_DELETE_CONFIRM'; payload: boolean }
  | { type: 'SET_CAN_DELETE'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: InventoryModalState = {
  tags: {
    selected: [],
    processing: {},
    isPanelProcessing: false,
  },
  sales: {
    isConnected: false,
    totals: {},
  },
  purchase: {
    searchQuery: '',
    isSearching: false,
  },
  delete: {
    isConfirmOpen: false,
    canDelete: false,
  },
  form: {
    isUpdating: false,
    errors: [],
  },
};

// Reducer
function inventoryModalReducer(
  state: InventoryModalState,
  action: InventoryModalAction
): InventoryModalState {
  switch (action.type) {
    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        tags: {
          ...state.tags,
          selected: action.payload,
        },
      };
    case 'SET_TAG_PROCESSING':
      return {
        ...state,
        tags: {
          ...state.tags,
          processing: {
            ...state.tags.processing,
            [action.payload.tagId]: action.payload.isProcessing,
          },
        },
      };
    case 'SET_TAG_PANEL_PROCESSING':
      return {
        ...state,
        tags: {
          ...state.tags,
          isPanelProcessing: action.payload,
        },
      };
    case 'SET_SALE_CONNECTION':
      return {
        ...state,
        sales: {
          ...state.sales,
          isConnected: action.payload,
        },
      };
    case 'UPDATE_SALE_TOTALS':
      return {
        ...state,
        sales: {
          ...state.sales,
          totals: {
            ...state.sales.totals,
            [action.payload.saleId]: {
              items: action.payload.items,
              total: action.payload.total,
            },
          },
        },
      };
    case 'SET_PURCHASE_SEARCH':
      return {
        ...state,
        purchase: {
          ...state.purchase,
          searchQuery: action.payload,
        },
      };
    case 'SET_PURCHASE_SEARCHING':
      return {
        ...state,
        purchase: {
          ...state.purchase,
          isSearching: action.payload,
        },
      };
    case 'SET_DELETE_CONFIRM':
      return {
        ...state,
        delete: {
          ...state.delete,
          isConfirmOpen: action.payload,
        },
      };
    case 'SET_CAN_DELETE':
      return {
        ...state,
        delete: {
          ...state.delete,
          canDelete: action.payload,
        },
      };
    case 'SET_UPDATING':
      return {
        ...state,
        form: {
          ...state.form,
          isUpdating: action.payload,
        },
      };
    case 'SET_ERRORS':
      return {
        ...state,
        form: {
          ...state.form,
          errors: action.payload,
        },
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

export function useInventoryModalState() {
  const [state, dispatch] = useReducer(inventoryModalReducer, initialState);

  const actions = {
    setSelectedTags: useCallback((tags: TagWithRelationships[]) => {
      dispatch({ type: 'SET_SELECTED_TAGS', payload: tags });
    }, []),

    setTagProcessing: useCallback((tagId: number, isProcessing: boolean) => {
      dispatch({ type: 'SET_TAG_PROCESSING', payload: { tagId, isProcessing } });
    }, []),

    setTagPanelProcessing: useCallback((isProcessing: boolean) => {
      dispatch({ type: 'SET_TAG_PANEL_PROCESSING', payload: isProcessing });
    }, []),

    setSaleConnection: useCallback((isConnected: boolean) => {
      dispatch({ type: 'SET_SALE_CONNECTION', payload: isConnected });
    }, []),

    updateSaleTotals: useCallback((saleId: number, items: number, total: number) => {
      dispatch({ type: 'UPDATE_SALE_TOTALS', payload: { saleId, items, total } });
    }, []),

    setPurchaseSearch: useCallback((query: string) => {
      dispatch({ type: 'SET_PURCHASE_SEARCH', payload: query });
    }, []),

    setPurchaseSearching: useCallback((isSearching: boolean) => {
      dispatch({ type: 'SET_PURCHASE_SEARCHING', payload: isSearching });
    }, []),

    setDeleteConfirm: useCallback((isOpen: boolean) => {
      dispatch({ type: 'SET_DELETE_CONFIRM', payload: isOpen });
    }, []),

    setCanDelete: useCallback((canDelete: boolean) => {
      dispatch({ type: 'SET_CAN_DELETE', payload: canDelete });
    }, []),

    setUpdating: useCallback((isUpdating: boolean) => {
      dispatch({ type: 'SET_UPDATING', payload: isUpdating });
    }, []),

    setErrors: useCallback((errors: string[] | ((prev: string[]) => string[])) => {
      dispatch({ 
        type: 'SET_ERRORS', 
        payload: typeof errors === 'function' ? errors(state.form.errors) : errors 
      });
    }, [state.form.errors]),

    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []),
  };

  return { state, actions };
}

export default useInventoryModalState;