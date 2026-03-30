import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // 👈 Importamos useSearchParams
import client from '../../api/axios';
import { 
    ArrowLeftIcon, MagnifyingGlassIcon, 
    MapPinIcon, SignalIcon, QrCodeIcon, UserIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function TechSearch() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // 👈 Hook para leer la URL (?q=...)
    
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // 1. Detectar si venimos del Dashboard con una búsqueda pendiente
    useEffect(() => {
        const query = searchParams.get('q'); // Lee lo que hay después de ?q=
        if (query) {
            setSearchTerm(query); // Rellena el input visualmente
            realizarBusqueda(query); // Ejecuta la búsqueda automáticamente
        }
    }, [searchParams]);

    // 2. Función reutilizable para buscar en la API
    const realizarBusqueda = async (termino: string) => {
        if (!termino.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await client.get(`/clientes/?search=${termino}`);
            setResults(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al buscar clientes");
        } finally {
            setLoading(false);
        }
    };

    // 3. Manejador del formulario (cuando el técnico busca desde esta misma pantalla)
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        realizarBusqueda(searchTerm);
    };

    return (
        <div className="min-h-screen bg-[#0f1014] text-white font-sans">
            {/* Navbar */}
            <div className="p-4 flex items-center gap-4 border-b border-slate-800 bg-[#111] sticky top-0 z-10">
                <button onClick={() => navigate('/tech/dashboard')} className="p-2 bg-slate-800 rounded-full active:scale-95">
                    <ArrowLeftIcon className="w-5 h-5"/>
                </button>
                <h2 className="font-bold">Buscar Abonado</h2>
            </div>

            <div className="p-4">
                {/* Barra de Búsqueda */}
                <form onSubmit={handleSearchSubmit} className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Nombre, SN o IP..."
                        className="w-full bg-[#1a1b23] border border-slate-700 text-white rounded-xl py-4 pl-12 pr-14 focus:outline-none focus:border-emerald-500 transition shadow-lg text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus={!searchParams.get('q')} // Solo autoenfoca si no venimos de una búsqueda automática
                    />
                    <MagnifyingGlassIcon className="w-6 h-6 text-slate-500 absolute left-4 top-4.5"/>
                    
                    {/* Atajo al Escáner */}
                    <button 
                        type="button"
                        onClick={() => navigate('/scanner')}
                        className="absolute right-3 top-3 p-1.5 bg-slate-700 rounded-lg text-emerald-400 hover:text-white transition"
                    >
                        <QrCodeIcon className="w-6 h-6"/>
                    </button>
                </form>

                {/* Lista de Resultados */}
                <div className="space-y-3 pb-10">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500 animate-pulse flex flex-col items-center">
                            <MagnifyingGlassIcon className="w-8 h-8 mb-2 animate-bounce"/>
                            <span>Buscando en base de datos...</span>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((c) => (
                            <div 
                                key={c.id}
                                onClick={() => navigate(`/tech/cliente/${c.cedula}`)}
                                className="bg-[#1a1b23] p-4 rounded-2xl border border-slate-800 active:bg-slate-800 transition cursor-pointer flex justify-between items-center group hover:border-blue-500/30"
                            >
                                <div>
                                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition">{c.nombre}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                        <MapPinIcon className="w-3 h-3"/> {c.direccion || 'Sin dirección'}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                                            SN: {c.cedula}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${c.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {c.estado}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-full text-slate-500">
                                    <SignalIcon className="w-5 h-5"/>
                                </div>
                            </div>
                        ))
                    ) : hasSearched ? (
                        <div className="text-center py-10 opacity-60">
                            <UserIcon className="w-16 h-16 text-slate-700 mx-auto mb-3"/>
                            <p className="text-slate-400 font-bold">Sin resultados</p>
                            <p className="text-slate-600 text-xs">No encontramos coincidencias para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="text-center py-20 opacity-30">
                            <p className="text-xs text-slate-500">Resultados recientes aparecerán aquí</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}