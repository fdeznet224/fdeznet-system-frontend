import { useState, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon, WrenchScrewdriverIcon, ServerIcon,
    PresentationChartLineIcon, ChatBubbleLeftRightIcon,
    PauseCircleIcon, PlayCircleIcon, ArrowLeftIcon,
    TrashIcon, ArrowPathIcon,
    GlobeAmericasIcon, CheckCircleIcon, NoSymbolIcon,
    ClockIcon, ArrowDownTrayIcon, ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import type { Cliente } from '../../types';

// 👇 IMPORTAMOS EL NUEVO COMPONENTE DEL CHAT 👇
import ChatModal from '../ChatModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cliente: Cliente | null;
    onActionSuccess: () => void;
}

type ToolMode = 'menu' | 'estado_real' | 'consumo_vivo' | 'suspender_reactivar' | 'eliminar';

// Helper para el tiempo de espera (Misma lógica que en la tabla)
const calcularTiempoEspera = (fechaIso: string) => {
    if (!fechaIso) return "";
    const inicio = new Date(fechaIso).getTime();
    const ahora = new Date().getTime();
    const difMinutos = Math.floor((ahora - inicio) / 60000);
    if (difMinutos < 1) return "Ahora";
    if (difMinutos < 60) return `${difMinutos} min`;
    const horas = Math.floor(difMinutos / 60);
    return horas < 24 ? `${horas} hr` : `${Math.floor(horas / 24)} d`;
};

