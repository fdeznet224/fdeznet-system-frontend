import { useState, useEffect, useCallback } from 'react';

import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, TrashIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { EncabezadoPagina } from '@/components/ui/Pagina';
import { BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO } from '@/components/ui/estilo';

interface LogEntry {
    id: number;
    fecha: string;
    nivel: 'INFO' | 'ERROR' | 'WARN' | 'WARNING';
    origen: string;
    mensaje: string;
}

export default function CronjobLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reconciling, setReconciling] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await client.get<LogEntry[]>('/configuracion/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchLogs();
    };

    const handleClear = async () => {
        if(!confirm("¿Borrar todo el historial de eventos?")) return;
        try {
            await client.delete('/configuracion/logs');
            setLogs([]);
            toast.success("Historial limpiado");
        } catch {
            toast.error("Error al limpiar");
        }
    };

    const handleReconcile = async () => {
        setReconciling(true);
        try {
            const response = await client.post<{
                message?: string;
                reporte?: {
                    reparados: number;
                    errores: number;
                };
            }>('/network/conciliar-mikrotik');
            const errores = response.data.reporte?.errores || 0;
            if (errores > 0) {
                toast.error(response.data.message || 'Conciliación terminada con errores');
            } else {
                toast.success(response.data.message || 'MikroTik conciliado');
            }
            await fetchLogs();
        } catch {
            toast.error('No se pudo ejecutar la conciliación MikroTik');
        } finally {
            setReconciling(false);
        }
    };

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchLogs(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [fetchLogs]);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date);
    };

    const getIcon = (nivel: string) => {
        switch(nivel) {
            case 'ERROR': return <XCircleIcon className="w-5 h-5 text-rose-500" />;
            case 'WARN':
            case 'WARNING': return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
            default: return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
        }
    };

    return (
        <div className="mx-auto max-w-6xl">
            <EncabezadoPagina
                volver={{ a: '/admin/configuracion', texto: 'Configuración' }}
                titulo="Historial de Cronjobs"
                descripcion="Registro de ejecuciones automáticas del servidor."
                acciones={(
                    <div className="flex gap-2">
                    <button
                        onClick={handleReconcile}
                        disabled={reconciling}
                        className={BOTON_ACCION_PRIMARIO}
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                            {reconciling ? 'Conciliando...' : 'Conciliar MikroTik'}
                        </span>
                    </button>
                    <button 
                        onClick={handleRefresh}
                        className={BOTON_ACCION_SECUNDARIO}
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> 
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button 
                        onClick={handleClear}
                        className={`${BOTON_ACCION_SECUNDARIO} text-rose-600 dark:text-rose-400`}
                    >
                        <TrashIcon className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Limpiar Logs</span>
                    </button>
                    </div>
                )}
            />

            {/* Contenedor de Logs (Estilo Terminal Adaptativo) */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl overflow-hidden min-h-[500px] flex flex-col transition-colors">
                
                {/* Cabecera de Tabla */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-500 transition-colors">
                    <div className="col-span-1 text-center">Estado</div>
                    <div className="col-span-3">Fecha / Hora</div>
                    <div className="col-span-2">Origen</div>
                    <div className="col-span-6">Detalle del Evento</div>
                </div>

                {/* Lista de Logs */}
                <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 dark:border-slate-500"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 dark:text-slate-600">
                            <ClockIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="font-bold text-xs">No hay registros de eventos.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="grid grid-cols-12 gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors items-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 group">
                                
                                {/* 1. Estado Icono */}
                                <div className="col-span-1 flex justify-center">
                                    {getIcon(log.nivel)}
                                </div>

                                {/* 2. Fecha (Monospace) */}
                                <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 font-mono transition-colors">
                                    {formatDate(log.fecha)}
                                </div>

                                {/* 3. Origen (Badge) */}
                                <div className="col-span-2">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider ${
                                        log.origen === 'Facturación' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' :
                                        log.origen === 'Cortes' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                        log.origen === 'ConciliacionMikroTik' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' :
                                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                    }`}>
                                        {log.origen}
                                    </span>
                                </div>

                                {/* 4. Mensaje */}
                                <div className="col-span-6 text-sm text-slate-800 dark:text-slate-300 font-mono truncate group-hover:whitespace-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {log.mensaje}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Informativo */}
            <div className="mt-4 flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-600 px-2 transition-colors">
                <p>Mostrando últimos 100 eventos</p>
                <p>Servidor: Online</p>
            </div>
        </div>
    );
}
