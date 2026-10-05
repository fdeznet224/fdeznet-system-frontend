import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { ArrowPathIcon, ChevronRightIcon, MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiErrorMessage } from '@/utils/apiError';

interface ClienteEncontrado {
    id: number;
    nombre: string;
    cedula: string | null;
    direccion: string | null;
    ip_asignada?: string | null;
    estado: string;
}

const MINIMO = 3;

const colorEstado = (estado: string) => {
    if (estado === 'activo') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    if (estado === 'suspendido' || estado === 'cortado') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
};

/** Buscador del inicio del técnico: filtra mientras escribe y abre la ficha del cliente. */
export default function BuscadorClientes() {
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState('');
    // Respuesta junto con el término que la pidió: si no coincide, sigue buscando.
    const [respuesta, setRespuesta] = useState<{ termino: string; clientes: ClienteEncontrado[]; error: string } | null>(null);

    const termino = filtro.trim();
    const listo = termino.length >= MINIMO;
    const buscando = listo && respuesta?.termino !== termino;
    const resultados = respuesta?.clientes ?? [];
    const error = respuesta?.error ?? '';

    useEffect(() => {
        if (!listo) return;
        let vigente = true;
        const espera = window.setTimeout(async () => {
            try {
                const { data } = await client.get<ClienteEncontrado[]>('/clientes/', { params: { search: termino } });
                if (vigente) setRespuesta({ termino, clientes: data, error: '' });
            } catch (err) {
                if (vigente) setRespuesta({ termino, clientes: [], error: apiErrorMessage(err, 'No se pudo buscar') });
            }
        }, 350);
        return () => {
            vigente = false;
            window.clearTimeout(espera);
        };
    }, [termino, listo]);

    return (
        <div className="space-y-3">
            <label htmlFor="buscar-cliente-tecnico" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Buscar cliente</label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition-colors dark:border-slate-700 dark:bg-[#1a1f2e]">
                <MagnifyingGlassIcon className="ml-3 h-6 w-6 shrink-0 text-slate-400" />
                <input
                    id="buscar-cliente-tecnico"
                    className="w-full bg-transparent p-3 text-lg font-bold text-slate-900 outline-none placeholder-slate-400 dark:text-white"
                    placeholder="Nombre, número de contrato o IP..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    autoComplete="off"
                    enterKeyHint="search"
                />
                {buscando && <ArrowPathIcon className="mr-3 h-5 w-5 shrink-0 animate-spin text-slate-400" />}
                {!buscando && filtro && (
                    <button type="button" aria-label="Limpiar búsqueda" onClick={() => setFiltro('')} className="mr-2 rounded-lg p-2 text-slate-400 active:scale-90">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {termino && !listo && (
                <p className="ml-1 text-xs font-bold text-slate-500">Escribe al menos {MINIMO} caracteres.</p>
            )}

            {listo && (
                <div className="space-y-2">
                    {resultados.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => navigate(`/tech/cliente/${encodeURIComponent(c.cedula || String(c.id))}`)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left active:bg-slate-50 dark:border-slate-800 dark:bg-[#1a1f2e] dark:active:bg-slate-800/40"
                        >
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{c.nombre}</h3>
                                <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-slate-500">
                                    <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{c.direccion || 'Sin dirección'}</span>
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Contrato: {c.cedula || 'S/N'}</span>
                                    {c.ip_asignada && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{c.ip_asignada}</span>}
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${colorEstado(c.estado)}`}>{c.estado}</span>
                                </div>
                            </div>
                            <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400" />
                        </button>
                    ))}
                    {!buscando && error && (
                        <div className="rounded-xl border border-dashed border-rose-300 p-6 text-center text-sm font-bold text-rose-600 dark:border-rose-500/40">{error}</div>
                    )}
                    {!buscando && !error && resultados.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700">No encontramos clientes por nombre, número de contrato o IP.</div>
                    )}
                </div>
            )}
        </div>
    );
}
