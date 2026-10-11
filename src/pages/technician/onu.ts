/** "AA:BB:CC..." y "aabbcc..." son la misma ONU. */
export const normalizarSerie = (valor: string) => valor.toUpperCase().replace(/[^0-9A-Z]/g, '');

/** Mínimo de un serial GPON o una MAC para registrar una ONU que no está en inventario. */
export const SERIE_MINIMA = 8;
