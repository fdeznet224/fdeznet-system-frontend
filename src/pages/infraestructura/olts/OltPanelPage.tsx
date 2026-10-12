import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon, ArrowPathIcon, ChevronDownIcon, Cog6ToothIcon, FunnelIcon,
    LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon, PencilIcon, PencilSquareIcon, StarIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { AltaManual, ModificarOnu, SECCIONES_DETALLE, SeccionOnu, VersionesPon, type SeccionDetalle } from './PanelSecciones';
import './panel.css';

/** Copia del panel web de la OLT VSOL: lista de ONU con las mismas columnas y acciones. */

interface PonItem { pon: number; port_id: number; nombre: string }

export interface PanelOnu {
    onu_id: string;
    pon: number;
    onuid: number;
    online: boolean;
    descripcion: string;
    modelo: string;
    perfil: string;
    modo: string;
    serial: string;
    marcada: boolean;
    activa: boolean;
    rx: string | null;
    tx: string | null;
    estado_admin: string | null;
    estado_omcc: string | null;
    fase: string | null;
    ultimo_registro: string | null;
    ultima_baja: string | null;
    causa_ultima_baja: string | null;
    tiempo_activa: string | null;
    cliente_id: number | null;
    cliente_nombre: string | null;
}

interface PanelLista { olt: string; onus: PanelOnu[]; total: number; online: number; offline: number }

interface PanelDetalle {
    onu_id: string;
    online: boolean;
    detalle: Record<string, string>;
    optica: Record<string, string>;
}

type Accion = 'eliminar' | 'reiniciar' | 'marcar' | 'desmarcar' | 'activar' | 'desactivar';
type Vista = 'lista' | 'estado' | 'optica' | 'version';
type FiltroEstado = 'todos' | 'online' | 'offline';

interface Confirmacion {
    titulo: string;
    texto: ReactNode;
    boton: string;
    escribir?: string;
    peligro?: boolean;
    hacer: () => Promise<void>;
}

const LARGO_DESCRIPCION = 32;
const LARGO_BUSQUEDA = 12;

const TEXTO_ACCION: Record<Accion, { titulo: string; texto: string; boton: string; listo: string; peligro?: boolean }> = {
    eliminar: { titulo: 'Eliminar ONU', texto: 'Se borra de la OLT. Con autorización automática vuelve a darse de alta sola en 1 a 2 minutos.', boton: 'Eliminar', listo: 'ONU eliminada de la OLT', peligro: true },
    reiniciar: { titulo: 'Reiniciar ONU', texto: 'Reinicio normal: no borra su configuración. El cliente se queda sin internet 1 a 2 minutos.', boton: 'Reiniciar', listo: 'La ONU se está reiniciando' },
    marcar: { titulo: 'Marcar ONU', texto: 'Se agrega a la lista de atención de la OLT.', boton: 'Marcar', listo: 'ONU marcada' },
    desmarcar: { titulo: 'Quitar marca', texto: 'Se quita de la lista de atención de la OLT.', boton: 'Quitar', listo: 'Marca quitada' },
    activar: { titulo: 'Activar ONU', texto: 'La ONU vuelve a dar servicio.', boton: 'Activar', listo: 'ONU activada' },
    desactivar: { titulo: 'Desactivar ONU', texto: 'La OLT deja de darle servicio hasta que la actives otra vez.', boton: 'Desactivar', listo: 'ONU desactivada', peligro: true },
};

function rolActual(): string {
    try {
        return (JSON.parse(localStorage.getItem('user') || '{}') as { rol?: string }).rol ?? '';
    } catch {
        return '';
    }
}

