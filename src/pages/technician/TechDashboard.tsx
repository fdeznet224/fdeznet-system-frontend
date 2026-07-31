import { useState, useEffect, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    QrCodeIcon, 
    MagnifyingGlassIcon,
    PowerIcon, 
    MapPinIcon, 
    ChatBubbleLeftRightIcon,
    HomeIcon,
    ClipboardDocumentListIcon,
    ArchiveBoxArrowDownIcon, 
    CheckBadgeIcon
} from '@heroicons/react/24/outline';

import ChatModal from '@/components/chat/ChatModal';
import { useSync } from '@/context/sync/context';
import { cachedRequest, notifySessionChanged } from '../../offline/db';
import { submitOperation } from '../../offline/sync';

interface TechnicianUser {
    id: number;
    usuario: string;
}

interface TechnicianClient {
    id: number;
    nombre: string;
    telefono: string;
    direccion?: string;
    estado: string;
    onu_asignada?: {
        id: number;
        identificador?: string;
        estado?: string;
    };
}

interface TechnicianOrder {
    id: number;
    tipo: string;
    estado: string;
    version: number;
    cliente_id?: number;
    prospecto_nombre?: string;
    prospecto_direccion?: string;
    cliente?: Pick<TechnicianClient, 'id' | 'nombre' | 'direccion'>;
    servicio?: {
        id: number;
        alias: string;
        direccion?: string | null;
        estado: string;
    } | null;
}

interface NavButtonProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    onClick: () => void;
}

function apiErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

