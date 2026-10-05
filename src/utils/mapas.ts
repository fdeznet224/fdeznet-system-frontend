const RE_COORDENADAS = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;

interface Destino {
    latitud?: number | string | null;
    longitud?: number | string | null;
    direccion?: string | null;
}

/**
 * Enlace de Google Maps con la ruta desde donde está el técnico hasta el
 * domicilio: por GPS, por la ubicación que mandó el cliente (va en la
 * dirección como enlace) o, si no hay, por la dirección escrita.
 */
export function rutaEnMaps({ latitud, longitud, direccion }: Destino): string | null {
    const lat = Number(latitud);
    const lng = Number(longitud);
    let destino = '';
    if (latitud != null && longitud != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
        destino = `${lat},${lng}`;
    } else {
        const coordenadas = (direccion || '').match(RE_COORDENADAS);
        if (coordenadas) destino = `${coordenadas[1]},${coordenadas[2]}`;
        else {
            const texto = (direccion || '').replace(/https?:\/\/\S+/g, '').replace(/\s*·\s*$/, '').trim();
            if (texto.length >= 5) destino = texto;
        }
    }
    if (!destino) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
}
