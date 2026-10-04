import axios from 'axios';

// Nombres de campos que FastAPI devuelve en los errores de validación.
const CAMPOS: Record<string, string> = {
  mac_address: 'MAC',
  telefono: 'Teléfono',
  nombre: 'Nombre',
  correo: 'Correo',
  cedula: 'Número de contrato',
  ip_asignada: 'IP',
  latitud: 'Latitud',
  longitud: 'Longitud',
  puerto_nap: 'Puerto NAP',
};

type ErrorValidacion = { loc?: unknown[]; msg?: unknown };

/**
 * Texto para mostrar de un error de la API.
 *
 * FastAPI devuelve `detail` como texto o, si falla la validación (422), como
 * una lista de objetos; mostrar ese objeto en pantalla rompe React.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ detail?: unknown; mensaje?: unknown }>(error)) return fallback;
  const detail = error.response?.data?.detail ?? error.response?.data?.mensaje;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((item: ErrorValidacion) => {
        const campo = Array.isArray(item?.loc) ? String(item.loc[item.loc.length - 1] ?? '') : '';
        const texto = String(item?.msg ?? '').replace(/^Value error, /, '');
        if (!texto) return '';
        return campo && CAMPOS[campo] ? `${CAMPOS[campo]}: ${texto}` : texto;
      })
      .filter(Boolean);
    if (mensajes.length) return mensajes.join(' · ');
  }
  return fallback;
}
