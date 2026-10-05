import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/axios';
import { 
    ArrowLeftIcon, MagnifyingGlassIcon, 
    MapPinIcon, SignalIcon, UserIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

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
        /* ✅ ADAPTADO: Fondo principal transiciona suavemente */
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans transition-colors duration-300">
            
            {/* Navbar Adaptativo */}
            <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300 shadow-sm dark:shadow-none">
                <button 
                    onClick={() => navigate('/tech/dashboard')} 
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full active:scale-90 transition-all"
                >
                    <ArrowLeftIcon className="w-5 h-5"/>
                </button>
                <h2 className="font-black text-lg tracking-tight">Buscar Abonado</h2>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto">
                {/* Barra de Búsqueda Adaptativa */}
                <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="search"
                            enterKeyHint="search"
                            aria-label="Buscar cliente"
                            placeholder="Contrato, nombre, IP o serial"
                            className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-base font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus={!initialQuery}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!searchTerm.trim() || loading}
                        className="shrink-0 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                        Buscar
                    </button>
                </form>

                {/* Lista de Resultados */}
                <div className="space-y-3 pb-10">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 animate-pulse flex flex-col items-center">
                            <MagnifyingGlassIcon className="w-8 h-8 mb-3 animate-bounce text-emerald-500"/>
                            <span className="font-bold text-sm uppercase tracking-widest">Buscando en base de datos...</span>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((c) => (
                            /* ✅ ADAPTADO: Tarjeta de resultados clara vs oscura */
                            <div 
                                key={c.id}
                                onClick={() => navigate(`/tech/cliente/${c.cedula ?? c.id}`)}
                                className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center group hover:border-blue-500/40 dark:hover:border-blue-500/40"
                            >
                                <div className="overflow-hidden pr-3">
                                    <h3 className="font-black text-slate-800 dark:text-white text-base md:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                        {c.nombre}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                                        <MapPinIcon className="w-3.5 h-3.5 shrink-0"/> 
                                        <span className="truncate">{c.direccion || 'Sin dirección'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2.5">
                                        <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                            Contrato: {c.cedula || 'Sin asignar'}
                                        </span>
                                        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase border ${
                                            c.estado === 'activo' 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                                                : 'bg-rose-50 dark:bg-red-500/10 text-rose-600 dark:text-red-400 border-rose-200 dark:border-red-500/20'
                                        }`}>
                                            {c.estado}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-full text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
                                    <SignalIcon className="w-5 h-5"/>
                                </div>
                            </div>
                        ))
                    ) : hasSearched ? (
                        <div className="text-center py-16 opacity-80">
                            <div className="bg-slate-100 dark:bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-800">
                                <UserIcon className="w-10 h-10 text-slate-400 dark:text-slate-600"/>
                            </div>
                            <p className="text-slate-800 dark:text-white font-black text-lg mb-1">Sin resultados</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">No encontramos coincidencias para "<span className="font-bold text-slate-700 dark:text-slate-300">{searchTerm}</span>"</p>
                        </div>
                    ) : (
                        <div className="text-center py-24 opacity-50">
                            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Los resultados de tu búsqueda aparecerán aquí</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
