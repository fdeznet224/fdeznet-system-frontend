import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import client from '@/api/axios';
import { DEFAULT_BRAND, type BrandConfig } from './brand';
import { BrandContext } from './brand-context';

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const refreshBrand = useCallback(async () => {
    try {
      const { data } = await client.get<BrandConfig>('/public/marca');
      setBrand({ ...DEFAULT_BRAND, ...data });
    } catch { setBrand(DEFAULT_BRAND); }
  }, []);
  useEffect(() => {
    let active = true;
    client.get<BrandConfig>('/public/marca')
      .then(({ data }) => { if (active) setBrand({ ...DEFAULT_BRAND, ...data }); })
      .catch(() => { if (active) setBrand(DEFAULT_BRAND); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    document.title = brand.sistema_nombre;
    document.documentElement.style.setProperty('--brand-primary', brand.color_primario);
    document.documentElement.style.setProperty('--brand-secondary', brand.color_secundario);
    let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) { manifest = document.createElement('link'); manifest.rel = 'manifest'; document.head.appendChild(manifest); }
    manifest.href = `/api/public/manifest.webmanifest?v=${encodeURIComponent(brand.color_primario)}`;
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) { theme = document.createElement('meta'); theme.name = 'theme-color'; document.head.appendChild(theme); }
    theme.content = brand.color_primario;
    if (brand.favicon_url) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
      favicon.href = brand.favicon_url;
    }
  }, [brand]);
  const value = useMemo(() => ({ brand, refreshBrand }), [brand, refreshBrand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
