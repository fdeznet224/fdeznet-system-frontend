// Los valores internos se conservan por compatibilidad con la base de datos;
// en pantalla siempre se muestran los textos de FORMAS_COBRO.
export type FormaCobro = 'calendario' | 'aniversario';

export const FORMAS_COBRO: Record<FormaCobro, { titulo: string; descripcion: string }> = {
  calendario: {
    titulo: 'Día fijo de pago',
    descripcion: 'Todos los clientes pagan el mismo día del mes.',
  },
  aniversario: {
    titulo: 'Día de instalación',
    descripcion: 'Cada cliente paga el mismo día en que se le instaló.',
  },
};

export function nombreFormaCobro(valor?: string | null) {
  return FORMAS_COBRO[valor as FormaCobro]?.titulo ?? 'Sin definir';
}
