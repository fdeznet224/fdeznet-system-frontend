import { useState, useEffect, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {

    PowerIcon, 
    MapPinIcon, 
    ChatBubbleLeftRightIcon,
    HomeIcon,
    ClipboardDocumentListIcon,
    ArchiveBoxArrowDownIcon, 
    CheckBadgeIcon,
    ChevronRightIcon,
    PlusIcon,
    MapIcon,
} from '@heroicons/react/24/outline';

import ChatModal from '@/components/chat/ChatModal';
import { rutaEnMaps } from '@/utils/mapas';
import ContratosApartados from './ContratosApartados';
import BuscadorClientes from './BuscadorClientes';
import { useSync } from '@/context/sync/context';
import { useBrand } from '@/context/brand/useBrand';
import { cachedRequest, notifySessionChanged } from '../../offline/db';
import { submitOperation } from '../../offline/sync';
import { apiErrorMessage } from '@/utils/apiError';
import { CATEGORIAS_FALLA } from '@/utils/categoriasFalla';
import FinalizarReparacion from './FinalizarReparacion';
import RutaReparacion from './RutaReparacion';
import DatosReparacion from './DatosReparacion';
import { BOTON_EXITO, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, TARJETA, TITULO_SECCION } from './estilo';

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
    fecha_programada?: string | null;
    cliente_id?: number;
    prospecto_nombre?: string;
    prospecto_direccion?: string;
    cliente?: Pick<TechnicianClient, 'id' | 'nombre' | 'direccion'> & { contrato?: string | null; telefono?: string | null; latitud?: number | null; longitud?: number | null };
    prospecto_telefono?: string | null;
    prioridad?: string;
    categoria_soporte?: string | null;
    descripcion?: string | null;
    servicio?: {
        id: number;
        alias: string;
        direccion?: string | null;
        estado: string;
        latitud?: number | null;
        longitud?: number | null;
    } | null;
}

// Reparación: reporte de falla o cambio de domicilio (no instalación ni retiro).
const esReparacion = (orden: TechnicianOrder) => (
    Boolean(orden.categoria_soporte) || orden.tipo === 'reparacion' || orden.tipo === 'cambio_domicilio'
);
const URGENCIA: Record<string, number> = { urgente: 0, alta: 1 };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

interface NavButtonProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    badge?: number;
    onClick: () => void;
}

