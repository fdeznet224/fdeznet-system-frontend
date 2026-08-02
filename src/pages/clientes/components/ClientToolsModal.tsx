import {
    useState, useEffect, useCallback,
    type ComponentType, type ReactNode
} from 'react';
import axios from 'axios';
import client from '@/api/axios';
import type { ClientService } from '@/types/services';
import { serviceDisplayName } from '@/types/services';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon, WrenchScrewdriverIcon, ServerIcon,
    PresentationChartLineIcon, ChatBubbleLeftRightIcon,
    PauseCircleIcon, PlayCircleIcon, ArrowLeftIcon,
    TrashIcon, ArrowPathIcon, ArchiveBoxXMarkIcon,
    GlobeAmericasIcon, CheckCircleIcon, NoSymbolIcon,
    ClockIcon, ArrowDownTrayIcon, ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import ChatModal from '@/components/chat/ChatModal';

interface ClientReference {
    id: number;
    nombre?: string;
    telefono?: string;
    ip_asignada?: string;
    estado?: string;
    identificador_onu?: string;
    servicio?: {
        ip_asignada?: string;
        estado_servicio?: string;
    };
}

interface NetworkStatus {
    online: boolean;
    metodo?: string;
    datos?: {
        ip_actual?: string;
        uptime?: string;
        info?: string;
    };
}

interface TrafficStatus {
    velocidad_subida?: number;
    velocidad_bajada?: number;
}

interface TechnicianOption {
    id: number;
    nombre_completo?: string;
    usuario: string;
}

interface TerminationResponse {
    mikrotik_estado?: string;
}

type MenuVariant = 'blue' | 'purple' | 'emerald' | 'success' | 'warning' | 'orange' | 'danger';

interface IconProps {
    className?: string;
}

interface MenuButtonProps {
    icon: ComponentType<IconProps>;
    label: string;
    desc: string;
    variant?: MenuVariant;
    badge?: number;
    onClick: () => void;
}

interface BackButtonProps {
    onClick: () => void;
}

interface DetailRowProps {
    label: string;
    value?: ReactNode;
    icon: ComponentType<IconProps>;
    monospace?: boolean;
}

interface TrafficBarProps {
    label: string;
    value: string;
    raw: number;
    color: 'cyan' | 'purple';
    icon: ComponentType<IconProps>;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cliente: ClientReference | null;
    unreadCount?: number;
    onActionSuccess: () => void;
}

type ToolMode = 'menu' | 'estado_real' | 'consumo_vivo' | 'suspender_reactivar' | 'eliminar' | 'dar_de_baja';

type ContentProps = Omit<Props, 'cliente'> & { cliente: ClientReference };

function apiErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

export default function ClientToolsModal(props: Props) {
    if (!props.isOpen || !props.cliente) return null;
    return <ClientToolsModalContent key={props.cliente.id} {...props} cliente={props.cliente} />;
}

