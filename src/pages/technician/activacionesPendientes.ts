import { getCachedValue, setCachedValue } from '../../offline/db';

/**
 * Lo que el técnico le explica al cliente después de activar se queda en el
 * celular hasta que toca "Terminar instalación": si la app se recarga a media
 * explicación, la agenda le devuelve la pantalla.
 */
export interface ActivacionPendiente {
    ordenId: string;
    nombre: string;
    contrato: string;
}

const CLAVE_LISTA = 'activaciones-sin-terminar';
export const claveResultado = (ordenId: string) => `activacion-resultado-${ordenId}`;

export async function listarActivacionesPendientes(): Promise<ActivacionPendiente[]> {
    const lista = await getCachedValue<ActivacionPendiente[]>(CLAVE_LISTA).catch(() => null);
    return Array.isArray(lista) ? lista : [];
}

export async function guardarActivacion<T extends { nombre: string; contrato: string }>(ordenId: string, resultado: T) {
    await setCachedValue(claveResultado(ordenId), resultado);
    const lista = (await listarActivacionesPendientes()).filter((a) => a.ordenId !== ordenId);
    await setCachedValue(CLAVE_LISTA, [...lista, { ordenId, nombre: resultado.nombre, contrato: resultado.contrato }]);
}

export async function terminarActivacion(ordenId: string) {
    await setCachedValue(claveResultado(ordenId), null);
    const lista = (await listarActivacionesPendientes()).filter((a) => a.ordenId !== ordenId);
    await setCachedValue(CLAVE_LISTA, lista);
}
