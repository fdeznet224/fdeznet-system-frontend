import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import {
    PlusIcon, MagnifyingGlassIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    ArrowPathIcon, PhoneIcon, WifiIcon, CalendarDaysIcon, UserCircleIcon,
    SparklesIcon, XMarkIcon, ClipboardDocumentListIcon, MapIcon,
} from '@heroicons/react/24/outline';

import CreateOrdenModal from './components/CreateOrdenModal';
import ChatModal from '@/components/chat/ChatModal';
import { apiErrorMessage } from '@/utils/apiError';

interface ServiceOrder {
    id: number;
    nombre: string;
    telefono: string;
    estado: string;
    direccion?: string | null;
    zona_id?: number | null;
    plan_id?: number | null;
    tecnico?: { id?: number; nombre_completo?: string | null; usuario: string } | null;
    fecha_programada?: string | null;
    creada?: string | null;
    desdeWhatsapp: boolean;
    version?: number;
    servicio?: { id: number; alias: string; direccion?: string | null; estado: string } | null;
}

interface OrdenApi {
    id: number;
    version: number;
    estado: string;
    motivo?: string | null;
    created_at?: string | null;
    fecha_programada?: string | null;
    zona_id?: number | null;
    plan_id?: number | null;
    cliente?: { nombre?: string; telefono?: string; direccion?: string } | null;
    servicio?: { id: number; alias: string; direccion?: string | null; estado: string } | null;
    prospecto_nombre?: string | null;
    prospecto_telefono?: string | null;
    prospecto_direccion?: string | null;
    tecnico?: { id?: number; nombre?: string | null; usuario: string } | null;
}

interface Tecnico {
    id: number;
    nombre_completo?: string | null;
    usuario: string;
}

interface Catalogo {
    id: number;
    nombre: string;
    precio?: number;
}

interface UnreadSummary {
    count: number;
    antiguedad?: string | null;
}

