import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/axios';
import {
    ArrowLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, MapPinIcon, UserIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { BOTON_PRIMARIO, CAMPO, TARJETA } from './estilo';

interface ClientSearchResult {
    id: number;
    nombre: string;
    cedula: string | null;
    direccion: string | null;
    estado: string;
}

export default function TechSearch() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); 
    const initialQuery = searchParams.get('q');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<ClientSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // 2. Función reutilizable para buscar en la API
    const realizarBusqueda = useCallback(async (termino: string) => {
        if (!termino.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await client.get<ClientSearchResult[]>('/clientes/', {
                params: { search: termino.trim() }
            });
            setResults(res.data);
        } catch {
            toast.error("Error al buscar clientes");
        } finally {
            setLoading(false);
        }
    }, []);

    // 1. Detectar si venimos del Dashboard con una búsqueda pendiente
    useEffect(() => {
        if (!initialQuery) return;

        const searchTimer = window.setTimeout(() => {
            setSearchTerm(initialQuery);
            void realizarBusqueda(initialQuery);
        }, 0);

        return () => window.clearTimeout(searchTimer);
    }, [initialQuery, realizarBusqueda]);

    // 3. Manejador del formulario (cuando el técnico busca desde esta misma pantalla)
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void realizarBusqueda(searchTerm);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-[#0f1219] dark:text-white">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <button type="button" aria-label="Volver" onClick={() => navigate('/tech/dashboard')} className="-ml-1 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-base font-bold">Buscar cliente</h1>
            </div>

            <div className="mx-auto max-w-3xl p-4">
                <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            enterKeyHint="search"
                            aria-label="Buscar cliente"
                            placeholder="Contrato, nombre, IP o serial"
                            className={`${CAMPO} py-3 pl-11`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus={!initialQuery}
                        />
                    </div>
                    <button type="submit" disabled={!searchTerm.trim() || loading} className={`${BOTON_PRIMARIO} h-auto w-auto shrink-0`}>
                        Buscar
                    </button>
                </form>

                <div className="space-y-2 pb-10">
                    {loading ? (
                        <p className="py-12 text-center text-sm text-slate-400">Buscando...</p>
                    ) : results.length > 0 ? (
                        results.map((c) => (
                            <button
                                type="button"
                                key={c.id}
                                onClick={() => navigate(`/tech/cliente/${encodeURIComponent(c.cedula ?? String(c.id))}`)}
                                className={`${TARJETA} flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:scale-[0.99]`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{c.nombre}</span>
                                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                                        <MapPinIcon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.direccion || 'Sin dirección'}</span>
                                    </span>
                                    <span className="mt-1.5 flex items-center gap-1.5">
                                        <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white dark:bg-slate-700">{c.cedula || 'S/N'}</span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.estado === 'activo'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>{c.estado}</span>
                                    </span>
                                </span>
                                <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-300" />
                            </button>
                        ))
                    ) : hasSearched ? (
                        <div className={`${TARJETA} px-6 py-12 text-center`}>
                            <UserIcon className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">Sin resultados</p>
                            <p className="mt-0.5 text-xs text-slate-500">No encontramos coincidencias para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <p className="py-16 text-center text-sm text-slate-400">Los resultados de tu búsqueda aparecerán aquí</p>
                    )}
                </div>
            </div>
        </div>
    );
}