function ClientToolsModalContent({ isOpen, onClose, cliente: clienteProp, unreadCount = 0, onActionSuccess }: ContentProps) {
    const [mode, setMode] = useState<ToolMode>('menu');
    const [clienteActual, setClienteActual] = useState<ClientReference>(clienteProp);
    const [servicios, setServicios] = useState<ClientService[]>([]);
    const [servicioSeleccionadoId, setServicioSeleccionadoId] = useState<number | null>(null);
    const [dataEstado, setDataEstado] = useState<NetworkStatus | null>(null);
    const [dataConsumo, setDataConsumo] = useState<TrafficStatus | null>(null);
    const [showChatModal, setShowChatModal] = useState(false);
    const [tecnicos, setTecnicos] = useState<TechnicianOption[]>([]);
    const [bajaForm, setBajaForm] = useState({
        motivo: '',
        observaciones: '',
        tecnico_id: '',
        fecha_programada: '',
    });
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}') as { rol?: string };
    const canManageTermination = ['admin', 'supervisor'].includes(currentUser.rol ?? '');
    const clientId = clienteProp.id;

    const refreshClienteData = useCallback(async () => {
        try {
            const [clientResponse, servicesResponse] = await Promise.all([
                client.get<ClientReference>(`/clientes/${clientId}`),
                client.get<ClientService[]>(`/servicios/cliente/${clientId}`),
            ]);
            setClienteActual(clientResponse.data);
            setServicios(servicesResponse.data);
            setServicioSeleccionadoId((current) => {
                if (current && servicesResponse.data.some((item) => item.id === current)) return current;
                const preferred = servicesResponse.data.find((item) => ['activo', 'suspendido'].includes(item.estado));
                return preferred?.id ?? servicesResponse.data[0]?.id ?? null;
            });
        } catch (error) {
            console.error("Error actualizando datos", error);
        }
    }, [clientId]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void refreshClienteData(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [refreshClienteData]);

    const servicioSeleccionado = servicios.find((item) => item.id === servicioSeleccionadoId) || null;
    const estadoRaw = (
        servicioSeleccionado?.estado
        || clienteActual.estado
        || clienteActual.servicio?.estado_servicio
        || ''
    ).toLowerCase();
    const currentIp = servicioSeleccionado?.ip_asignada || clienteActual.ip_asignada || clienteActual.servicio?.ip_asignada || 'Sin IP';
    const isSuspended = ['suspendido', 'cortado', 'retirado', 'inactivo'].includes(estadoRaw);
    const isCancelled = estadoRaw === 'cancelado';

    useEffect(() => {
        if (!isOpen || mode !== 'dar_de_baja' || !canManageTermination) return;
        client.get<TechnicianOption[]>('/bajas/tecnicos/disponibles')
            .then((response) => setTecnicos(response.data))
            .catch(() => setTecnicos([]));
    }, [isOpen, mode, canManageTermination]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isOpen && clienteActual) {
            if (mode === 'estado_real') {
                const fetchEstado = async () => {
                    try {
                        const endpoint = servicioSeleccionado
                            ? `/network/diagnostico/servicios/${servicioSeleccionado.id}/conexion`
                            : `/network/diagnostico/conexion/${clienteActual.id}`;
                        const res = await client.get<NetworkStatus>(endpoint);
                        setDataEstado(res.data);
                    } catch {
                        setDataEstado({ online: false, metodo: "ERROR", datos: { info: "Sin respuesta" } });
                    }
                };
                fetchEstado();
            }
            if (mode === 'consumo_vivo') {
                const fetchConsumo = async () => {
                    try {
                        const endpoint = servicioSeleccionado
                            ? `/network/diagnostico/servicios/${servicioSeleccionado.id}/trafico`
                            : `/network/diagnostico/trafico/${clienteActual.id}`;
                        const res = await client.get<TrafficStatus>(endpoint);
                        setDataConsumo(res.data);
                    } catch (e) { console.error(e); }
                };
                fetchConsumo();
                interval = setInterval(fetchConsumo, 2000);
            }
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [mode, isOpen, clienteActual, servicioSeleccionado]);

    const handleToggleSuspension = async () => {
        if (!clienteActual) return;
        const nuevoEstado = isSuspended ? 'activo' : 'suspendido';
        const loadToast = toast.loading(isSuspended ? "Reactivando..." : "Suspendiendo...");
        try {
            if (servicioSeleccionado) {
                await client.put(`/servicios/${servicioSeleccionado.id}/estado`, { estado: nuevoEstado });
            } else {
                await client.put(`/clientes/${clienteActual.id}/estado`, { nuevo_estado: nuevoEstado });
            }
            toast.dismiss(loadToast);
            toast.success(isSuspended ? "¡Servicio Reactivado!" : "Servicio Suspendido");
            await refreshClienteData();
            onActionSuccess();
            setMode('menu');
        } catch {
            toast.dismiss(loadToast);
            toast.error("Error en Router");
        }
    };

    const handleDarDeBaja = async () => {
        if (!clienteActual) return;
        if (bajaForm.motivo.trim().length < 5) {
            toast.error('Indica el motivo de la baja');
            return;
        }
        const loadToast = toast.loading("Procesando baja y liberando MikroTik...");
        try {
            const response = await client.post<TerminationResponse>(`/bajas/clientes/${clienteActual.id}`, {
                servicio_id: servicioSeleccionado?.id ?? null,
                motivo: bajaForm.motivo.trim(),
                observaciones: bajaForm.observaciones.trim() || null,
                tecnico_id: bajaForm.tecnico_id ? Number(bajaForm.tecnico_id) : null,
                fecha_programada: bajaForm.fecha_programada || null,
            });
            toast.dismiss(loadToast);
            if (response.data.mikrotik_estado === 'error') {
                toast.error('Baja registrada; revisa la sincronización con MikroTik');
            } else {
                toast.success("Servicio cancelado. ONU enviada a recolección.");
            }
            await refreshClienteData();
            onActionSuccess();
            setMode('menu'); 
        } catch (error: unknown) {
            toast.dismiss(loadToast);
            toast.error(apiErrorMessage(error, "Error al procesar la baja"));
        }
    };

    const handleEliminarCliente = async () => {
        if (!clienteActual) return;
        const loadToast = toast.loading("Validando eliminación...");
        try {
            await client.delete(`/clientes/${clienteActual.id}`);
            toast.dismiss(loadToast);
            toast.success("Cliente eliminado");
            onActionSuccess();
            onClose();
        } catch (error: unknown) {
            toast.dismiss(loadToast);
            toast.error(apiErrorMessage(
                error,
                "No se pudo eliminar definitivamente el cliente."
            ));
        }
    };

    return (
        <>
            <div role="dialog" aria-label="Herramientas del cliente" aria-modal="true" className={`fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/90 sm:items-center sm:p-4 ${showChatModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                
                <div className="flex max-h-[88dvh] w-full max-w-md animate-in flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl slide-in-from-bottom-8 transition-colors dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] sm:rounded-2xl sm:zoom-in-95">

                    <div className="flex justify-center bg-slate-50 pt-3 dark:bg-slate-950 sm:hidden">
                        <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </div>

                    {/* HEADER */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-500/20 transition-colors">
                                <WrenchScrewdriverIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 dark:text-white font-black text-base leading-tight transition-colors">Herramientas</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-slate-500 text-[11px] font-mono font-bold tracking-wider">{currentIp}</p>
                                    {isSuspended ? (
                                        <span className="text-[9px] bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-500/30 font-black uppercase tracking-widest">Suspendido</span>
                                    ) : (
                                        <span className="text-[9px] bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 font-black uppercase tracking-widest">Activo</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button aria-label="Cerrar herramientas" onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* BODY */}
                    <div className="overflow-y-auto bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-colors custom-scrollbar dark:bg-slate-900 sm:p-6">
                        {servicios.length > 0 && (
                            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Servicio sobre el que vas a trabajar
                                </label>
                                <select
                                    value={servicioSeleccionadoId ?? ''}
                                    onChange={(event) => {
                                        setServicioSeleccionadoId(Number(event.target.value));
                                        setDataEstado(null);
                                        setDataConsumo(null);
                                        setMode('menu');
                                    }}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                >
                                    {servicios.map((servicio) => (
                                        <option key={servicio.id} value={servicio.id}>
                                            {serviceDisplayName(servicio)} ({servicio.estado})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {mode === 'menu' && (
                            <div className="grid grid-cols-2 gap-3">
                                <MenuButton icon={ServerIcon} label="Estado" desc="Ping" variant="blue" onClick={() => { setDataEstado(null); setMode('estado_real'); }} />
                                <MenuButton icon={PresentationChartLineIcon} label="Tráfico" desc="En vivo" variant="purple" onClick={() => { setDataConsumo(null); setMode('consumo_vivo'); }} />

                                <MenuButton
                                    icon={ChatBubbleLeftRightIcon}
                                    label="Mensaje"
                                    desc="WhatsApp Rápido"
                                    variant="emerald"
                                    badge={unreadCount} 
                                    onClick={() => {
                                        setShowChatModal(true);
                                        onActionSuccess(); 
                                    }}
                                />

                                <MenuButton
                                    icon={isSuspended ? PlayCircleIcon : PauseCircleIcon}
                                    label={isSuspended ? "Reactivar" : "Suspender"}
                                    desc={isSuspended ? "Habilitar Internet" : "Cortar Internet"}
                                    variant={isSuspended ? "success" : "warning"}
                                    onClick={() => setMode('suspender_reactivar')}
                                />

                                {canManageTermination && !isCancelled && <MenuButton
                                    icon={ArchiveBoxXMarkIcon}
                                    label="Dar de Baja"
                                    desc="Cancelar servicio y recoger"
                                    variant="orange"
                                    onClick={() => setMode('dar_de_baja')}
                                />}

                                {canManageTermination && <MenuButton
                                    icon={TrashIcon}
                                    label="Eliminar"
                                    desc="Borrar registro completo"
                                    variant="danger"
                                    onClick={() => setMode('eliminar')}
                                />}
                            </div>
                        )}

                        {/* Modos secundarios */}
                        {mode === 'suspender_reactivar' && (
                            <div className="space-y-6 text-center py-8 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${isSuspended ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10' : 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10'}`}>
                                    {isSuspended ? <PlayCircleIcon className="w-12 h-12 text-emerald-600 dark:text-emerald-500" /> : <PauseCircleIcon className="w-12 h-12 text-amber-600 dark:text-amber-500" />}
                                </div>
                                <div>
                                    <h4 className="text-slate-900 dark:text-white text-xl font-black mb-2">{isSuspended ? "Reactivar Servicio" : "Suspender Servicio"}</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm px-6">Estado actual en BD: <span className={`font-black uppercase ${isSuspended ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{estadoRaw}</span></p>
                                </div>
                                <button onClick={handleToggleSuspension} className={`w-full py-4 rounded-xl font-black text-white shadow-md transition-all active:scale-95 uppercase tracking-widest text-sm ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
                                    {isSuspended ? "CONFIRMAR REACTIVACIÓN" : "CONFIRMAR SUSPENSIÓN"}
                                </button>
                            </div>
                        )}

                        {mode === 'dar_de_baja' && (
                            <div className="space-y-6 text-center py-8 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10">
                                    <ArchiveBoxXMarkIcon className="w-12 h-12 text-orange-600 dark:text-orange-500" />
                                </div>
                                <div>
                                    <h4 className="text-slate-900 dark:text-white text-xl font-black mb-2">Dar de Baja Definitiva</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm px-4">
                                        Se dará de baja únicamente <strong>{servicioSeleccionado?.alias || 'el servicio principal'}</strong>, se detendrá su facturación y se liberarán sus recursos de red. Los demás domicilios y los adeudos se conservarán.
                                    </p>
                                </div>
                                <div className="space-y-3 text-left">
                                    <textarea
                                        value={bajaForm.motivo}
                                        onChange={(event) => setBajaForm({ ...bajaForm, motivo: event.target.value })}
                                        placeholder="Motivo de la baja *"
                                        rows={3}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none focus:border-orange-500"
                                    />
                                    <select
                                        value={bajaForm.tecnico_id}
                                        onChange={(event) => setBajaForm({ ...bajaForm, tecnico_id: event.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none"
                                    >
                                        <option value="">Retiro sin asignar</option>
                                        {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre_completo || tecnico.usuario}</option>)}
                                    </select>
                                    <input
                                        type="datetime-local"
                                        value={bajaForm.fecha_programada}
                                        onChange={(event) => setBajaForm({ ...bajaForm, fecha_programada: event.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none"
                                    />
                                    <textarea
                                        value={bajaForm.observaciones}
                                        onChange={(event) => setBajaForm({ ...bajaForm, observaciones: event.target.value })}
                                        placeholder="Observaciones opcionales"
                                        rows={2}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none"
                                    />
                                </div>
                                <button onClick={handleDarDeBaja} className="w-full py-4 rounded-xl font-black text-white shadow-md transition-all active:scale-95 bg-orange-600 hover:bg-orange-500 uppercase tracking-widest text-sm">
                                    PROCESAR BAJA DE SERVICIO
                                </button>
                            </div>
                        )}

                        {mode === 'estado_real' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className="flex flex-col items-center justify-center py-4">
                                    {dataEstado ? (
                                        <>
                                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 mb-4 ${dataEstado.online ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10' : 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'}`}>
                                                {dataEstado.online ? <CheckCircleIcon className="w-12 h-12 text-emerald-600 dark:text-emerald-500" /> : <NoSymbolIcon className="w-12 h-12 text-rose-600 dark:text-rose-500" />}
                                            </div>
                                            <h3 className={`text-2xl font-black mb-1 ${dataEstado.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{dataEstado.online ? 'ONLINE' : 'OFFLINE'}</h3>
                                            <p className="text-slate-500 text-xs font-black mb-6 uppercase tracking-widest">{dataEstado.metodo || 'Scan'}</p>
                                            
                                            <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 transition-colors">
                                                <DetailRow label="IP Actual" value={dataEstado.datos?.ip_actual || currentIp} icon={GlobeAmericasIcon} />
                                                <DetailRow label="Tiempo Activo" value={dataEstado.datos?.uptime} icon={ClockIcon} />
                                                {/* ❌ SE REMOVIÓ LA FILA DE LA DIRECCIÓN MAC */}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center text-slate-500">
                                            <ArrowPathIcon className="w-10 h-10 animate-spin mb-3 text-indigo-600 dark:text-indigo-500" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Diagnosticando red...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {mode === 'consumo_vivo' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className="grid grid-cols-2 gap-4 h-64">
                                    {(() => {
                                        // 🔥 SE INVIRTIERON LAS VARIABLES SEGÚN LO SOLICITADO 🔥
                                        const rawDown = dataConsumo?.velocidad_subida || 0; // Usando 'subida' para 'Bajada'
                                        const rawUp = dataConsumo?.velocidad_bajada || 0;   // Usando 'bajada' para 'Subida'
                                        
                                        const format = (b: number) => b >= 1000000 ? `${(b / 1000000).toFixed(1)} M` : `${(b / 1000).toFixed(0)} K`;
                                        return (
                                            <>
                                                <TrafficBar label="Bajada" value={format(rawDown)} raw={rawDown} color="cyan" icon={ArrowDownTrayIcon} />
                                                <TrafficBar label="Subida" value={format(rawUp)} raw={rawUp} color="purple" icon={ArrowUpTrayIcon} />
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {mode === 'eliminar' && (
                            <div className="space-y-6 text-center py-8 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-rose-200 dark:ring-rose-500/30">
                                    <TrashIcon className="w-10 h-10 text-rose-600 dark:text-rose-500" />
                                </div>
                                <div>
                                    <h4 className="text-slate-900 dark:text-white text-xl font-black mb-2">¿Eliminar Registro?</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 px-4 font-medium">Esta acción elimina definitivamente al cliente, sus facturas, pagos, bajas y demás historial. Si solo cambió de compañía y podría regresar, usa <strong>Dar de Baja</strong>.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button onClick={() => setMode('menu')} className="py-4 rounded-xl font-black uppercase tracking-widest text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                    <button onClick={handleEliminarCliente} className="py-4 rounded-xl font-black uppercase tracking-widest text-xs text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md">Eliminar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChatModal
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                cliente={{
                    id: clienteActual.id,
                    nombre: clienteActual.nombre || 'Cliente',
                    telefono: clienteActual.telefono || '',
                }}
            />
        </>
    );
}

// Componentes Auxiliares
const MenuButton = ({ icon: Icon, label, desc, variant = 'blue', badge = 0, onClick }: MenuButtonProps) => {
    const colorClasses: Record<MenuVariant, { btn: string; iconBg: string; icon: string }> = {
        blue: { btn: 'hover:border-blue-400 dark:hover:border-blue-500/50', iconBg: 'bg-blue-100 dark:bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400' },
        purple: { btn: 'hover:border-purple-400 dark:hover:border-purple-500/50', iconBg: 'bg-purple-100 dark:bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
        emerald: { btn: 'border-emerald-200 dark:border-emerald-500/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5', iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
        success: { btn: 'border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5', iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
        warning: { btn: 'border-amber-200 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500/50 bg-amber-50 dark:bg-amber-500/5', iconBg: 'bg-amber-100 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
        orange: { btn: 'border-orange-200 dark:border-orange-500/20 hover:border-orange-400 dark:hover:border-orange-500/50 bg-orange-50 dark:bg-orange-500/5', iconBg: 'bg-orange-100 dark:bg-orange-500/10', icon: 'text-orange-600 dark:text-orange-400' },
        danger: { btn: 'border-rose-200 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/50 bg-rose-50 dark:bg-rose-500/5', iconBg: 'bg-rose-100 dark:bg-rose-500/10', icon: 'text-rose-600 dark:text-rose-400' },
    };
    const colors = colorClasses[variant] || colorClasses.blue;
    return (
        <button onClick={onClick} className={`relative flex h-[108px] w-full flex-col items-start rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition-all group hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 sm:h-[120px] sm:p-4 ${colors.btn}`}>
            {badge > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-md animate-pulse ring-4 ring-white dark:ring-slate-900 z-10">
                    {badge}
                </span>
            )}
            <div className={`p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform duration-300 ${colors.iconBg}`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <span className="text-slate-900 dark:text-slate-200 font-black text-sm transition-colors">{label}</span>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold mt-0.5 leading-tight transition-colors">{desc}</span>
        </button>
    );
};

const BackButton = ({ onClick }: BackButtonProps) => (
    <button onClick={onClick} className="flex items-center text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4 gap-2 font-black transition-colors uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg w-fit">
        <ArrowLeftIcon className="w-3.5 h-3.5" /> Volver
    </button>
);

const DetailRow = ({ label, value, icon: Icon, monospace }: DetailRowProps) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800/50 last:border-0 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Icon className="w-4 h-4 text-slate-400" /> {label}
        </div>
        <span className={`text-slate-900 dark:text-slate-200 transition-colors ${monospace ? 'font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded' : 'text-sm font-black'}`}>
            {value || 'N/A'}
        </span>
    </div>
);

const TrafficBar = ({ label, value, raw, color, icon: Icon }: TrafficBarProps) => {
    const percent = Math.min((raw / 50000000) * 100, 100); 
    const barColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'; 
    const textColor = color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' : 'text-purple-600 dark:text-purple-400'; 
    return (
        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center justify-end relative overflow-hidden transition-colors">
            <div className={`absolute bottom-0 left-0 right-0 ${barColor} opacity-10 dark:opacity-20 transition-all duration-500`} style={{ height: `${percent}%` }}></div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${barColor} transition-all duration-500 shadow-[0_0_10px_currentColor]`} style={{ bottom: `${percent}%` }}></div>
            <div className="relative z-10 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-2 ${textColor}`} />
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">{value}</div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{label}</div>
            </div>
        </div>
    ); 
};
