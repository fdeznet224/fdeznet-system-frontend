import { rutaEnMaps } from './mapas';

interface MapTarget {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  label?: string | null;
}

/**
 * Ruta en Google Maps hasta el domicilio, solo por coordenadas (las del GPS
 * o un enlace de ubicación pegado en la dirección). La dirección escrita y el
 * nombre del cliente no se usan: Maps los ubica en otro lugar.
 */
export function getNativeMapHref({ latitude, longitude, address }: MapTarget): string | null {
  return rutaEnMaps({ latitud: latitude, longitud: longitude, direccion: address });
}

export function openNativeMap(target: MapTarget): boolean {
  const href = getNativeMapHref(target);
  if (!href) return false;

  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}
