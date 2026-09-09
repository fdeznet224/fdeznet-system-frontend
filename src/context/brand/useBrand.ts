import { useContext } from 'react';
import { BrandContext } from './brand-context';

export const useBrand = () => useContext(BrandContext);
