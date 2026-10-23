import type { Calendario } from './tipos';

const larga = (valor: string) => new Date(`${valor}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const enDias = (dias: number) => (dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`);

/** La frase que el cliente necesita leer, según dónde va en su ciclo de pago. */
export function mensajeCalendario(c: Calendario): { titulo: string; detalle: string; tono: 'verde' | 'ambar' | 'rojo' } {
    const dias = c.dias ?? 0;
    switch (c.tipo) {
        case 'por_vencer':
            return {
                titulo: dias === 0 ? 'Hoy vence tu pago' : `Tu pago vence ${enDias(dias)}`,
                detalle: c.corte ? `Si no se paga, tu servicio se suspende el ${larga(c.corte)}.` : `Vence el ${larga(c.fecha!)}.`,
                tono: dias <= 2 ? 'ambar' : 'verde',
            };
        case 'por_suspender':
            return {
                titulo: dias === 0 ? 'Hoy es el último día antes de la suspensión' : `Estás a ${dias} ${dias === 1 ? 'día' : 'días'} de que se suspenda tu servicio`,
                detalle: 'Tu pago ya venció. Paga o pide una promesa de pago para seguir conectado.',
                tono: 'rojo',
            };
        case 'promesa':
            return { titulo: `Tu promesa de pago vence ${enDias(dias)}`, detalle: `Paga antes del ${larga(c.fecha!)} para no perder el servicio.`, tono: dias <= 1 ? 'ambar' : 'verde' };
        case 'vencido':
            return { titulo: 'Tu pago está vencido', detalle: 'Tu servicio puede estar suspendido. Al pagar se reactiva.', tono: 'rojo' };
        default:
            return {
                titulo: 'Estás al corriente',
                detalle: c.fecha && c.dias !== null && c.dias >= 0 ? `Tu próxima factura sale ${enDias(c.dias)} (${larga(c.fecha)}).` : 'No tienes pagos pendientes.',
                tono: 'verde',
            };
    }
}
