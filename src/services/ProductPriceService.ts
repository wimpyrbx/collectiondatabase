import type { ProductPrice, PriceType } from '@/types/product';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

export class ProductPriceService {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly queryClient: QueryClient,
    private readonly tableName: string = 'product_prices'
  ) {}

  async getProductPrices(productId: number): Promise<{ data: Record<PriceType, ProductPrice> | null; errors: string[] }> {
    try {
      const { data: prices, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;

      if (!prices || prices.length === 0) {
        return { data: null, errors: [] };
      }

      const priceMap = prices.reduce((acc, price) => {
        acc[price.price_type as PriceType] = price;
        return acc;
      }, {} as Record<PriceType, ProductPrice>);

      return { data: priceMap, errors: [] };
    } catch (error) {
      console.error('Error fetching product prices:', error);
      return { data: null, errors: [(error as Error).message] };
    }
  }
} 