type Filtro = 'todas' | 'sin_tecnico' | 'asignadas' | 'en_curso' | 'hoy';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20' },
    asignada: { texto: 'Asignada', clase: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20' },
    en_camino: { texto: 'En camino', clase: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20' },
    trabajando: { texto: 'Instalando', clase: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20' },
};

/** "2026-10-05T09:00:00" -> "2026-10-05T09:00" para el campo de fecha y hora. */
const aCampoFecha = (valor?: string | null) => (valor ? valor.slice(0, 16) : '');

const RE_ENLACE = /https?:\/\/\S+/;

/** La dirección del agente trae el enlace del mapa al final: se separan. */
function separarMapa(direccion?: string | null) {
    const enlace = direccion?.match(RE_ENLACE)?.[0] ?? null;
    const texto = (direccion || '').replace(RE_ENLACE, '').replace(/\s*·\s*$/, '').trim();
    return { texto, enlace };
}

function esHoy(fecha?: string | null) {
    if (!fecha) return false;
    const d = new Date(fecha);
    const hoy = new Date();
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

function antiguedad(fecha?: string | null) {
    if (!fecha) return '';
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    return `Hace ${dias} días`;
}

function Kpi({ titulo, valor, activo, tono, onClick }: { titulo: string; valor: number; activo: boolean; tono: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={activo}
            className={`min-w-[6.5rem] flex-1 rounded-2xl border p-2.5 text-left md:min-w-[8.5rem] md:p-3 transition active:scale-[0.98] ${activo
                ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}`}
        >
            <p className={`text-[10px] font-black uppercase tracking-widest ${activo ? 'text-blue-100' : 'text-slate-400'}`}>{titulo}</p>
            <p className={`mt-0.5 text-xl font-black md:mt-1 md:text-2xl ${activo ? 'text-white' : tono}`}>{valor}</p>
        </button>
    );
}

function Dato({ icono: Icono, children, alerta = false }: { icono: ComponentType<{ className?: string }>; children: React.ReactNode; alerta?: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${alerta
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            <Icono className="h-3.5 w-3.5 shrink-0" /> {children}
        </span>
    );
}

export default function Orders() {
    const [ordenes, setOrdenes] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const sugerencia = {
        caja_nap_id: Number(searchParams.get('caja_nap_id')) || undefined,
        puerto_nap: Number(searchParams.get('puerto_nap')) || undefined,
    };

    useEffect(() => {
        if (searchParams.get('caja_nap_id')) setIsCreateModalOpen(true);
    }, [searchParams]);

    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<ServiceOrder | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, UnreadSummary>>({});
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
    const [zonas, setZonas] = useState<Catalogo[]>([]);
    const [planes, setPlanes] = useState<Catalogo[]>([]);
    const [guardandoId, setGuardandoId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resOrdenes, resUnread, resTecnicos, resZonas, resPlanes] = await Promise.all([
                client.get<OrdenApi[]>('/ordenes/?tipo=instalacion'),
                client.get<Record<string, UnreadSummary>>('/whatsapp/no-leidos'),
                client.get<Tecnico[]>('/bajas/tecnicos/disponibles').catch(() => ({ data: [] as Tecnico[] })),
                client.get<Catalogo[]>('/zonas/').catch(() => ({ data: [] as Catalogo[] })),
                client.get<Catalogo[]>('/planes/').catch(() => ({ data: [] as Catalogo[] })),
            ]);
            setTecnicos(resTecnicos.data);
            setZonas(Array.isArray(resZonas.data) ? resZonas.data : []);
            setPlanes(Array.isArray(resPlanes.data) ? resPlanes.data : []);
            setOrdenes(resOrdenes.data
                .filter((orden) => !['terminada', 'cancelada'].includes(orden.estado))
                .map((orden) => ({
                    id: orden.id,
                    nombre: orden.cliente?.nombre || orden.prospecto_nombre || 'Prospecto',
                    telefono: orden.cliente?.telefono || orden.prospecto_telefono || '',
                    direccion: orden.servicio?.direccion || orden.cliente?.direccion || orden.prospecto_direccion || '',
                    estado: orden.estado,
                    zona_id: orden.zona_id,
                    plan_id: orden.plan_id,
                    tecnico: orden.tecnico ? { id: orden.tecnico.id, nombre_completo: orden.tecnico.nombre, usuario: orden.tecnico.usuario } : null,
                    fecha_programada: orden.fecha_programada,
                    creada: orden.created_at,
                    desdeWhatsapp: orden.motivo === 'prospecto_whatsapp',
                    version: orden.version,
                    servicio: orden.servicio,
                })));
            setUnreadCounts(resUnread.data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchData(), 0);
        const interval = window.setInterval(async () => {
            try {
                const res = await client.get<Record<string, UnreadSummary>>('/whatsapp/no-leidos');
                setUnreadCounts(res.data);
            } catch (error) {
                console.warn('No fue posible actualizar los mensajes no leídos', error);
            }
        }, 10000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
        };
    }, [fetchData]);

    const handleDelete = async (orden: ServiceOrder) => {
        if (!confirm(`¿Cancelar la instalación de ${orden.nombre}?`)) return;
        const load = toast.loading('Cancelando orden...');
        try {
            await client.post(`/ordenes/${orden.id}/estado`, {
                estado: 'cancelada',
                version: orden.version || 1,
                comentario: 'Cancelada por administración',
            });
            toast.success('Orden cancelada', { id: load });
            void fetchData();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cancelar'), { id: load });
        }
    };

    // Asignar técnico (o quitarlo) y la fecha de la visita.
    const actualizarOrden = async (orden: ServiceOrder, cambios: { tecnico_id?: number | null; fecha_programada?: string | null }, mensaje: string) => {
        setGuardandoId(orden.id);
        const load = toast.loading('Guardando...');
        try {
            await client.patch(`/ordenes/${orden.id}`, cambios);
            toast.success(mensaje, { id: load });
            await fetchData();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo actualizar la orden'), { id: load });
        } finally {
            setGuardandoId(null);
        }
    };

    const asignarTecnico = (orden: ServiceOrder, valor: string) => {
        const tecnico = tecnicos.find((t) => t.id === Number(valor));
        void actualizarOrden(
            orden,
            { tecnico_id: tecnico ? tecnico.id : null },
            tecnico ? `Asignada a ${tecnico.nombre_completo || tecnico.usuario}` : 'Orden sin técnico',
        );
    };

    const programar = (orden: ServiceOrder, valor: string) => {
        void actualizarOrden(orden, { fecha_programada: valor ? `${valor}:00` : null }, valor ? 'Visita programada' : 'Fecha quitada');
    };

    const nombreDe = (lista: Catalogo[], id?: number | null) => lista.find((item) => item.id === id);

    const conteos = useMemo(() => ({
        todas: ordenes.length,
        sin_tecnico: ordenes.filter((o) => !o.tecnico).length,
        asignadas: ordenes.filter((o) => o.tecnico && o.estado === 'asignada').length,
        en_curso: ordenes.filter((o) => ['en_camino', 'trabajando'].includes(o.estado)).length,
        hoy: ordenes.filter((o) => esHoy(o.fecha_programada)).length,
    }), [ordenes]);

    const filteredOrders = useMemo(() => {
        const busqueda = searchTerm.trim().toLowerCase();
        return ordenes
            .filter((o) => {
                if (filtro === 'sin_tecnico') return !o.tecnico;
                if (filtro === 'asignadas') return Boolean(o.tecnico) && o.estado === 'asignada';
                if (filtro === 'en_curso') return ['en_camino', 'trabajando'].includes(o.estado);
                if (filtro === 'hoy') return esHoy(o.fecha_programada);
                return true;
            })
            .filter((o) => !busqueda
                || o.nombre.toLowerCase().includes(busqueda)
                || o.telefono.includes(busqueda)
                || (o.direccion || '').toLowerCase().includes(busqueda)
                || (nombreDe(zonas, o.zona_id)?.nombre || '').toLowerCase().includes(busqueda));
    }, [filtro, ordenes, searchTerm, zonas]);

    const campoClase = 'min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

    return (
        <div className="flex min-h-full flex-col gap-4 bg-slate-50 p-4 pb-24 font-sans text-slate-800 transition-colors dark:bg-[#0f1219] dark:text-white md:p-6">

            {/* ENCABEZADO */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Órdenes de servicio</p>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">Instalaciones</h1>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 md:text-sm">Solicitudes por instalar. Asigna técnico y fecha; el técnico activa al cliente desde su app.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchData()}
                        aria-label="Actualizar"
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Nueva Orden"
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500 active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Nueva solicitud</span>
                    </button>
                </div>
            </div>

            {/* RESUMEN / FILTROS */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
                <Kpi titulo="Todas" valor={conteos.todas} activo={filtro === 'todas'} tono="text-slate-900 dark:text-white" onClick={() => setFiltro('todas')} />
                <Kpi titulo="Sin técnico" valor={conteos.sin_tecnico} activo={filtro === 'sin_tecnico'} tono="text-amber-600" onClick={() => setFiltro('sin_tecnico')} />
                <Kpi titulo="Asignadas" valor={conteos.asignadas} activo={filtro === 'asignadas'} tono="text-blue-600" onClick={() => setFiltro('asignadas')} />
                <Kpi titulo="En curso" valor={conteos.en_curso} activo={filtro === 'en_curso'} tono="text-violet-600" onClick={() => setFiltro('en_curso')} />
                <Kpi titulo="Visitas hoy" valor={conteos.hoy} activo={filtro === 'hoy'} tono="text-emerald-600" onClick={() => setFiltro('hoy')} />
            </div>

            {/* BUSCADOR */}
            <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    placeholder="Buscar por nombre, teléfono, zona o dirección..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* LISTADO */}
            {loading && ordenes.length === 0 ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-white dark:bg-slate-900" />)}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                    <ClipboardDocumentListIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 font-black text-slate-700 dark:text-slate-200">
                        {ordenes.length === 0 ? 'No hay instalaciones pendientes' : 'Ninguna orden coincide'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        {ordenes.length === 0 ? 'Las solicitudes del agente de WhatsApp y las que registres aparecerán aquí.' : 'Prueba con otro filtro o búsqueda.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {filteredOrders.map((orden) => {
                        const noLeidos = unreadCounts[String(orden.id)]?.count ?? 0;
                        const estado = !orden.tecnico && orden.estado === 'pendiente'
                            ? { texto: 'Sin técnico', clase: ESTADOS.pendiente.clase }
                            : ESTADOS[orden.estado] || ESTADOS.pendiente;
                        const { texto: direccion, enlace } = separarMapa(orden.direccion);
                        const zona = nombreDe(zonas, orden.zona_id);
                        const plan = nombreDe(planes, orden.plan_id);
                        return (
                            <article key={orden.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1 ${estado.clase}`}>{estado.texto}</span>
                                            {orden.desdeWhatsapp && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                                    <SparklesIcon className="h-3 w-3" /> Agente IA
                                                </span>
                                            )}
                                            <span className="text-[11px] font-bold text-slate-400">#{orden.id} · {antiguedad(orden.creada)}</span>
                                        </div>
                                        <h3 className="mt-2 truncate text-lg font-black text-slate-900 dark:text-white">{orden.nombre}</h3>
                                    </div>
                                    {orden.telefono && (
                                        <a href={`tel:${orden.telefono}`} aria-label={`Llamar a ${orden.nombre}`} className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700">
                                            <PhoneIcon className="h-5 w-5" />
                                        </a>
                                    )}
                                </div>

                                <div className="mt-3 space-y-2">
                                    <p className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="line-clamp-2">{direccion || 'Sin dirección'}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Dato icono={MapIcon} alerta={!zona}>{zona?.nombre || 'Sin zona'}</Dato>
                                        <Dato icono={WifiIcon}>{plan ? `${plan.nombre}${plan.precio ? ` · $${plan.precio}` : ''}` : 'Plan por definir'}</Dato>
                                        {orden.telefono && <Dato icono={PhoneIcon}>{orden.telefono}</Dato>}
                                        {enlace && (
                                            <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300">
                                                <MapPinIcon className="h-3.5 w-3.5" /> Ver ubicación
                                            </a>
                                        )}
                                        {orden.servicio && <Dato icono={ClipboardDocumentListIcon}>{orden.servicio.alias} · Servicio #{orden.servicio.id}</Dato>}
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><UserCircleIcon className="h-3.5 w-3.5" /> Técnico</span>
                                        <select
                                            aria-label={`Técnico de ${orden.nombre}`}
                                            value={orden.tecnico?.id ?? ''}
                                            disabled={guardandoId === orden.id}
                                            onChange={(e) => asignarTecnico(orden, e.target.value)}
                                            className={campoClase}
                                        >
                                            <option value="">Sin asignar</option>
                                            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre_completo || t.usuario}</option>)}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><CalendarDaysIcon className="h-3.5 w-3.5" /> Visita</span>
                                        <input
                                            type="datetime-local"
                                            aria-label={`Fecha de visita de ${orden.nombre}`}
                                            value={aCampoFecha(orden.fecha_programada)}
                                            disabled={guardandoId === orden.id}
                                            onChange={(e) => programar(orden, e.target.value)}
                                            className={campoClase}
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setTargetCliente(orden); setShowChatModal(true); }}
                                        className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-black transition active:scale-[0.98] ${noLeidos > 0
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                        {noLeidos > 0 ? `${noLeidos} sin leer` : 'WhatsApp'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(orden)}
                                        className="h-10 rounded-xl px-4 text-xs font-black text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <CreateOrdenModal
                isOpen={isCreateModalOpen}
                sugerencia={sugerencia}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { void fetchData(); setIsCreateModalOpen(false); setSearchParams({}); }}
            />
            <ChatModal isOpen={showChatModal} onClose={() => { setShowChatModal(false); void fetchData(); }} cliente={targetCliente} onMessagesRead={fetchData} />
        </div>
    );
}
