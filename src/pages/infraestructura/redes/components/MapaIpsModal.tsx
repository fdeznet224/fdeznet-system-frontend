import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiErrorMessage } from '@/utils/apiError';
import { BOTON_SECUNDARIO, PILDORA, PUNTO_TONO, type Tono } from '@/components/ui/estilo';
import type { EstadoIp, FilaIp, MapaIps, RedRecord } from '../types';

interface Props {
    red: RedRecord | null;
    onClose: () => void;
}

const ESTADOS: Record<EstadoIp, { nombre: string; tono: Tono }> = {
    libre: { nombre: 'Libre', tono: 'verde' },
    cliente: { nombre: 'Cliente', tono: 'azul' },
    baja: { nombre: 'Sin uso (baja)', tono: 'ambar' },
    mikrotik: { nombre: 'En uso sin registro', tono: 'violeta' },
    equipo: { nombre: 'Equipo de red', tono: 'neutro' },
    gateway: { nombre: 'Gateway', tono: 'neutro' },
};

type Filtro = 'todas' | EstadoIp;

export default function MapaIpsModal({ red, onClose }: Props) {
    const [mapa, setMapa] = useState<MapaIps | null>(null);
    const [cargando, setCargando] = useState(false);
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const [liberando, setLiberando] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        if (!red) return;
        setCargando(true);
        try {
            const { data } = await client.get<MapaIps>(`/network/redes/${red.id}/mapa-ips`);
            setMapa(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo leer el pool'));
        } finally {
            setCargando(false);
        }
    }, [red]);

    useEffect(() => {
        setMapa(null);
        setFiltro('todas');
        const t = window.setTimeout(() => void cargar(), 0);
        return () => window.clearTimeout(t);
    }, [cargar]);

    const filas = useMemo(
        () => (mapa?.ips || []).filter((f) => filtro === 'todas' || f.estado === filtro),
        [mapa, filtro],
    );

    const liberar = async (fila: FilaIp) => {
        if (!red) return;
        if (!window.confirm(`¿Liberar ${fila.ip}? Se quita de la ficha de ${fila.detalle || 'el cliente dado de baja'}.`)) return;
        setLiberando(fila.ip);
        try {
            await client.post(`/network/redes/${red.id}/liberar`, { ip: fila.ip });
            toast.success(`${fila.ip} quedó libre`);
            void cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo liberar'));
        } finally {
            setLiberando(null);
        }
    };

    if (!red) return null;
    const resumen = mapa?.resumen;
    const chips: Array<[Filtro, string, number | undefined]> = [
        ['todas', 'Todas', mapa?.ips.length],
        ['libre', 'Libres', resumen?.libre],
        ['cliente', 'Clientes', resumen?.cliente],
        ['baja', 'Sin uso', resumen?.baja],
        ['mikrotik', 'Sin registro', resumen?.mikrotik],
        ['equipo', 'Equipos', resumen?.equipo],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                    <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">{red.nombre}</h3>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {red.cidr}
                            {(red.ip_inicio || red.ip_fin) && ` · rango ${red.ip_inicio || 'inicio'} – ${red.ip_fin || 'fin'}`}
                        </p>
                        {resumen && (
                            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {resumen.disponibles} IP disponibles para antenas nuevas
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => void cargar()} disabled={cargando} className={BOTON_SECUNDARIO} aria-label="Actualizar">
                            <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                        </button>
                        <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Cerrar">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {mapa && !mapa.mikrotik_verificado && (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                        {mapa.error || 'No se pudo consultar el MikroTik'}: no se sabe qué IP usa sin registro.
                    </div>
                )}

                <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
                    {chips.map(([valor, nombre, cuenta]) => (
                        <button
                            key={valor}
                            type="button"
                            onClick={() => setFiltro(valor)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filtro === valor
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                            {nombre}{cuenta !== undefined ? ` · ${cuenta}` : ''}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {cargando && !mapa ? (
                        <div className="py-16 text-center text-sm text-slate-500">
                            <ArrowPathIcon className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-500" />
                            Consultando el MikroTik…
                        </div>
                    ) : filas.length === 0 ? (
                        <p className="py-16 text-center text-sm text-slate-500">No hay IP en este filtro.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filas.map((fila) => {
                                const estado = ESTADOS[fila.estado];
                                return (
                                    <li key={fila.ip} className={`flex items-center gap-3 py-2.5 ${fila.en_rango ? '' : 'opacity-60'}`}>
                                        <span className="w-28 shrink-0 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{fila.ip}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA[estado.tono]}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${PUNTO_TONO[estado.tono]}`} />
                                                    {estado.nombre}
                                                </span>
                                                {fila.estado === 'cliente' && fila.responde === false && (
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.rojo}`}>No responde</span>
                                                )}
                                                {fila.estado === 'cliente' && fila.cliente_estado === 'suspendido' && (
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.neutro}`}>Suspendido</span>
                                                )}
                                                {!fila.en_rango && <span className="text-[11px] text-slate-400">fuera del rango</span>}
                                            </div>
                                            {fila.detalle && fila.estado !== 'libre' && (
                                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{fila.detalle}</p>
                                            )}
                                            {fila.estado === 'baja' && fila.visto_en_mikrotik && (
                                                <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">El MikroTik aún ve un equipo con esta IP: no se reparte.</p>
                                            )}
                                            {fila.repetida_con && fila.repetida_con.length > 0 && (
                                                <p className="mt-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                                    Repetida con: {fila.repetida_con.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        {fila.estado === 'baja' && (
                                            <button
                                                type="button"
                                                onClick={() => void liberar(fila)}
                                                disabled={liberando === fila.ip}
                                                className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
                                            >
                                                {liberando === fila.ip ? 'Liberando…' : 'Liberar'}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
