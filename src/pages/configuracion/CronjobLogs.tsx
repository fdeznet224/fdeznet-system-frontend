import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { 
    ArrowLeftIcon, 
    ArrowPathIcon, 
    TrashIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ExclamationTriangleIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Interfaz del Log
interface LogEntry {
    id: number;
    fecha: string;      // Fecha ISO
    nivel: 'INFO' | 'ERROR' | 'WARNING';
    origen: string;     // Ej: "Facturación", "Cortes", "Sistema"
    mensaje: string;
}

export default function CronjobLogs() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async () => {
        try {
            const res = await client.get('/configuracion/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLogs();
    };

    const handleClear = async () => {
        if(!confirm("¿Borrar todo el historial de eventos?")) return;
        try {
            await client.delete('/configuracion/logs');
            setLogs([]);
            toast.success("Historial limpiado");
        } catch (error) {
            toast.error("Error al limpiar");
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Función para formatear fecha bonita
    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date);
    };

    // Icono según nivel
    const getIcon = (nivel: string) => {
        switch(nivel) {
            case 'ERROR': return <XCircleIcon className="w-5 h-5 text-rose-500" />;
            case 'WARNING': return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
            default: return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => navigate('/admin/configuracion')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CommandLineIcon className="w-7 h-7 text-amber-500" />
                            Historial de Cronjobs
                        </h1>
                        <p className="text-slate-400 text-sm">Registro de ejecuciones automáticas del servidor.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleRefresh}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> 
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button 
                        onClick={handleClear}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 rounded-lg border border-rose-900/30 transition"
                    >
                        <TrashIcon className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Limpiar Logs</span>
                    </button>
                </div>
            </div>

            {/* Contenedor de Logs (Estilo Terminal) */}
            <div className="bg-[#0f1219] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                
                {/* Cabecera de Tabla */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-1 text-center">Estado</div>
                    <div className="col-span-3">Fecha / Hora</div>
                    <div className="col-span-2">Origen</div>
                    <div className="col-span-6">Detalle del Evento</div>
                </div>

                {/* Lista de Logs */}
                <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-slate-600">
                            <ClockIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>No hay registros de eventos recientes.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="grid grid-cols-12 gap-4 p-3 rounded-lg hover:bg-slate-800/50 transition items-center border border-transparent hover:border-slate-700/50 group">
                                
                                {/* 1. Estado Icono */}
                                <div className="col-span-1 flex justify-center">
                                    {getIcon(log.nivel)}
                                </div>

                                {/* 2. Fecha (Monospace) */}
                                <div className="col-span-3 text-sm text-slate-400 font-mono">
                                    {formatDate(log.fecha)}
                                </div>

                                {/* 3. Origen (Badge) */}
                                <div className="col-span-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${
                                        log.origen === 'Facturación' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                        log.origen === 'Cortes' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                        'bg-slate-700 text-slate-300 border-slate-600'
                                    }`}>
                                        {log.origen}
                                    </span>
                                </div>

                                {/* 4. Mensaje */}
                                <div className="col-span-6 text-sm text-slate-300 font-mono truncate group-hover:whitespace-normal group-hover:text-white transition-colors">
                                    {log.mensaje}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Informativo */}
            <div className="mt-4 flex justify-between text-xs text-slate-500 px-2">
                <p>Mostrando últimos 100 eventos</p>
                <p>Servidor: Online</p>
            </div>
        </div>
    );
}