export default function TechDashboard() {
    const navigate = useNavigate();
    const { online } = useSync();
    const { brand } = useBrand();
    
    const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'ruta' | 'retiros'>('inicio');
    
    const [instalaciones, setInstalaciones] = useState<TechnicianClient[]>([]);
    const [ordenes, setOrdenes] = useState<TechnicianOrder[]>([]);
    const [user] = useState<TechnicianUser | null>(() => {
        try {
            const guardado = localStorage.getItem('user');
            return guardado ? JSON.parse(guardado) as TechnicianUser : null;
        } catch {
            return null;
        }
    });

    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<TechnicianClient | null>(null);
    const [chatOrden, setChatOrden] = useState<TechnicianOrder | null>(null);
    const [retireConditions, setRetireConditions] = useState<Record<number, string>>({});

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
            const activeOrders = ordenesResult.data.filter((orden) =>
                !['terminada', 'cancelada'].includes(orden.estado)
            );
            // Un cliente con orden de instalación ya aparece como orden; no se repite.
            const conOrden = new Set(activeOrders.map((orden) => orden.cliente_id ?? orden.cliente?.id));
            const pendientes = clientesResult.data.filter((c) =>
                c.estado === 'pendiente_instalacion' && !conOrden.has(c.id)
            );
            setInstalaciones(pendientes);
            setOrdenes(activeOrders);
            if (clientesResult.fromCache || ordenesResult.fromCache) {
                toast('Mostrando la última agenda guardada');
            }
        } catch {
            toast.error("No hay datos guardados para trabajar sin conexión");
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        const initialLoad = window.setTimeout(() => void fetchAllData(user.id), 0);
        return () => window.clearTimeout(initialLoad);
    }, [navigate, user]);

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
            const aviso = siguiente === 'en_camino' ? ' · el cliente recibirá un WhatsApp de que vas en camino' : '';
            toast.success((result.queued ? 'Avance guardado para sincronizar' : 'Avance registrado') + aviso);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la orden');
        }
    };

    // Primero las urgentes; luego las que tienen visita, por hora; al final las que no tienen fecha.
    const ordenesAgenda = ordenes
        .filter((orden) => orden.tipo !== 'retiro')
        .sort((a, b) => (
            (URGENCIA[a.prioridad || ''] ?? 2) - (URGENCIA[b.prioridad || ''] ?? 2)
            || (a.fecha_programada || '9999').localeCompare(b.fecha_programada || '9999')
        ));
    const ordenesRetiro = ordenes.filter((orden) => orden.tipo === 'retiro');
    const totalReparaciones = ordenesAgenda.filter(esReparacion).length;
    const totalInstalaciones = ordenesAgenda.length - totalReparaciones + instalaciones.length;
    const proxima = ordenesAgenda[0];
    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const hoyTexto = hoy.charAt(0).toUpperCase() + hoy.slice(1);

    // Coordinar la visita: escribirle por WhatsApp y abrir la ruta en Google Maps.
    const renderContacto = (orden: TechnicianOrder) => {
        const ruta = rutaEnMaps({
            latitud: orden.servicio?.latitud ?? orden.cliente?.latitud,
            longitud: orden.servicio?.longitud ?? orden.cliente?.longitud,
            direccion: orden.servicio?.direccion || orden.cliente?.direccion || orden.prospecto_direccion,
        });
        const nombre = orden.cliente?.nombre || orden.prospecto_nombre || `Orden #${orden.id}`;
        return (
            <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-label={`WhatsApp a ${nombre}`} onClick={() => setChatOrden(orden)} className={BOTON_SECUNDARIO}>
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-600" /> WhatsApp
                </button>
                {ruta ? (
                    <a href={ruta} target="_blank" rel="noreferrer" aria-label={`Cómo llegar con ${nombre}`} className={BOTON_SECUNDARIO}>
                        <MapPinIcon className="h-4 w-4 text-blue-600" /> Cómo llegar
                    </a>
                ) : (
                    <span className="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">Sin ubicación</span>
                )}
            </div>
        );
    };

    const ESTADO_TEXTO: Record<string, string> = { asignada: 'Asignada', en_camino: 'En camino', trabajando: 'Trabajando', pendiente: 'Pendiente' };

    const renderOrden = (orden: TechnicianOrder) => {
        const reparacion = esReparacion(orden);
        const tipo = orden.tipo === 'retiro'
            ? { texto: 'Retiro', punto: 'bg-orange-500', color: 'text-orange-600 dark:text-orange-400' }
            : reparacion
                ? { texto: orden.tipo === 'cambio_domicilio' ? '🔧 Cambio de domicilio' : '🔧 Reparación', punto: 'bg-rose-500', color: 'text-rose-600 dark:text-rose-400' }
                : { texto: 'Instalación', punto: 'bg-blue-500', color: 'text-blue-600 dark:text-blue-400' };
        const direccion = (orden.servicio?.direccion || orden.cliente?.direccion || orden.prospecto_direccion || 'Sin dirección').replace(/\s*·?\s*https?:\/\/\S+/g, '');
        const urgente = orden.prioridad === 'alta' || orden.prioridad === 'urgente';
        const conPanel = reparacion && orden.estado !== 'asignada' && Boolean(orden.cliente?.contrato);
        return (
        <article key={`orden-${orden.id}`} className={`${TARJETA} space-y-3 p-4`}>
            <div>
                <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${tipo.color}`}>
                        <span className={`h-2 w-2 rounded-full ${tipo.punto}`} />{tipo.texto}
                        {urgente && <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{orden.prioridad}</span>}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ESTADO_TEXTO[orden.estado] || orden.estado.replace('_', ' ')}</span>
                </div>
                <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{orden.cliente?.nombre || orden.prospecto_nombre || `Orden #${orden.id}`}</h4>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-2">{direccion}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                    #{orden.id}
                    {orden.servicio ? ` · ${orden.servicio.alias}` : ''}
                    {orden.fecha_programada && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {' · '}Visita {new Date(orden.fecha_programada).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} {orden.fecha_programada.slice(11, 16)}
                        </span>
                    )}
                </p>
                {orden.categoria_soporte && (
                    // Reparación: qué falla y qué le pidieron hacer (incluye la revisión remota).
                    <div className="mt-3 rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">🔧 {CATEGORIAS_FALLA[orden.categoria_soporte] || orden.categoria_soporte}</p>
                        {orden.descripcion && <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300">{orden.descripcion}</p>}
                    </div>
                )}
            </div>
            {renderContacto(orden)}
            {conPanel && orden.cliente?.contrato && (
                // Ya en camino: revisión según la falla, PPPoE, ONU y potencia a la mano,
                // corregir sus datos y (trabajando) terminar la reparación.
                <DatosReparacion
                    ordenId={orden.id}
                    contrato={orden.cliente.contrato}
                    online={online}
                    categoria={orden.categoria_soporte}
                    estado={orden.estado}
                    onTerminada={() => setOrdenes((current) => current.filter((item) => item.id !== orden.id))}
                />
            )}
            {orden.tipo === 'retiro' ? (
                // Retiro: solo ir a recoger el equipo, sin "en camino" ni "iniciar".
                <div className="space-y-2">
                    <select
                        aria-label="Estado del equipo recogido"
                        value={retireConditions[orden.id] || 'funcional'}
                        onChange={(event) => setRetireConditions({ ...retireConditions, [orden.id]: event.target.value })}
                        className={CAMPO}
                    >
                        <option value="funcional">ONU funcional</option>
                        <option value="danada">ONU dañada</option>
                        <option value="incompleta">ONU incompleta</option>
                        <option value="perdida">Equipo no recuperado</option>
                    </select>
                    <button type="button" onClick={() => void handleConfirmarRetiroOrden(orden)} className={BOTON_EXITO}>
                        <CheckBadgeIcon className="h-5 w-5" /> Equipo recogido
                    </button>
                </div>
            ) : orden.tipo === 'instalacion' ? (
                // Instalación: primero "en camino" (avisa al cliente) y luego activar.
                orden.estado === 'asignada' ? (
                    <button type="button" onClick={() => void handleAvanzarOrden(orden)} className={BOTON_PRIMARIO}>
                        Marcar en camino
                    </button>
                ) : (
                    <button type="button" onClick={() => navigate(`/tech/activar/${orden.id}`)} className={BOTON_EXITO}>
                        Activar cliente
                    </button>
                )
            ) : orden.categoria_soporte && orden.estado === 'trabajando' ? (
                conPanel ? null : <FinalizarReparacion
                    ordenId={orden.id}
                    online={online}
                    onTerminada={() => setOrdenes((current) => current.filter((item) => item.id !== orden.id))}
                />
            ) : (
                <button type="button" onClick={() => void handleAvanzarOrden(orden)} className={BOTON_PRIMARIO}>
                    {orden.estado === 'asignada' ? 'Marcar en camino' : orden.estado === 'en_camino' ? 'Iniciar trabajo' : 'Finalizar con conexión'}
                </button>
            )}
        </article>
        );
    };

    return (
        /* ✅ ADAPTADO: Fondo principal transiciona al tema elegido */
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden transition-colors duration-300">

            {/* HEADER ADAPTATIVO */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800/60 dark:bg-[#1a1f2e]/90 dark:shadow-lg sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-900">
                        {user?.usuario?.charAt(0) || 'T'}
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">{brand.empresa_nombre} Tech</p>
                        <h1 className="text-sm font-black text-slate-800 dark:text-white leading-tight transition-colors">{user?.usuario}</h1>
                    </div>
                </div>
                <button
                    aria-label="Cerrar sesión"
                    onClick={() => { if (confirm("¿Cerrar sesión?")) { void client.post('/auth/logout').finally(() => { localStorage.clear(); notifySessionChanged(); navigate('/login'); }); } }}
                    className="app-icon-button hover:text-rose-500 dark:hover:text-rose-500"
                >
                    <PowerIcon className="w-5 h-5" />
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">

                {/* PESTAÑA: INICIO */}
                {activeTab === 'inicio' && (
                    <div className="animate-in fade-in duration-300 flex flex-col gap-3">
                        <div className="px-1">
                            <p className="text-xs font-medium text-slate-400">{hoyTexto}</p>
                            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Hola, {user?.usuario}</h2>
                        </div>

                        <BuscadorClientes />
                        <ContratosApartados />

                        {/* Resumen del día */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setActiveTab('agenda')}
                                className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition active:scale-[0.98] dark:border-slate-800 dark:bg-[#161b28]"
                            >
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <ClipboardDocumentListIcon className="h-4 w-4" /> Mi agenda
                                </span>
                                <span className="mt-1 block text-3xl font-black text-slate-900 dark:text-white">{ordenesAgenda.length + instalaciones.length}</span>
                                <span className="mt-1 block text-[11px] font-semibold leading-tight">
                                    <span className="text-blue-600 dark:text-blue-400">{plural(totalInstalaciones, 'instalación', 'instalaciones')}</span>
                                    <br />
                                    <span className="text-rose-600 dark:text-rose-400">{plural(totalReparaciones, 'reparación', 'reparaciones')}</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('retiros')}
                                className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition active:scale-[0.98] dark:border-slate-800 dark:bg-[#161b28]"
                            >
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <ArchiveBoxArrowDownIcon className="h-4 w-4" /> Retiros
                                </span>
                                <span className="mt-1 block text-3xl font-black text-slate-900 dark:text-white">{ordenesRetiro.length}</span>
                                <span className="mt-1 block text-[11px] font-semibold leading-tight text-orange-600 dark:text-orange-400">Bajas por recoger</span>
                            </button>
                        </div>

                        {/* Lo siguiente que le toca: la urgente o la próxima visita */}
                        {proxima && (
                            <button
                                type="button"
                                aria-label={`Lo siguiente: ${proxima.cliente?.nombre || proxima.prospecto_nombre || `Orden #${proxima.id}`}`}
                                onClick={() => setActiveTab('agenda')}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition active:scale-[0.98] dark:border-slate-800 dark:bg-[#161b28]"
                            >
                                <span className={`h-10 w-1 shrink-0 rounded-full ${esReparacion(proxima) ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Lo siguiente · {esReparacion(proxima) ? 'Reparación' : 'Instalación'}
                                        {URGENCIA[proxima.prioridad || ''] !== undefined && <span className="ml-1 text-rose-600">· {proxima.prioridad}</span>}
                                    </span>
                                    <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{proxima.cliente?.nombre || proxima.prospecto_nombre || `Orden #${proxima.id}`}</span>
                                    <span className="block truncate text-[11px] text-slate-500">
                                        {proxima.fecha_programada
                                            ? `${new Date(proxima.fecha_programada).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · ${proxima.fecha_programada.slice(11, 16)}`
                                            : (proxima.servicio?.direccion || proxima.cliente?.direccion || proxima.prospecto_direccion || 'Sin fecha de visita').replace(/\s*·?\s*https?:\/\/\S+/g, '')}
                                    </span>
                                </span>
                                <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-300" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => navigate('/tech/activar/nueva')}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-xs font-black uppercase tracking-wider text-white transition active:scale-[0.98] dark:bg-white dark:text-slate-900"
                        >
                            <PlusIcon className="h-5 w-5" /> Nueva instalación
                        </button>
                    </div>
                )}

                {/* PESTAÑA: AGENDA */}
                {activeTab === 'agenda' && (
                    <div className="animate-in fade-in duration-300 space-y-3">
                        <div className="flex items-baseline justify-between px-1">
                            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Mi agenda</h2>
                            <span className="text-xs font-semibold text-slate-400">
                                {plural(totalInstalaciones, 'instalación', 'instalaciones')} · {plural(totalReparaciones, 'reparación', 'reparaciones')}
                            </span>
                        </div>
                        {ordenesAgenda.length === 0 && instalaciones.length === 0 && (
                            <div className={`${TARJETA} flex flex-col items-center gap-2 py-12 text-center`}>
                                <ClipboardDocumentListIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                <p className="text-sm font-semibold text-slate-500">Sin órdenes asignadas</p>
                            </div>
                        )}
                        {ordenesAgenda.map(renderOrden)}
                        {instalaciones.length > 0 && <p className={`${TITULO_SECCION} pt-2`}>Clientes por instalar</p>}
                        {instalaciones.map((item) => (
                            <article key={item.id} className={`${TARJETA} space-y-3 p-4`}>
                                <div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />Instalación
                                    </span>
                                    <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{item.nombre}</h4>
                                    <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                                        <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-2">{item.direccion || 'Sin dirección'}</span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-[auto_1fr] gap-2">
                                    <button type="button" aria-label={`WhatsApp a ${item.nombre}`} onClick={() => { setTargetCliente(item); setShowChatModal(true); }} className={`${BOTON_SECUNDARIO} h-11 w-12`}>
                                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-emerald-600" />
                                    </button>
                                    <button type="button" onClick={() => navigate(`/tech/instalar/${item.id}`)} className={BOTON_PRIMARIO}>Instalar servicio</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* PESTAÑA: RUTA (clientes con la potencia alta cerca) */}
                {activeTab === 'ruta' && (
                    <div className="animate-in fade-in duration-300">
                        <RutaReparacion online={online} onAgendada={() => user && void fetchAllData(user.id)} />
                    </div>
                )}

                {/* PESTAÑA: RETIROS */}
                {activeTab === 'retiros' && (
                    <div className="animate-in fade-in duration-300 space-y-3">
                        <div className="flex items-baseline justify-between px-1">
                            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Retiros</h2>
                            <span className="text-xs font-semibold text-slate-400">{plural(ordenesRetiro.length, 'equipo por recoger', 'equipos por recoger')}</span>
                        </div>
                        {ordenesRetiro.length === 0 && (
                            <div className={`${TARJETA} flex flex-col items-center gap-2 py-12 text-center`}>
                                <ArchiveBoxArrowDownIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                <p className="text-sm font-semibold text-slate-500">Sin retiros pendientes</p>
                            </div>
                        )}
                        {ordenesRetiro.map(renderOrden)}
                    </div>
                )}
            </div>

            {/* BARRA INFERIOR */}
            <nav aria-label="Secciones" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <div className="mx-auto grid max-w-3xl grid-cols-4">
                    <NavButton icon={HomeIcon} label="Inicio" active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />
                    <NavButton icon={ClipboardDocumentListIcon} label="Agenda" badge={ordenesAgenda.length + instalaciones.length} active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
                    <NavButton icon={MapIcon} label="Ruta" active={activeTab === 'ruta'} onClick={() => setActiveTab('ruta')} />
                    <NavButton icon={ArchiveBoxArrowDownIcon} label="Retiros" badge={ordenesRetiro.length} active={activeTab === 'retiros'} onClick={() => setActiveTab('retiros')} />
                </div>
            </nav>

            <ChatModal isOpen={showChatModal} onClose={() => setShowChatModal(false)} cliente={targetCliente} />
            <ChatModal
                isOpen={Boolean(chatOrden)}
                onClose={() => setChatOrden(null)}
                cliente={chatOrden ? {
                    id: chatOrden.id,
                    nombre: chatOrden.cliente?.nombre || chatOrden.prospecto_nombre || `Orden #${chatOrden.id}`,
                    telefono: chatOrden.cliente?.telefono || chatOrden.prospecto_telefono || '',
                } : null}
                ruta={chatOrden ? `/ordenes/${chatOrden.id}/chat` : undefined}
            />
        </div>
    );
}

const NavButton = ({ icon: Icon, label, active, badge = 0, onClick }: NavButtonProps) => (
    <button
        type="button"
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 transition active:scale-95 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
    >
        {active && <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-blue-600 dark:bg-blue-400" />}
        <span className="relative">
            <Icon className="h-6 w-6" />
            {badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{badge > 99 ? '99+' : badge}</span>
            )}
        </span>
        <span className="text-[11px] font-semibold">{label}</span>
    </button>
);
