interface MapTarget {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  label?: string | null;
}

function coordinate(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getNativeMapHref({
  latitude,
  longitude,
  address,
  label,
}: MapTarget): string | null {
  const lat = coordinate(latitude);
  const lng = coordinate(longitude);
  const hasCoordinates = lat !== null && lng !== null;
  const textQuery = address?.trim() || label?.trim() || '';

  if (!hasCoordinates && !textQuery) return null;

  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const coordinates = hasCoordinates ? `${lat},${lng}` : '';
  const pinLabel = label?.trim() || address?.trim() || 'Cliente';

  if (isAppleMobile) {
    if (hasCoordinates) {
      return `maps://?q=${encodeURIComponent(pinLabel)}&ll=${encodeURIComponent(coordinates)}`;
    }
    return `maps://?q=${encodeURIComponent(textQuery)}`;
  }

  if (isAndroid) {
    if (hasCoordinates) {
      return `geo:${coordinates}?q=${encodeURIComponent(`${coordinates}(${pinLabel})`)}`;
    }
    return `geo:0,0?q=${encodeURIComponent(textQuery)}`;
  }

  const query = hasCoordinates ? coordinates : textQuery;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function openNativeMap(target: MapTarget): boolean {
  const href = getNativeMapHref(target);
  if (!href) return false;

  if (href.startsWith('https://')) {
    window.open(href, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = href;
  }
  return true;
}