export default function TechDashboard() {
    const navigate = useNavigate();
    const { online } = useSync();
    
    const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'retiros'>('inicio');
    
    const [instalaciones, setInstalaciones] = useState<TechnicianClient[]>([]);
    const [ordenes, setOrdenes] = useState<TechnicianOrder[]>([]);
    const [retiros, setRetiros] = useState<TechnicianClient[]>([]);
    const [user, setUser] = useState<TechnicianUser | null>(null);

    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<TechnicianClient | null>(null);
    const [retireConditions, setRetireConditions] = useState<Record<number, string>>({});

    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const u = JSON.parse(userJson) as TechnicianUser;
            setUser(u);
            fetchAllData(u.id);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const fetchAllData = async (tecnicoId: number) => {
        try {
            const [clientesResult, ordenesResult] = await Promise.all([
                cachedRequest<TechnicianClient[]>(`tech-clientes-${tecnicoId}`, async () => (
                    await client.get('/clientes/')
                ).data),
                cachedRequest<TechnicianOrder[]>(`tech-ordenes-${tecnicoId}`, async () => (
                    await client.get('/ordenes/')
                ).data),
            ]);
            const pendientes = clientesResult.data.filter((c) => c.estado === 'pendiente_instalacion');
            setInstalaciones(pendientes);

            const activeOrders = ordenesResult.data.filter((orden) =>
                !['terminada', 'cancelada'].includes(orden.estado)
            );
            const formalRetirementClients = new Set(
                activeOrders.filter((orden) => orden.tipo === 'retiro').map((orden) => orden.cliente_id),
            );
            const porRecoger = clientesResult.data.filter((c) =>
                c.onu_asignada?.estado === 'POR_RECOGER'
                && !formalRetirementClients.has(c.id)
            );
            setRetiros(porRecoger);
            setOrdenes(activeOrders);
            if (clientesResult.fromCache || ordenesResult.fromCache) {
                toast('Mostrando la última agenda guardada');
            }
        } catch {
            toast.error("No hay datos guardados para trabajar sin conexión");
        }
    };

    const handleConfirmarRetiro = async (cliente: TechnicianClient) => {
        if (!online) {
            toast.error('El retiro de inventario requiere conexión');
            return;
        }
        const t = toast.loading(`Liberando equipo de ${cliente.nombre}...`);
        try {
            if (!cliente.onu_asignada?.id) throw new Error('El cliente no tiene una ONU vinculada');
            await client.post(`/clientes/inventario/${cliente.onu_asignada.id}/confirmar-retiro-onu`);
            toast.dismiss(t);
            toast.success("¡Equipo en Stock! Puerto y IP liberados.");
            if (user) void fetchAllData(user.id);
        } catch (error: unknown) {
            toast.dismiss(t);
            toast.error(apiErrorMessage(error, "Error al retirar"));
        }
    };

    const handleConfirmarRetiroOrden = async (orden: TechnicianOrder) => {
        if (!online) return toast.error('El ingreso a inventario requiere conexión');
        const condicion = retireConditions[orden.id] || 'funcional';
        const observaciones = prompt('Observaciones del equipo recuperado (opcional):') || null;
        const loadingToast = toast.loading('Cerrando retiro e ingresando equipo...');
        try {
            await client.post(`/bajas/ordenes/${orden.id}/confirmar-retiro`, {
                condicion,
                observaciones,
            });
            setOrdenes((current) => current.filter((item) => item.id !== orden.id));
            toast.success('Retiro cerrado e inventario actualizado', { id: loadingToast });
        } catch (error: unknown) {
            toast.error(apiErrorMessage(error, 'No se pudo cerrar el retiro'), { id: loadingToast });
        }
    };

    const handleAvanzarOrden = async (orden: TechnicianOrder) => {
        const siguiente = orden.estado === 'asignada'
            ? 'en_camino'
            : orden.estado === 'en_camino'
                ? 'trabajando'
                : null;
        if (!siguiente) {
            toast('La finalización requiere conexión y evidencias actualizadas');
            return;
        }
        try {
            const result = await submitOperation(
                'orden_estado',
                {
                    orden_id: orden.id,
                    estado: siguiente,
                    version: orden.version,
                    comentario: online ? 'Avance desde PWA móvil' : 'Avance capturado sin conexión',
                },
                `Orden #${orden.id}: ${siguiente}`,
            );
            setOrdenes((current) => current.map((item) =>
                item.id === orden.id
                    ? { ...item, estado: siguiente, version: item.version + 1 }
                    : item
            ));
            toast.success(result.queued ? 'Avance guardado para sincronizar' : 'Avance registrado');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la orden');
        }
    };

    return (
        /* ✅ ADAPTADO: Fondo principal transiciona al tema elegido */
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden transition-colors duration-300">

            {/* HEADER ADAPTATIVO */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800/60 dark:bg-[#1a1f2e]/90 dark:shadow-lg sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-base text-white shadow-lg border border-purple-500/20 shrink-0">
                        {user?.usuario?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">FdezNet Tech</p>
                        <h1 className="text-sm font-black text-slate-800 dark:text-white leading-tight transition-colors">{user?.usuario}</h1>
                    </div>
                </div>
                <button
                    aria-label="Cerrar sesión"
                    onClick={() => { if (confirm("¿Cerrar sesión?")) { localStorage.clear(); notifySessionChanged(); navigate('/login'); } }}
                    className="app-icon-button hover:text-rose-500 dark:hover:text-rose-500"
                >
                    <PowerIcon className="w-5 h-5" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">

                {/* PESTAÑA: INICIO (KPIs + Acceso a Búsqueda) */}
                {activeTab === 'inicio' && (
                    <div className="animate-in fade-in duration-500 flex flex-col gap-4">
                        
                        {/* ACCESO RÁPIDO A BÚSQUEDA / ESCÁNER ADAPTATIVO */}
                        <div 
                            onClick={() => navigate('/tech/buscar')}
                            className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-lg cursor-pointer active:scale-95 transition-all group hover:border-emerald-500/30 dark:hover:border-emerald-500/30"
                        >
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">
                                <MagnifyingGlassIcon className="w-6 h-6" />
                                <span className="text-sm font-black tracking-tight">Buscar o escanear QR...</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                                <QrCodeIcon className="w-6 h-6" />
                            </div>
                        </div>

                        {/* TARJETAS DE KPIs ADAPTATIVAS */}
                        <div className="grid grid-cols-1 gap-4">
                            <div onClick={() => setActiveTab('agenda')} className="bg-white dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:to-[#0f1219] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-xl relative overflow-hidden active:scale-95 transition-all cursor-pointer group hover:border-purple-500/30 dark:hover:border-purple-500/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <span className="text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest transition-colors">Nuevas</span>
                                        <h2 className="text-5xl font-black text-slate-800 dark:text-white mt-1 transition-colors">{ordenes.length + instalaciones.length}</h2>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-wider transition-colors">Órdenes e instalaciones</p>
                                    </div>
                                    <ClipboardDocumentListIcon className="w-14 h-14 text-purple-600 dark:text-purple-500 opacity-20 dark:opacity-30 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>

                            <div onClick={() => setActiveTab('retiros')} className="bg-white dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:to-[#0f1219] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-xl relative overflow-hidden active:scale-95 transition-all cursor-pointer group hover:border-orange-500/30 dark:hover:border-orange-500/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <span className="text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-colors">Equipos</span>
                                        <h2 className="text-5xl font-black text-slate-800 dark:text-white mt-1 transition-colors">{retiros.length}</h2>
                                        <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-wider transition-colors">Bajas por recoger</p>
                                    </div>
                                    <ArchiveBoxArrowDownIcon className="w-14 h-14 text-orange-600 dark:text-orange-500 opacity-20 dark:opacity-30 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: AGENDA */}
                {activeTab === 'agenda' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 transition-colors">Agenda de Instalaciones</h3>
                        {ordenes.length === 0 && instalaciones.length === 0 && <p className="text-center text-slate-500 dark:text-slate-600 text-sm py-10 font-bold">Sin órdenes asignadas</p>}
                        {ordenes.map((orden) => (
                            <div key={`orden-${orden.id}`} className="bg-white dark:bg-[#1a1f2e] border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm space-y-3 relative">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full"></div>
                                <div className="pl-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-black text-slate-800 dark:text-white">{orden.cliente?.nombre || orden.prospecto_nombre || `Orden #${orden.id}`}</h4>
                                        <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">{orden.estado.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-slate-500 text-[10px] mt-1">
                                        #{orden.id} · {orden.tipo.replace('_', ' ')}
                                        {orden.servicio ? ` · ${orden.servicio.alias} (#${orden.servicio.id})` : ''}
                                    </p>
                                    <p className="text-slate-500 text-[10px] mt-1 flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> {orden.servicio?.direccion || orden.cliente?.direccion || orden.prospecto_direccion || 'Sin dirección'}</p>
                                </div>
                                {orden.tipo === 'retiro' && orden.estado === 'trabajando' ? (
                                    <div className="ml-2 space-y-2">
                                        <select
                                            value={retireConditions[orden.id] || 'funcional'}
                                            onChange={(event) => setRetireConditions({ ...retireConditions, [orden.id]: event.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        >
                                            <option value="funcional">ONU funcional</option>
                                            <option value="danada">ONU dañada</option>
                                            <option value="incompleta">ONU incompleta</option>
                                            <option value="perdida">Equipo no recuperado</option>
                                        </select>
                                        <button type="button" onClick={() => void handleConfirmarRetiroOrden(orden)} className="h-11 w-full rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white active:scale-95">
                                            Confirmar retiro
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void handleAvanzarOrden(orden)}
                                        className="ml-2 w-[calc(100%-0.5rem)] h-11 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest active:scale-95"
                                    >
                                        {orden.estado === 'asignada' ? 'Marcar en camino' : orden.estado === 'en_camino' ? 'Iniciar trabajo' : 'Finalizar con conexión'}
                                    </button>
                                )}
                            </div>
                        ))}
                        {instalaciones.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm dark:shadow-lg space-y-4 relative transition-colors">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-purple-500 rounded-r-full"></div>
                                <div className="pl-2">
                                    <h4 className="font-black text-slate-800 dark:text-white transition-colors">{item.nombre}</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.direccion}</span></p>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <button onClick={() => { setTargetCliente(item); setShowChatModal(true); }} className="flex-1 h-11 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/10 transition-colors active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" /></button>
                                    <button onClick={() => navigate(`/tech/instalar/${item.id}`)} className="flex-[3] h-11 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md">Instalar Servicio</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PESTAÑA: RETIROS */}
                {activeTab === 'retiros' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
                        <h3 className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest px-1 transition-colors">Retiro de Equipos</h3>
                        {retiros.length === 0 && <p className="text-center text-slate-500 dark:text-slate-600 text-sm py-10 font-bold">Sin retiros pendientes</p>}
                        {retiros.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm dark:shadow-lg space-y-4 relative transition-colors">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-orange-500 rounded-r-full"></div>
                                <div className="pl-2">
                                    <h4 className="font-black text-slate-800 dark:text-white transition-colors">{item.nombre}</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.direccion}</span></p>
                                    <div className="mt-3 bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-orange-500/10 transition-colors">
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">SN a retirar:</p>
                                        <p className="text-sm font-mono text-orange-600 dark:text-orange-400 font-black tracking-widest transition-colors">{item.onu_asignada?.identificador || 'S/N'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <button onClick={() => { setTargetCliente(item); setShowChatModal(true); }} className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/10 transition-colors active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" /></button>
                                    <button
                                        onClick={() => { if (confirm(`¿Confirmas retiro de ${item.nombre}?`)) handleConfirmarRetiro(item); }}
                                        className="flex-[3] h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                                    >
                                        Confirmar Recojo <CheckBadgeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* NAV INFERIOR ADAPTATIVO */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/92 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-15px_35px_-28px_rgba(15,23,42,.55)] backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-[#161b28]/92">
                <NavButton icon={HomeIcon} label="Inicio" active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />
                <NavButton icon={ClipboardDocumentListIcon} label="Agenda" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
                <NavButton icon={ArchiveBoxArrowDownIcon} label="Retiros" active={activeTab === 'retiros'} onClick={() => setActiveTab('retiros')} />
            </div>

            <ChatModal isOpen={showChatModal} onClose={() => setShowChatModal(false)} cliente={targetCliente} />
        </div>
    );
}

const NavButton = ({ icon: Icon, label, active, onClick }: NavButtonProps) => (
    <button onClick={onClick} className={`flex min-h-12 min-w-20 flex-col items-center justify-center rounded-2xl p-2 transition-all active:scale-95 ${active ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}>
        <Icon className="w-6 h-6" />
        <span className="text-[8px] font-black uppercase tracking-widest mt-1">{label}</span>
    </button>
);