export default function ClientToolsModal({ isOpen, onClose, cliente: clienteProp, onActionSuccess }: Props) {
    const [mode, setMode] = useState<ToolMode>('menu');
    const [clienteActual, setClienteActual] = useState<Cliente | null>(clienteProp);
    const [dataEstado, setDataEstado] = useState<any>(null);
    const [dataConsumo, setDataConsumo] = useState<any>(null);
    const [showChatModal, setShowChatModal] = useState(false);

    // 👇 ESTADO PARA NOTIFICACIÓN ESPECÍFICA 👇
    const [unreadInfo, setUnreadInfo] = useState<{ count: number, antiguedad: string } | null>(null);

    const refreshClienteData = useCallback(async () => {
        if (!clienteProp?.id) return;
        try {
            const res = await client.get(`/clientes/${clienteProp.id}`);
            setClienteActual(res.data);

            // ✅ NUEVO: Consultar si este cliente tiene mensajes pendientes
            const resUnread = await client.get('/whatsapp/no-leidos');
            if (resUnread.data[clienteProp.id]) {
                setUnreadInfo(resUnread.data[clienteProp.id]);
            } else {
                setUnreadInfo(null);
            }
        } catch (error) {
            console.error("Error actualizando datos", error);
        }
    }, [clienteProp?.id]);

    useEffect(() => {
        if (isOpen && clienteProp) {
            setMode('menu');
            setDataEstado(null);
            setDataConsumo(null);
            setShowChatModal(false);
            setClienteActual(clienteProp);
            refreshClienteData();
        }
    }, [isOpen, clienteProp, refreshClienteData]);

    const estadoRaw = clienteActual?.estado?.toLowerCase() || '';
    const isSuspended = ['suspendido', 'cortado', 'retirado', 'inactivo'].includes(estadoRaw);

    useEffect(() => {
        let interval: any;
        if (isOpen && clienteActual) {
            if (mode === 'estado_real') {
                setDataEstado(null);
                const fetchEstado = async () => {
                    try {
                        const res = await client.get(`/network/diagnostico/conexion/${clienteActual.id}`);
                        setDataEstado(res.data);
                    } catch (e) {
                        setDataEstado({ online: false, metodo: "ERROR", datos: { info: "Sin respuesta" } });
                    }
                };
                fetchEstado();
            }
            if (mode === 'consumo_vivo') {
                const fetchConsumo = async () => {
                    try {
                        const res = await client.get(`/network/diagnostico/trafico/${clienteActual.id}`);
                        setDataConsumo(res.data);
                    } catch (e) { console.error(e); }
                };
                fetchConsumo();
                interval = setInterval(fetchConsumo, 2000);
            }
        }
        return () => clearInterval(interval);
    }, [mode, isOpen, clienteActual]);

    const handleToggleSuspension = async () => {
        if (!clienteActual) return;
        const nuevoEstado = isSuspended ? 'activo' : 'suspendido';
        const loadToast = toast.loading(isSuspended ? "Reactivando..." : "Suspendiendo...");
        try {
            await client.put(`/clientes/${clienteActual.id}/estado`, { nuevo_estado: nuevoEstado });
            toast.dismiss(loadToast);
            toast.success(isSuspended ? "¡Servicio Reactivado!" : "Servicio Suspendido");
            await refreshClienteData();
            onActionSuccess();
        } catch (error) {
            toast.dismiss(loadToast);
            toast.error("Error en Router");
        }
    };

    const handleEliminarCliente = async () => {
        if (!clienteActual) return;
        try {
            toast.loading("Eliminando...");
            await client.delete(`/clientes/${clienteActual.id}`);
            toast.dismiss(); toast.success("Eliminado"); onActionSuccess(); onClose();
        } catch (error) { toast.dismiss(); toast.error("Error"); }
    };

    if (!isOpen || !clienteActual) return null;

    return (
        <>
            <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ${showChatModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                    {/* HEADER */}
                    <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <WrenchScrewdriverIcon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base leading-tight">Herramientas</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-500 text-xs font-mono">{clienteActual.ip_asignada}</p>
                                    {isSuspended ? (
                                        <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold uppercase">Suspendido</span>
                                    ) : (
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">Activo</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* BODY */}
                    <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-900">

                        {mode === 'menu' && (
                            <div className="grid grid-cols-2 gap-3">
                                <MenuButton icon={ServerIcon} label="Estado" desc="Ping" variant="blue" onClick={() => setMode('estado_real')} />
                                <MenuButton icon={PresentationChartLineIcon} label="Tráfico" desc="En vivo" variant="purple" onClick={() => setMode('consumo_vivo')} />

                                {/* 👇 BOTÓN DE MENSAJE CORREGIDO 👇 */}
                                <div className="relative h-full">
                                    <MenuButton
                                        icon={ChatBubbleLeftRightIcon}
                                        label="Mensaje"
                                        desc={unreadInfo ? `Esperando ${calcularTiempoEspera(unreadInfo.antiguedad)}` : "WhatsApp"}
                                        variant={unreadInfo ? "danger" : "emerald"}
                                        onClick={() => setShowChatModal(true)}
                                    />
                                    {/* Globo rojo posicionado correctamente sobre el icono */}
                                    {unreadInfo && (
                                        <div className="absolute top-6 left-10 flex h-5 w-5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 text-[10px] flex items-center justify-center font-black text-white border-2 border-slate-900">
                                                {unreadInfo.count}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <MenuButton
                                    icon={isSuspended ? PlayCircleIcon : PauseCircleIcon}
                                    label={isSuspended ? "Reactivar" : "Suspender"}
                                    desc={isSuspended ? "Habilitar Internet" : "Cortar Internet"}
                                    variant={isSuspended ? "success" : "danger"}
                                    onClick={() => setMode('suspender_reactivar')}
                                />

                                <button onClick={() => setMode('eliminar')} className="col-span-2 mt-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 flex items-center justify-center gap-2 transition-all group">
                                    <TrashIcon className="w-5 h-5 group-hover:scale-110" /> <span className="font-bold text-sm">Eliminar Cliente</span>
                                </button>
                            </div>
                        )}

                        {/* ... Resto de los modos (suspender, estado_real, consumo, eliminar) quedan igual ... */}
                        {mode === 'suspender_reactivar' && (
                            <div className="space-y-6 text-center py-8 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${isSuspended ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}>
                                    {isSuspended ? <PlayCircleIcon className="w-12 h-12 text-emerald-500" /> : <PauseCircleIcon className="w-12 h-12 text-rose-500" />}
                                </div>
                                <div>
                                    <h4 className="text-white text-xl font-bold mb-2">{isSuspended ? "Reactivar Servicio" : "Suspender Servicio"}</h4>
                                    <p className="text-slate-400 text-sm px-6">Estado actual en BD: <span className={`font-bold uppercase ${isSuspended ? 'text-rose-400' : 'text-emerald-400'}`}>{estadoRaw}</span></p>
                                </div>
                                <button onClick={handleToggleSuspension} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition active:scale-95 ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>
                                    {isSuspended ? "CONFIRMAR REACTIVACIÓN" : "CONFIRMAR CORTE"}
                                </button>
                            </div>
                        )}

                        {mode === 'estado_real' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <BackButton onClick={() => setMode('menu')} />
                                <div className="flex flex-col items-center justify-center py-4">
                                    {dataEstado ? (
                                        <>
                                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 mb-4 ${dataEstado.online ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                                                {dataEstado.online ? <CheckCircleIcon className="w-12 h-12 text-emerald-500" /> : <NoSymbolIcon className="w-12 h-12 text-rose-500" />}
                                            </div>
                                            <h3 className={`text-2xl font-bold mb-1 ${dataEstado.online ? 'text-emerald-400' : 'text-rose-400'}`}>{dataEstado.online ? 'ONLINE' : 'OFFLINE'}</h3>
                                            <p className="text-slate-500 text-xs font-mono mb-6 uppercase tracking-wider">{dataEstado.metodo || 'Scan'}</p>
                                            <div className="w-full bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                                                <DetailRow label="IP Actual" value={dataEstado.datos?.ip_actual || clienteActual.ip_asignada} icon={GlobeAmericasIcon} />
                                                <DetailRow label="Tiempo Activo" value={dataEstado.datos?.uptime} icon={ClockIcon} />
                                                <DetailRow label="Dirección MAC" value={dataEstado.datos?.mac} icon={ServerIcon} monospace />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center text-slate-500">
                                            <ArrowPathIcon className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                                            <p className="text-sm font-medium">Diagnosticando red...</p>
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
                                        const rawDown = dataConsumo?.velocidad_bajada || 0;
                                        const rawUp = dataConsumo?.velocidad_subida || 0;
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
                                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-rose-500/30"><TrashIcon className="w-10 h-10 text-rose-500" /></div>
                                <div><h4 className="text-white text-xl font-bold">¿Eliminar Cliente?</h4><p className="text-slate-400 text-sm mt-2 px-4">Esta acción no se puede deshacer.</p></div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button onClick={() => setMode('menu')} className="py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700">Cancelar</button>
                                    <button onClick={handleEliminarCliente} className="py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500">Eliminar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChatModal
                isOpen={showChatModal}
                onClose={() => { setShowChatModal(false); refreshClienteData(); }}
                cliente={clienteActual as any}
            />
        </>
    );
}

// Componentes Auxiliares
const MenuButton = ({ icon: Icon, label, desc, variant = 'blue', onClick }: any) => {
    const colorClasses: any = {
        blue: { btn: 'hover:border-blue-500/50', iconBg: 'bg-blue-500/10', icon: 'text-blue-400' },
        purple: { btn: 'hover:border-purple-500/50', iconBg: 'bg-purple-500/10', icon: 'text-purple-400' },
        emerald: { btn: 'hover:border-emerald-500/50 border-emerald-500/10 bg-emerald-500/5', iconBg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
        success: { btn: 'hover:border-emerald-500/50 border-emerald-500/20 bg-emerald-500/5', iconBg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
        danger: { btn: 'hover:border-rose-500/50 border-rose-500/20 bg-rose-500/5', iconBg: 'bg-rose-500/10', icon: 'text-rose-400' },
    };
    const colors = colorClasses[variant] || colorClasses.blue;
    return (
        <button onClick={onClick} className={`flex flex-col items-start p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all group text-left w-full h-[120px] ${colors.btn}`}>
            <div className={`p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform duration-300 ${colors.iconBg}`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <span className="text-slate-200 font-bold text-sm">{label}</span>
            <span className="text-slate-500 text-[10px] mt-0.5 leading-tight">{desc}</span>
        </button>
    );
};

const BackButton = ({ onClick }: any) => (<button onClick={onClick} className="flex items-center text-xs text-slate-400 hover:text-white mb-2 gap-2 font-bold transition-colors uppercase tracking-wider"><ArrowLeftIcon className="w-4 h-4" /> Volver</button>);
const DetailRow = ({ label, value, icon: Icon, monospace }: any) => (<div className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0"><div className="flex items-center gap-2 text-slate-400 text-sm"><Icon className="w-4 h-4 text-slate-600" /> {label}</div><span className={`text-slate-200 ${monospace ? 'font-mono text-xs' : 'text-sm font-medium'}`}>{value || 'N/A'}</span></div>);
const TrafficBar = ({ label, value, raw, color, icon: Icon }: any) => { const percent = Math.min((raw / 50000000) * 100, 100); const barColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'; const textColor = color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'; return (<div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-end relative overflow-hidden"><div className={`absolute bottom-0 left-0 right-0 ${barColor}/20 transition-all duration-500`} style={{ height: `${percent}%` }}></div><div className={`absolute bottom-0 left-0 right-0 h-1 ${barColor} transition-all duration-500 shadow-[0_0_15px_currentColor]`} style={{ bottom: `${percent}%` }}></div><div className="relative z-10 text-center"><Icon className={`w-6 h-6 mx-auto mb-2 ${textColor}`} /><div className="text-2xl font-bold text-white tracking-tighter">{value}</div><div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{label}</div></div></div>); };