function ConfirmarModal({ datos, onCerrar }: { datos: Confirmacion; onCerrar: () => void }) {
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const listo = !datos.escribir || texto.trim().toUpperCase() === datos.escribir.toUpperCase();

    const confirmar = async () => {
        setEnviando(true);
        try {
            await datos.hacer();
            onCerrar();
        } finally {
            setEnviando(false);
        }
    };

    return createPortal(
        <div className="vp-modal" role="dialog" aria-modal="true" aria-label={datos.titulo}>
            <div className="vp-modal-caja">
                <h3>{datos.titulo}</h3>
                <p>{datos.texto}</p>
                {datos.escribir && (
                    <input
                        autoFocus
                        aria-label="Confirmación"
                        placeholder={`Escribe ${datos.escribir}`}
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                    />
                )}
                <div className="vp-modal-botones">
                    <button type="button" className="vp-btn" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button
                        type="button"
                        className={`vp-btn vp-btn--lleno${datos.peligro ? ' vp-btn--peligro' : ''}`}
                        onClick={() => void confirmar()}
                        disabled={!listo || enviando}
                    >
                        {enviando ? 'Aplicando…' : datos.boton}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function numero(valor?: string | null): number | null {
    const n = parseFloat(String(valor ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

/** Medidor semicircular como el del panel (Rx / Tx con sus umbrales). */
function Medidor({ titulo, valor, minimo, maximo, escala }: {
    titulo: string; valor: number | null; minimo: number | null; maximo: number | null; escala: [number, number];
}) {
    const [desde, hasta] = escala;
    const fraccion = valor == null ? 0 : Math.min(1, Math.max(0, (valor - desde) / (hasta - desde)));
    const angulo = Math.PI * (1 - fraccion);
    const x = 50 + 30 * Math.cos(angulo);
    const y = 52 - 30 * Math.sin(angulo);
    const dentro = valor != null && (minimo == null || valor >= minimo) && (maximo == null || valor <= maximo);
    return (
        <div className="vp-medidor">
            <div>
                <div className="vp-medidor-valor" style={{ fontWeight: 500, fontSize: 14 }}>{titulo}</div>
                <svg width="110" height="70" viewBox="0 0 100 62" aria-hidden="true">
                    <defs>
                        <linearGradient id={`grad-${titulo}`} x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0" stopColor="#ff6b6b" />
                            <stop offset="0.35" stopColor="#f5d547" />
                            <stop offset="0.5" stopColor="#00d26e" />
                            <stop offset="0.65" stopColor="#f5d547" />
                            <stop offset="1" stopColor="#ff6b6b" />
                        </linearGradient>
                    </defs>
                    <path d="M 12 52 A 38 38 0 0 1 88 52" fill="none" stroke={`url(#grad-${titulo})`} strokeWidth="6" strokeLinecap="round" />
                    <line x1="50" y1="52" x2={x} y2={y} stroke="var(--vp-texto)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="50" cy="52" r="3" fill="var(--vp-texto)" />
                </svg>
                <div className="vp-medidor-valor" style={{ color: valor == null ? undefined : dentro ? undefined : 'var(--vp-offline)' }}>
                    {valor == null ? '--' : `${valor.toFixed(2)} dBm`}
                </div>
            </div>
            <div className="vp-umbrales">
                <div><b>{minimo != null ? minimo.toFixed(2) : '--'}</b>Umbral Inferior</div>
                <div><b>{maximo != null ? maximo.toFixed(2) : '--'}</b>Umbral Superior</div>
            </div>
        </div>
    );
}

function duracion(segundosTexto?: string): string {
    const total = numero(segundosTexto);
    if (total == null) return segundosTexto || 'N/A';
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

const sinAcentos = (texto: string) => texto.normalize('NFKD').replace(/[^\w ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** La OLT guarda el nombre sin acentos y recortado: si ya lo trae, no se repite debajo. */
function nombreEnDescripcion(f: { descripcion: string; cliente_nombre: string | null }): boolean {
    const nombre = sinAcentos(f.cliente_nombre ?? '');
    const descripcion = sinAcentos(f.descripcion);
    return !!nombre && (descripcion.startsWith(nombre) || nombre.startsWith(descripcion.split(' ').slice(0, -1).join(' ') || '\u0000'));
}

const valorOn = (v?: string) => (v && v.toLowerCase() !== 'unknown' ? v : 'Unknown');
const capital = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : 'N/A');

function OltIcono() {
    return (
        <svg width="130" height="34" viewBox="0 0 130 34" aria-hidden="true">
            <path d="M8 4h114l6 14H2z" fill="#8f9bff" />
            <rect x="2" y="18" width="126" height="12" rx="2" fill="#6c7cff" />
            {Array.from({ length: 9 }, (_, i) => <rect key={i} x={8 + i * 9} y="22" width="5" height="4" fill="#fff" />)}
            <text x="104" y="27" fontSize="7" fill="#fff" fontFamily="sans-serif">OLT</text>
        </svg>
    );
}

function OnuIcono() {
    return (
        <svg width="110" height="92" viewBox="0 0 110 92" aria-hidden="true">
            <rect x="10" y="2" width="5" height="52" rx="2" fill="#b7c0ff" />
            <rect x="95" y="2" width="5" height="52" rx="2" fill="#b7c0ff" />
            <rect x="2" y="50" width="106" height="34" rx="10" fill="#8f9bff" />
            {Array.from({ length: 5 }, (_, i) => <rect key={i} x={26 + i * 12} y="64" width="7" height="4" fill="#fff" />)}
        </svg>
    );
}

function DetalleOnu({ oltId, oltNombre, onu, onVolver }: { oltId: number; oltNombre: string; onu: PanelOnu; onVolver: () => void }) {
    const [datos, setDatos] = useState<PanelDetalle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [seccion, setSeccion] = useState<SeccionDetalle>('general');

    const leer = useCallback(async () => {
        setError(null);
        try {
            const { data } = await client.get<{ data: PanelDetalle }>(`/olts/${oltId}/panel/onus/${onu.pon}/${onu.onuid}`);
            setDatos(data.data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer la ONU'));
        }
    }, [oltId, onu.pon, onu.onuid]);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    const d = datos?.detalle ?? {};
    const o = datos?.optica ?? {};
    const online = datos ? datos.online : onu.online;

    return (
        <div>
            <nav className="vp-nav" aria-label="Navegación del panel">
                <button type="button" className="vp-volver" onClick={onVolver}>
                    <ArrowLeftIcon /> Lista de ONUs
                </button>
                <span className="vp-ruta">{oltNombre} › PON 0/{onu.pon} › <b>{onu.onu_id}</b></span>
                <button type="button" className="vp-btn" onClick={() => void leer()} aria-label="Volver a leer la ONU">
                    <ArrowPathIcon width={16} height={16} />
                </button>
            </nav>
            <div className="vp-detalle-cabecera">
                <div className="vp-tabs" role="tablist">
                    {SECCIONES_DETALLE.map((t) => (
                        <button key={t.clave} type="button" role="tab" aria-selected={seccion === t.clave}
                            className={`vp-tab${seccion === t.clave ? ' is-activa' : ''}`} onClick={() => setSeccion(t.clave)}>
                            {t.titulo}
                        </button>
                    ))}
                </div>
            </div>
            {seccion !== 'general' && <SeccionOnu oltId={oltId} pon={onu.pon} onuid={onu.onuid} seccion={seccion} />}
            {seccion === 'general' && error && <p className="vp-error">{error}</p>}
            {seccion === 'general' && !datos && !error && <div className="vp-vacio">Consultando la ONU…</div>}
            {seccion === 'general' && datos && (
                <div className="vp-detalle">
                    <div>
                        <h2 className="vp-seccion">Topología</h2>
                        <div className="vp-topologia">
                            <div className="vp-equipo"><OltIcono /><span>OLT</span></div>
                            <div className={`vp-enlace${online ? '' : ' is-offline'}`}>
                                <small>{o.Distance ? `${o.Distance}m` : '--'}</small>
                                <span />
                            </div>
                            <div className="vp-equipo">
                                <OnuIcono />
                                <span className={`vp-estado ${online ? 'is-online' : 'is-offline'}`}>{online ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                        <h2 className="vp-seccion">Óptico</h2>
                        <div className="vp-optico">
                            <div className="vp-medidores">
                                <Medidor titulo="Rx" valor={numero(o['Rx Optical Level(ONU)'])} minimo={numero(o['Lower Rx Optical Threshold'])} maximo={numero(o['Upper Rx Optical Threshold'])} escala={[-30, -5]} />
                                <Medidor titulo="Tx" valor={numero(o['Tx Optical Level'])} minimo={numero(o['Lower Tx Optical Threshold'])} maximo={numero(o['Upper Tx Optical Threshold'])} escala={[-2, 8]} />
                                <div className="vp-tarjetas">
                                    <div className="vp-tarjeta"><b>{numero(o['Power Feed Voltage'])?.toFixed(2) ?? '--'} V</b><span>Voltaje</span></div>
                                    <div className="vp-tarjeta"><b>{numero(o['Laser Bias Current'])?.toFixed(2) ?? '--'} mA</b><span>Actual</span></div>
                                    <div className="vp-tarjeta"><b>{numero(o.Temperature)?.toFixed(2) ?? '--'} °C</b><span>Temperatura</span></div>
                                </div>
                            </div>
                            <div className="vp-props">
                                <div><b>{o.Interface || '--'}</b><span>Interfaz</span></div>
                                <div><b>{capital(o.Alarm)}</b><span>Alarma</span></div>
                                <div><b>{o['GEM Block Length'] || '--'}</b><span>Longitud del Bloque GEM</span></div>
                                <div><b>{o['Alarm Disable Interval'] || '--'}</b><span>Intervalo de Deshabilitación de Alarma</span></div>
                                <div><b>{o['SF Threshold'] || '--'}</b><span>Umbral SF</span></div>
                                <div><b>{o['SD Threshold'] || '--'}</b><span>Umbral SD</span></div>
                                <div><b>{o['ONU Response Time'] || '--'}</b><span>Tiempo de Respuesta de la ONU</span></div>
                                <div><b>{o['Total T-CONT Number'] || '--'}</b><span>Número Total de T-CONTs</span></div>
                                <div><b>{capital(o['Piggyback DBA Rpt Mode'])}</b><span>Modo de Reporte DBA Piggyback</span></div>
                            </div>
                        </div>
                    </div>
                    <aside className="vp-info">
                        <h2 className="vp-seccion">Información Detallada</h2>
                        <div className="vp-info-desc">
                            <PencilIcon width={18} height={18} style={{ color: 'var(--vp-primario)' }} />
                            <div><span>Descripción</span><b>{d.Description || onu.descripcion || '--'}</b></div>
                        </div>
                        <div className="vp-info-grid">
                            <div><span>Versión Principal del Software</span><b>{d['Main Software Version'] || '--'}</b></div>
                            <div><span>Versión Standby del Software</span><b>{d['Standby Software Version'] || '--'}</b></div>
                            <div><span>ID de Fabricante</span><b>{d.VendorID || '--'}</b></div>
                            <div><span>Versión</span><b>{d.Version || '--'}</b></div>
                            <div><span>SN</span><b>{d.SN || onu.serial}</b></div>
                            <div><span>Contraseña SN</span><b>{valorOn(d['SN Password'])}</b></div>
                            <div><span>LOID</span><b>{valorOn(d.LOID)}</b></div>
                            <div><span>Contraseña LOID</span><b>{valorOn(d['LOID Password'])}</b></div>
                            <div><span>ID de Equipo</span><b>{d['Equipment ID'] || onu.modelo || '--'}</b></div>
                        </div>
                        <div className="vp-info-lista">
                            <div>Estado de Gestión<b>{capital(d['Admin Status'])}</b></div>
                            <div>Monitor de Batería<b>{capital(d['Battery Monitor'])}</b></div>
                            <div>Modo de Seguridad<b>{capital(d['Security Mode'])}</b></div>
                            <div>Capacidad de Seguridad<b>{capital(d['Security Capability'])}</b></div>
                            <div>Código de Producto<b>{d['Product Code'] || 'N/A'}</b></div>
                            <div>Tiempo de Supervivencia<b>{d['Survival Time'] || 'N/A'}</b></div>
                            <div>Tiempo de inicio<b>{(d['Startup Time'] || 'N/A').replace(/\s+/g, ' ')}</b></div>
                            <div>Tiempo de Actividad del Sistema<b>{duracion(d['System Uptime'])}</b></div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

export default function OltPanelPage() {
    const oltId = Number(useParams().oltId);
    return <PanelOlt key={oltId} oltId={oltId} />;
}

interface OltOpcion { id: number; nombre: string; tipo_integracion?: string }

function PanelOlt({ oltId }: { oltId: number }) {
    const navigate = useNavigate();
    const [olts, setOlts] = useState<OltOpcion[]>([]);
    const puedeCambiar = rolActual() === 'admin';
    const [pons, setPons] = useState<PonItem[]>([]);
    const [pon, setPon] = useState<number | null>(null);
    const [menuPon, setMenuPon] = useState(false);
    const [vista, setVista] = useState<Vista>('lista');
    const [lista, setLista] = useState<PanelLista | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroEstado>('todos');
    const [menuFiltro, setMenuFiltro] = useState(false);
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [editando, setEditando] = useState<{ onu: string; texto: string } | null>(null);
    const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
    const [detalle, setDetalle] = useState<PanelOnu | null>(null);
    const [alta, setAlta] = useState(false);
    const [modificando, setModificando] = useState<PanelOnu | null>(null);

    const cargar = useCallback(async (ponElegido: number | null, texto: string | null) => {
        if (ponElegido == null && !texto) return;
        setCargando(true);
        setError(null);
        try {
            const params = texto ? { buscar: texto } : { pon: ponElegido };
            const { data } = await client.get<{ data: PanelLista }>(`/olts/${oltId}/panel/onus`, { params });
            setLista(data.data);
            setSeleccion(new Set());
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer la OLT'));
        } finally {
            setCargando(false);
        }
    }, [oltId]);

    useEffect(() => {
        let vivo = true;
        client.get<{ data: PonItem[] }>(`/olts/${oltId}/panel/pons`)
            .then(({ data }) => {
                if (!vivo) return;
                setPons(data.data);
                const primero = data.data[0]?.pon ?? null;
                setPon(primero);
                void cargar(primero, null);
            })
            .catch((e) => vivo && setError(apiErrorMessage(e, 'No se pudo conectar con la OLT')));
        return () => { vivo = false; };
    }, [oltId, cargar]);

    useEffect(() => {
        let vivo = true;
        client.get<OltOpcion[]>('/olts/')
            .then(({ data }) => {
                // Solo las VSOL tienen panel; la de SNMP sigue en el Radar.
                if (vivo && Array.isArray(data)) setOlts(data.filter((o) => (o.tipo_integracion || 'vsol_api') !== 'snmp'));
            })
            .catch(() => undefined);
        return () => { vivo = false; };
    }, []);

    const refrescar = () => void cargar(pon, buscando);

    const filas = useMemo(
        () => (lista?.onus ?? []).filter((f) => filtro === 'todos' || (filtro === 'online') === f.online),
        [lista, filtro],
    );
    const seleccionadas = filas.filter((f) => seleccion.has(f.onu_id));

    const elegirPon = (nuevo: number) => {
        setMenuPon(false);
        setPon(nuevo);
        setBuscando(null);
        setBusqueda('');
        void cargar(nuevo, null);
    };

    const buscar = () => {
        const texto = busqueda.trim();
        setBuscando(texto || null);
        void cargar(pon, texto || null);
    };

    const pedirAccion = (onu: PanelOnu, accion: Accion) => {
        const t = TEXTO_ACCION[accion];
        setConfirmacion({
            titulo: t.titulo,
            texto: <>{t.texto}<br /><b>{onu.onu_id} · {onu.descripcion || onu.serial}</b></>,
            boton: t.boton,
            peligro: t.peligro,
            hacer: async () => {
                try {
                    await client.post(`/olts/${oltId}/panel/onus/${onu.pon}/${onu.onuid}/accion`, { accion, serial: onu.serial });
                    toast.success(t.listo);
                    refrescar();
                } catch (e) {
                    toast.error(apiErrorMessage(e, 'La OLT no aplicó el cambio'));
                }
            },
        });
    };

    const guardarDescripcion = async (onu: PanelOnu) => {
        if (!editando) return;
        try {
            await client.post(`/olts/${oltId}/panel/onus/${onu.pon}/${onu.onuid}/descripcion`, { serial: onu.serial, descripcion: editando.texto });
            toast.success('Descripción guardada en la OLT');
            setEditando(null);
            refrescar();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo cambiar la descripción'));
        }
    };

    const eliminarSeleccionadas = () => setConfirmacion({
        titulo: 'Eliminar ONUs',
        texto: `Se borran ${seleccionadas.length} ONU de la OLT. Con autorización automática vuelven solas en 1 a 2 minutos.`,
        boton: 'Eliminar',
        peligro: true,
        hacer: async () => {
            try {
                await client.post(`/olts/${oltId}/panel/eliminar-varias`, {
                    onus: seleccionadas.map((f) => ({ pon: f.pon, onuid: f.onuid, serial: f.serial })),
                });
                toast.success('ONUs eliminadas de la OLT');
                refrescar();
            } catch (e) {
                toast.error(apiErrorMessage(e, 'No se pudieron eliminar'));
            }
        },
    });

    const eliminarPon = (soloOffline: boolean) => {
        if (pon == null) return;
        const nombre = `PON 0/${pon}`;
        setConfirmacion({
            titulo: soloOffline ? 'Eliminar Offline' : 'Eliminar Todo',
            texto: soloOffline
                ? `Se borran de la OLT todas las ONU apagadas del ${nombre}. Escribe ${nombre} para confirmar.`
                : `Se borran de la OLT TODAS las ONU del ${nombre}, también las que dan servicio: esos clientes se quedan sin internet hasta que se vuelvan a autorizar. Escribe ${nombre} para confirmar.`,
            boton: soloOffline ? 'Eliminar Offline' : 'Eliminar Todo',
            escribir: nombre,
            peligro: true,
            hacer: async () => {
                try {
                    await client.post(`/olts/${oltId}/panel/pon/${pon}/${soloOffline ? 'eliminar-offline' : 'eliminar-todo'}`, { confirmacion: nombre });
                    toast.success('Listo');
                    refrescar();
                } catch (e) {
                    toast.error(apiErrorMessage(e, 'La OLT no aplicó el cambio'));
                }
            },
        });
    };

    const alternar = (id: string) => setSeleccion((prev) => {
        const nuevo = new Set(prev);
        if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
        return nuevo;
    });
    const todas = filas.length > 0 && filas.every((f) => seleccion.has(f.onu_id));

    const iconos = (f: PanelOnu) => (
        <div className="vp-iconos">
            {puedeCambiar && (
                <button type="button" className={`vp-icono${f.marcada ? ' is-marcada' : ''}`} title={f.marcada ? 'Quitar marca' : 'Marcar'} aria-label={`${f.marcada ? 'Quitar marca' : 'Marcar'} ${f.onu_id}`} onClick={() => pedirAccion(f, f.marcada ? 'desmarcar' : 'marcar')}>
                    {f.marcada ? <StarSolidIcon /> : <StarIcon />}
                </button>
            )}
            <button type="button" className="vp-icono" title="Configuración" aria-label={`Ver ${f.onu_id}`} onClick={() => setDetalle(f)}><Cog6ToothIcon /></button>
            {puedeCambiar && (
                <>
                    <button type="button" className="vp-icono" title="Eliminar" aria-label={`Eliminar ${f.onu_id}`} onClick={() => pedirAccion(f, 'eliminar')}><TrashIcon /></button>
                    <button type="button" className={`vp-icono${f.activa ? '' : ' is-inactiva'}`} title={f.activa ? 'Desactivar' : 'Activar'} aria-label={`${f.activa ? 'Desactivar' : 'Activar'} ${f.onu_id}`} onClick={() => pedirAccion(f, f.activa ? 'desactivar' : 'activar')}>
                        {f.activa ? <LockOpenIcon /> : <LockClosedIcon />}
                    </button>
                    <button type="button" className="vp-icono" title="Modificar" aria-label={`Modificar ${f.onu_id}`} onClick={() => setModificando(f)}><PencilSquareIcon /></button>
                    <button type="button" className="vp-icono" title="Reiniciar" aria-label={`Reiniciar ${f.onu_id}`} onClick={() => pedirAccion(f, 'reiniciar')}><ArrowPathIcon /></button>
                </>
            )}
        </div>
    );

    const descripcion = (f: PanelOnu) => editando?.onu === f.onu_id ? (
        <span className="vp-editar">
            <input
                autoFocus
                aria-label="Nueva descripción"
                maxLength={LARGO_DESCRIPCION}
                value={editando.texto}
                onChange={(e) => setEditando({ onu: f.onu_id, texto: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') void guardarDescripcion(f); if (e.key === 'Escape') setEditando(null); }}
            />
            <button type="button" className="vp-btn vp-btn--lleno" onClick={() => void guardarDescripcion(f)}>Aplicar</button>
            <button type="button" className="vp-btn" onClick={() => setEditando(null)}>Cancelar</button>
        </span>
    ) : (
        <span className="vp-desc">
            <span>
                {f.descripcion || f.onu_id}
                {f.cliente_nombre && !nombreEnDescripcion(f) && <small className="vp-cliente">Cliente: {f.cliente_nombre}</small>}
            </span>
            {puedeCambiar && (
                <button type="button" className="vp-lapiz" aria-label={`Editar descripción de ${f.onu_id}`} onClick={() => setEditando({ onu: f.onu_id, texto: f.descripcion })}>
                    <PencilIcon />
                </button>
            )}
        </span>
    );

    if (detalle) {
        return <div className="vp"><DetalleOnu oltId={oltId} oltNombre={lista?.olt ?? 'OLT'} onu={detalle} onVolver={() => setDetalle(null)} /></div>;
    }

    const ponActual = pons.find((p) => p.pon === pon);

    return (
        <div className="vp">
            <nav className="vp-nav" aria-label="Navegación del panel">
                <Link to="/admin/radar" className="vp-volver"><ArrowLeftIcon /> Radar</Link>
                <label className="vp-cambiar-olt">
                    <span>OLT</span>
                    <select aria-label="Cambiar de OLT" value={oltId} onChange={(e) => navigate(`/admin/radar/${e.target.value}/panel`)}>
                        {(olts.length ? olts : [{ id: oltId, nombre: lista?.olt ?? `OLT ${oltId}` }]).map((o) => (
                            <option key={o.id} value={o.id}>{o.nombre}</option>
                        ))}
                    </select>
                </label>
            </nav>
            <div className="vp-tabs">
                <button type="button" className="vp-tab is-activa">Lista de ONUs</button>
            </div>

            <div className="vp-barra">
                <div className="vp-pon">
                    <button type="button" className="vp-btn vp-btn--lleno" onClick={() => setMenuPon((v) => !v)} aria-haspopup="menu" aria-expanded={menuPon}>
                        {ponActual?.nombre ?? 'PON'} <ChevronDownIcon width={14} height={14} />
                    </button>
                    {menuPon && (
                        <div className="vp-menu" role="menu">
                            {pons.map((p) => (
                                <button key={p.pon} type="button" role="menuitem" className={p.pon === pon ? 'is-activa' : ''} onClick={() => elegirPon(p.pon)}>{p.nombre}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="vp-subtabs">
                    <button type="button" className={`vp-subtab${vista === 'lista' ? ' is-activa' : ''}`} onClick={() => setVista('lista')}>Lista de ONUs</button>
                    <button type="button" className={`vp-subtab${vista === 'estado' ? ' is-activa' : ''}`} onClick={() => setVista('estado')}>Estado de la ONU</button>
                    <button type="button" className={`vp-subtab${vista === 'optica' ? ' is-activa' : ''}`} onClick={() => setVista('optica')}>Óptica de la ONU</button>
                    <button type="button" className={`vp-subtab${vista === 'version' ? ' is-activa' : ''}`} onClick={() => setVista('version')}>Versión de la ONU</button>
                </div>
            </div>

            <div className="vp-herramientas">
                <div className="vp-buscar">
                    <label className="vp-input">
                        <input
                            aria-label="Buscar en todas las PON"
                            placeholder="Buscar en TODAS las PON"
                            maxLength={LARGO_BUSQUEDA}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
                        />
                        <small>{busqueda.length} / {LARGO_BUSQUEDA}</small>
                    </label>
                    <button type="button" className="vp-btn vp-btn--lleno" onClick={buscar}>
                        <MagnifyingGlassIcon width={16} height={16} /> Buscar
                    </button>
                </div>
                <div className="vp-derecha">
                    <div className="vp-conteo">
                        Total de ONUs:<b>{lista?.total ?? 0}</b>, Online:<b className="is-online">{lista?.online ?? 0}</b>, Offline:<b className="is-offline">{lista?.offline ?? 0}</b>
                    </div>
                    <div className="vp-acciones">
                        <button type="button" className="vp-btn" onClick={refrescar} disabled={cargando}>{cargando ? 'Leyendo…' : 'Refrescar'}</button>
                        {puedeCambiar && (
                            <>
                                <button type="button" className="vp-btn" disabled={seleccionadas.length === 0} onClick={eliminarSeleccionadas}>Eliminar</button>
                                <button type="button" className="vp-btn" disabled={pon == null || !!buscando} onClick={() => eliminarPon(false)}>Eliminar Todo</button>
                                <button type="button" className="vp-btn" disabled={pon == null || !!buscando} onClick={() => eliminarPon(true)}>Eliminar Offline</button>
                                <button type="button" className="vp-btn vp-btn--lleno" disabled={pon == null} onClick={() => setAlta(true)}>Añadir Manualmente</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {error && <p className="vp-error">{error}</p>}

            <div className="vp-tabla-caja">
                {vista === 'lista' && (
                    <table className="vp-tabla vp-tabla-lista">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    {puedeCambiar && (
                                        <input type="checkbox" aria-label="Seleccionar todas" checked={todas}
                                            onChange={() => setSeleccion(todas ? new Set() : new Set(filas.map((f) => f.onu_id)))} />
                                    )}
                                </th>
                                <th><MagnifyingGlassIcon className="vp-th-icono" />ID de ONU</th>
                                <th style={{ position: 'relative' }}>
                                    Estado
                                    <button type="button" className="vp-filtro" aria-label="Filtrar por estado" onClick={() => setMenuFiltro((v) => !v)}><FunnelIcon /></button>
                                    {menuFiltro && (
                                        <div className="vp-menu" role="menu">
                                            {(['todos', 'online', 'offline'] as FiltroEstado[]).map((f) => (
                                                <button key={f} type="button" role="menuitem" className={filtro === f ? 'is-activa' : ''} onClick={() => { setFiltro(f); setMenuFiltro(false); }}>
                                                    {f === 'todos' ? 'Todos' : f === 'online' ? 'Online' : 'Offline'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </th>
                                <th><MagnifyingGlassIcon className="vp-th-icono" />Descripción</th>
                                <th>Modelo</th>
                                <th>Perfil</th>
                                <th>Modo</th>
                                <th><MagnifyingGlassIcon className="vp-th-icono" />Información</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((f) => (
                                <tr key={f.onu_id}>
                                    <td>{puedeCambiar && <input type="checkbox" aria-label={`Seleccionar ${f.onu_id}`} checked={seleccion.has(f.onu_id)} onChange={() => alternar(f.onu_id)} />}</td>
                                    <td>{f.onu_id}</td>
                                    <td><span className={`vp-estado ${f.online ? 'is-online' : 'is-offline'}`}>{f.online ? 'Online' : 'Offline'}</span></td>
                                    <td className="vp-col-desc">{descripcion(f)}</td>
                                    <td>{f.modelo || 'unknown'}</td>
                                    <td>{f.perfil}</td>
                                    <td>{f.modo}</td>
                                    <td>{f.serial}</td>
                                    <td>{iconos(f)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {vista === 'lista' && (
                    <div className="vp-tarjetas-onu">
                        {filas.map((f) => (
                            <article key={f.onu_id} className="vp-tarjeta-onu">
                                <div className="vp-tarjeta-onu__cabeza">
                                    {puedeCambiar && <input type="checkbox" aria-label={`Seleccionar ${f.onu_id} (móvil)`} checked={seleccion.has(f.onu_id)} onChange={() => alternar(f.onu_id)} />}
                                    <b>{f.onu_id}</b>
                                    <span className={`vp-estado ${f.online ? 'is-online' : 'is-offline'}`}>{f.online ? 'Online' : 'Offline'}</span>
                                </div>
                                <div className="vp-tarjeta-onu__desc">{descripcion(f)}</div>
                                <dl>
                                    <div><dt>Modelo</dt><dd>{f.modelo || 'unknown'}</dd></div>
                                    <div><dt>Información</dt><dd>{f.serial}</dd></div>
                                    <div><dt>Perfil · Modo</dt><dd>{f.perfil} · {f.modo}</dd></div>
                                    <div><dt>Rx</dt><dd>{f.rx ? `${f.rx} dBm` : '--'}</dd></div>
                                </dl>
                                {iconos(f)}
                            </article>
                        ))}
                    </div>
                )}

                {vista === 'estado' && (
                    <table className="vp-tabla">
                        <thead>
                            <tr>
                                <th>ID de ONU</th><th>Descripción</th><th>Estado de Gestión</th><th>Estado OMCC</th><th>Fase</th>
                                <th>Último Registro</th><th>Última Baja</th><th>Causa de la Baja</th><th>Tiempo Activa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((f) => (
                                <tr key={f.onu_id}>
                                    <td>{f.onu_id}</td><td>{f.descripcion}</td><td>{f.estado_admin ?? '--'}</td><td>{f.estado_omcc ?? '--'}</td>
                                    <td><span className={`vp-estado ${f.online ? 'is-online' : 'is-offline'}`}>{f.fase ?? '--'}</span></td>
                                    <td>{f.ultimo_registro ?? '--'}</td><td>{f.ultima_baja ?? '--'}</td><td>{f.causa_ultima_baja ?? '--'}</td><td>{f.tiempo_activa ?? '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {vista === 'optica' && (
                    <table className="vp-tabla">
                        <thead><tr><th>ID de ONU</th><th>Descripción</th><th>Potencia Rx (dBm)</th><th>Potencia Tx (dBm)</th></tr></thead>
                        <tbody>
                            {filas.map((f) => (
                                <tr key={f.onu_id}>
                                    <td>{f.onu_id}</td><td>{f.descripcion}</td><td>{f.rx ?? '--'}</td><td>{f.tx ?? '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {vista === 'version' && (pon != null && !buscando
                    ? <VersionesPon key={pon} oltId={oltId} pon={pon} />
                    : <div className="vp-vacio">Elige un PON para ver las versiones.</div>)}

                {vista !== 'version' && !cargando && lista && filas.length === 0 && <div className="vp-vacio">Sin ONUs</div>}
                {cargando && !lista && <div className="vp-vacio">Leyendo la OLT…</div>}
            </div>

            {confirmacion && <ConfirmarModal datos={confirmacion} onCerrar={() => setConfirmacion(null)} />}
            {alta && pon != null && <AltaManual oltId={oltId} pon={pon} onCerrar={() => setAlta(false)} onListo={() => { setAlta(false); refrescar(); }} />}
            {modificando && <ModificarOnu oltId={oltId} onu={modificando} onCerrar={() => setModificando(null)} onListo={() => { setModificando(null); refrescar(); }} />}
        </div>
    );
}
