export interface InventoryStatusTransition {
  id: number;
  from_status: string;
  to_status: string;
  requires_sale_status: string | null;
}

export type InventoryStatusTransitionMap = {
  [fromStatus: string]: {
    [toStatus: string]: {
      requires_sale_status: string | null;
    };
  };
}; 