export interface BrandConfig {
  empresa_nombre: string;
  sistema_nombre: string;
  logo_url: string | null;
  favicon_url: string | null;
  color_primario: string;
  color_secundario: string;
  empresa_telefono: string | null;
  empresa_email: string | null;
  empresa_direccion: string | null;
  pie_recibo: string | null;
}

export const DEFAULT_BRAND: BrandConfig = {
  empresa_nombre: 'FdezNet',
  sistema_nombre: 'FdezPay',
  logo_url: null,
  favicon_url: null,
  color_primario: '#2563eb',
  color_secundario: '#4f46e5',
  empresa_telefono: null,
  empresa_email: null,
  empresa_direccion: null,
  pie_recibo: null,
};
