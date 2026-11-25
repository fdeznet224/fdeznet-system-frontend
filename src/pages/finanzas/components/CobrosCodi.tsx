import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import client from '../../../api/axios';
import { Etiqueta, Lista, Pestanas, Vacio } from './FinanzasUI';
import { claseControl, dinero } from './formato';

export interface CobroCodi {
    id: number;
    cliente_id: number | null;
    cliente_nombre: string;
    cliente_cedula: string | null;
    canal: string;
    celular: string | null;
    monto: number;
    monto_pagado: number | null;
    meses_adelanto: number;
    estado: string;
    detalle: string | null;
    creado_en: string;
    pagado_en: string | null;
    pago_ids: number[];
}

const ESTADOS: Record<string, { texto: string; tono: 'emerald' | 'amber' | 'rose' | 'slate' | 'blue' }> = {
    aplicado: { texto: 'Pagado', tono: 'emerald' },
    enviado: { texto: 'Esperando', tono: 'blue' },
    vencido: { texto: 'Vencido', tono: 'slate' },
    sin_aplicar: { texto: 'Sin aplicar', tono: 'rose' },
    error: { texto: 'No se mandó', tono: 'amber' },
};

const FILTROS = [
    { valor: '', etiqueta: 'Todos' },
    { valor: 'sin_aplicar', etiqueta: 'Sin aplicar' },
    { valor: 'enviado', etiqueta: 'Esperando' },
    { valor: 'aplicado', etiqueta: 'Pagados' },
    { valor: 'vencido', etiqueta: 'Vencidos' },
] as const;

const fechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const celular = (n: string | null) => (n && n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : n);

/** Cada cobro CoDi que se mandó (al celular o con QR), pagado o no, y de quién es. */
export default function CobrosCodi() {
    const [cobros, setCobros] = useState<CobroCodi[]>([]);
    const [estado, setEstado] = useState<string>('');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    const cargar = useCallback(async (filtro: string, texto: string) => {
        setCargando(true);
        try {
            const { data } = await client.get<CobroCodi[]>('/finanzas/cobros-codi', {
                params: { estado: filtro || undefined, busqueda: texto || undefined },
            });
            setCobros(data);
        } catch {
            toast.error('No se pudieron cargar los cobros CoDi');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        const texto = busqueda.trim();
        const timer = window.setTimeout(() => void cargar(estado, texto), texto ? 400 : 0);
        return () => window.clearTimeout(timer);
    }, [estado, busqueda, cargar]);

    const sinAplicar = cobros.filter((c) => c.estado === 'sin_aplicar').length;

    return (
        <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Pestanas opciones={FILTROS.map((f) => ({ ...f }))} valor={estado} onCambio={setEstado} />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, contrato o celular"
                    aria-label="Buscar cobro CoDi" className={`${claseControl} md:max-w-xs`} />
            </div>

            {sinAplicar > 0 && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" data-testid="codi-sin-aplicar">
                    {sinAplicar} pago{sinAplicar === 1 ? '' : 's'} CoDi llegó y no se pudo aplicar solo: regístralo en la{' '}
                    <Link to="/admin/cobranza" className="font-semibold underline">Terminal de cobro</Link>.
                </p>
            )}

            <Lista>
                {cobros.length === 0 ? (
                    <Vacio cargando={cargando} texto="No hay cobros CoDi." />
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="cobros-codi">
                        {cobros.map((c) => {
                            const info = ESTADOS[c.estado] ?? { texto: c.estado, tono: 'slate' as const };
                            return (
                                <li key={c.id} className="flex items-start justify-between gap-3 p-3.5">
                                    <div className="min-w-0">
                                        <div className="font-medium leading-tight text-slate-900 dark:text-white">
                                            {c.cliente_cedula ? `${c.cliente_cedula} · ` : ''}{c.cliente_nombre}
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-500">
                                            {[
                                                c.canal,
                                                c.celular && celular(c.celular),
                                                c.meses_adelanto > 0 && `adelanta ${c.meses_adelanto} mes${c.meses_adelanto === 1 ? '' : 'es'}`,
                                                `enviado ${fechaHora(c.creado_en)}`,
                                                c.pagado_en && `pagado ${fechaHora(c.pagado_en)}`,
                                                c.pago_ids.length > 0 && `Pago #${c.pago_ids.join(', #')}`,
                                            ].filter(Boolean).join(' · ')}
                                        </div>
                                        {c.detalle && c.estado !== 'aplicado' && <div className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">{c.detalle}</div>}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{dinero(c.monto_pagado ?? c.monto)}</span>
                                        <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Lista>
        </>
    );
}
