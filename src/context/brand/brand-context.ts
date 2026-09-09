import { createContext } from 'react';
import { DEFAULT_BRAND, type BrandConfig } from './brand';

export interface BrandContextValue {
  brand: BrandConfig;
  refreshBrand: () => Promise<void>;
}

export const BrandContext = createContext<BrandContextValue>({
  brand: DEFAULT_BRAND,
  refreshBrand: async () => undefined,
});
