import { useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, CheckCircleIcon, ClipboardDocumentIcon, GlobeAltIcon, MapPinIcon, MinusCircleIcon, WifiIcon, XCircleIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { rutaEnMaps } from '@/utils/mapas';
import { CATEGORIAS_FALLA } from '@/utils/categoriasFalla';
import {
    COLOR_TONO, ESTILO_TONO, diagnosticoLentitud, diagnosticoSinInternet, numero, tonoPotencia, veredictoPotencia,
    type Diagnostico, type Revision,
} from './revision';
import { BOTON_SECUNDARIO, CAMPO } from './estilo';
import IdentificarNap from './IdentificarNap';

export interface CuentaCliente {
    estado: string;
    deuda: number;
    explicacion?: string | null;
    ultimoPago?: string | null;
    promesa?: string | null;
}

const fechaCorta = (iso?: string | null) => (iso
    ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '');

const copiar = (texto: string) => {
    void navigator.clipboard?.writeText(texto).then(() => toast.success('Copiado'), () => undefined);
};

function Aviso({ tono, children }: { tono: keyof typeof ESTILO_TONO; children: ReactNode }) {
    return <div className={`rounded-xl p-3 text-xs font-semibold leading-relaxed ${ESTILO_TONO[tono]}`}>{children}</div>;
}

/** Potencia de antes del reporte contra la de ahora, con lo que tiene que hacer el técnico. */
function Potencia({ revision, diag }: { revision: Revision; diag: Diagnostico | null }) {
    const antes = revision.potencia_antes?.rx ?? null;
    const ahora = diag ? numero(diag.olt.potencia_rx_dbm) : null;
    const veredicto = diag ? veredictoPotencia(antes, ahora, diag.olt.disponible ? diag.olt.onu_online : null) : null;
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Antes del reporte</p>
                    <p className={`font-mono text-lg font-black ${COLOR_TONO[tonoPotencia(antes)]}`}>{antes !== null ? antes.toFixed(2) : '--'}</p>
                    <p className="text-[10px] text-slate-400">{revision.potencia_antes ? fechaCorta(revision.potencia_antes.fecha) : 'sin lectura'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Ahora</p>
                    <p className={`font-mono text-lg font-black ${COLOR_TONO[tonoPotencia(ahora)]}`}>{ahora !== null ? ahora.toFixed(2) : '--'}</p>
                    <p className="text-[10px] text-slate-400">{diag ? 'en vivo' : 'pulsa Revisar ahora'}</p>
                </div>
            </div>
            {veredicto && (
                <Aviso tono={veredicto.tono}>
                    {veredicto.cambio && <span className="block font-bold">{veredicto.cambio}</span>}
                    {veredicto.texto}
                </Aviso>
            )}
        </div>
    );
}

/** Clientes de la misma caja: si todos están mal, es la caja o la troncal, no la casa. */
function Vecinos({ revision }: { revision: Revision }) {
    const nap = revision.nap;
    if (!nap) return <p className="text-xs text-slate-400">El cliente no tiene caja NAP registrada.</p>;
    const [lat, lon] = (nap.coordenadas || '').split(',').map((v) => parseFloat(v));
    const ruta = rutaEnMaps({ latitud: Number.isFinite(lat) ? lat : null, longitud: Number.isFinite(lon) ? lon : null, direccion: nap.ubicacion || '' });
    const malos = revision.vecinos.filter((v) => tonoPotencia(v.potencia?.rx ?? null) === 'mal').length;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                    Caja <span className="font-bold">{nap.nombre}</span>{nap.puerto ? ` · puerto ${nap.puerto}` : ''}
                </p>
                {ruta && (
                    <a href={ruta} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        <MapPinIcon className="h-3.5 w-3.5" /> Ir a la caja
                    </a>
                )}
            </div>
            {revision.vecinos.length > 0 && (
                <>
                    {malos >= 2 && malos >= revision.vecinos.length / 2 && (
                        <Aviso tono="mal">{malos} de {revision.vecinos.length} vecinos de la caja también tienen la potencia alta: revisa la caja NAP o la fibra que llega a ella.</Aviso>
                    )}
                    <ul aria-label="Vecinos de la caja NAP" className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                        {revision.vecinos.map((v, i) => (
                            <li key={`${v.nombre}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                                <span className="truncate text-slate-600 dark:text-slate-300">{v.puerto ? `P${v.puerto} · ` : ''}{v.nombre}</span>
                                <span className={`shrink-0 font-mono font-bold ${COLOR_TONO[tonoPotencia(v.potencia?.rx ?? null)]}`}>{v.potencia ? v.potencia.rx.toFixed(2) : '--'}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

/** Página de la ONU: el técnico se conecta al WiFi del cliente y entra con estas cuentas. */
export function AccesoOnu({ revision }: { revision: Revision }) {
    if (!revision.acceso_onu.length) return null;
    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Conéctate al WiFi del cliente y entra a su ONU para ver los equipos conectados o cambiar la contraseña del WiFi.</p>
            {revision.acceso_onu.map((acceso) => (
                <div key={acceso.marca} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <a href={acceso.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400">
                        <GlobeAltIcon className="h-4 w-4" /> Abrir ONU {acceso.marca === 'zte' ? 'ZTE' : 'Huawei'} · {acceso.url.replace(/^https?:\/\//, '')}
                    </a>
                    {acceso.cuentas.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {acceso.cuentas.map((c) => (
                                <li key={c.usuario} className="flex items-center justify-between gap-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                                    <span className="truncate">{c.usuario} / {c.clave}</span>
                                    <button type="button" aria-label={`Copiar contraseña de ${c.usuario}`} onClick={() => copiar(c.clave)}>
                                        <ClipboardDocumentIcon className="h-4 w-4 text-slate-400" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
            <p className="text-[11px] text-slate-500">Si no entra con esas cuentas, usa la contraseña de la etiqueta de atrás de la ONU.</p>
        </div>
    );
}

/** Extensor de rango: solo se anota en la orden (sin inventario). */
function Extensor({ ordenId, revision, onAnotado }: { ordenId: number; revision: Revision; onAnotado: () => void }) {
    const [detalle, setDetalle] = useState('');
    const [abierto, setAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const guardar = async () => {
        setGuardando(true);
        try {
            await client.post(`/ordenes/${ordenId}/extensor`, { detalle });
            toast.success('Extensor anotado');
            setDetalle('');
            setAbierto(false);
            onAnotado();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo anotar'));
        } finally {
            setGuardando(false);
        }
    };
    return (
        <div className="space-y-2">
            {revision.extensores.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {revision.extensores.map((e, i) => <li key={i}>📶 {e.detalle} <span className="text-slate-400">· {fechaCorta(e.fecha)}</span></li>)}
                </ul>
            )}
            {abierto ? (
                <div className="flex gap-2">
                    <input aria-label="Extensor de rango" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Modelo y dónde quedó" className={CAMPO} />
                    <button type="button" disabled={guardando || detalle.trim().length < 3} onClick={() => void guardar()} className={`${BOTON_SECUNDARIO} shrink-0 text-blue-700 dark:text-blue-300`}>Anotar</button>
                </div>
            ) : (
                <button type="button" onClick={() => setAbierto(true)} className={`${BOTON_SECUNDARIO} w-full`}>
                    <WifiIcon className="h-4 w-4 text-blue-600" /> Anotar extensor de rango
                </button>
            )}
        </div>
    );
}

function Pasos({ diag, suspendido }: { diag: Diagnostico; suspendido: boolean }) {
    const { pasos, conclusion, tono } = diagnosticoSinInternet(diag, suspendido);
    return (
        <div className="space-y-2">
            <ol aria-label="Revisión paso a paso" className="space-y-1">
                {pasos.map((p) => (
                    <li key={p.texto} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                        {p.ok === true ? <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                            : p.ok === false ? <XCircleIcon className="h-4 w-4 shrink-0 text-rose-600" />
                                : <MinusCircleIcon className="h-4 w-4 shrink-0 text-slate-400" />}
                        {p.texto}
                    </li>
                ))}
            </ol>
            <Aviso tono={tono}>{conclusion}</Aviso>
        </div>
    );
}

function Lentitud({ diag, revision }: { diag: Diagnostico; revision: Revision }) {
    const { uso, conclusion, tono } = diagnosticoLentitud(diag, revision.plan?.bajada_kbps);
    const mbps = (bps?: number | null) => `${(Number(bps || 0) / 1_000_000).toFixed(1)} Mbps`;
    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
                Bajando {mbps(diag.mikrotik?.trafico_bajada_bps)} de {revision.plan?.bajada_kbps ? `${Math.round(revision.plan.bajada_kbps / 1024)} Mb` : 'su plan'}
                {diag.mikrotik?.uptime ? ` · conectado hace ${diag.mikrotik.uptime}` : ''}
            </p>
            {uso !== null && (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="meter" aria-label="Uso del plan" aria-valuenow={uso} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full ${uso >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${uso}%` }} />
                </div>
            )}
            <Aviso tono={tono}>{conclusion}</Aviso>
        </div>
    );
}

function Cuenta({ cuenta }: { cuenta: CuentaCliente }) {
    const tono = cuenta.estado === 'suspendido' || cuenta.estado === 'cortado' ? 'mal' : cuenta.deuda > 0 ? 'aviso' : 'bien';
    return (
        <div className="space-y-1">
            <Aviso tono={tono}>
                <span className="block font-bold">{cuenta.deuda > 0 ? `Debe $${cuenta.deuda.toLocaleString('es-MX')}` : 'Al día'} · {cuenta.estado}</span>
                {cuenta.explicacion}
            </Aviso>
            <p className="text-[11px] text-slate-500">
                Último pago: {cuenta.ultimoPago || 'sin pagos'}{cuenta.promesa ? ` · promesa para el ${cuenta.promesa}` : ''}
            </p>
        </div>
    );
}

/**
 * Lo que se revisa según la falla reportada. Lo que se lee en vivo (OLT y
 * MikroTik) sale de "Revisar ahora"; lo demás viene de la revisión.
 */
export default function RevisionFalla({ ordenId, revision, diag, revisando, cuenta, onRevisar, onRecargar, latitud, longitud }: {
    ordenId: number;
    latitud?: number | null;
    longitud?: number | null;
    revision: Revision;
    diag: Diagnostico | null;
    revisando: boolean;
    cuenta: CuentaCliente | null;
    onRevisar: () => void;
    onRecargar: () => void;
}) {
    const categoria = revision.categoria;
    const suspendido = cuenta?.estado === 'suspendido' || cuenta?.estado === 'cortado';
    const sinDiagnostico = <p className="text-xs text-slate-400">Pulsa "Revisar ahora" para leer la OLT y el MikroTik.</p>;

    return (
        <section aria-label="Revisión de la falla" className="space-y-3 rounded-xl border border-rose-100 bg-white p-3 dark:border-rose-500/20 dark:bg-transparent">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Revisión · {CATEGORIAS_FALLA[categoria] || categoria}</p>
                <button type="button" disabled={revisando} onClick={onRevisar} className={`${BOTON_SECUNDARIO} h-8 text-blue-700 dark:text-blue-300`}>
                    <ArrowPathIcon className={`h-4 w-4 ${revisando ? 'animate-spin' : ''}`} /> {revisando ? 'Revisando…' : 'Revisar ahora'}
                </button>
            </div>

            {suspendido && categoria !== 'otro' && cuenta && <Aviso tono="aviso">El cliente está suspendido por pago: puede ser la causa de que no navegue.</Aviso>}

            {(categoria === 'potencia_baja' || categoria === 'cable_roto') && (
                <>
                    <Potencia revision={revision} diag={diag} />
                    <Vecinos revision={revision} />
                    <IdentificarNap ordenId={ordenId} revision={revision} latitud={latitud} longitud={longitud} onGuardado={onRecargar} />
                </>
            )}

            {categoria === 'sin_internet' && (diag ? <Pasos diag={diag} suspendido={suspendido} /> : sinDiagnostico)}

            {categoria === 'lentitud' && (
                <>
                    {diag ? <Lentitud diag={diag} revision={revision} /> : sinDiagnostico}
                    <AccesoOnu revision={revision} />
                </>
            )}

            {categoria === 'router_wifi' && (
                <>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Si la ONU está fallando, usa "Cambiar ONU" abajo: escanea la nueva o elígela del inventario.</p>
                    <AccesoOnu revision={revision} />
                    <Extensor ordenId={ordenId} revision={revision} onAnotado={onRecargar} />
                </>
            )}

            {categoria === 'otro' && (
                <>
                    {cuenta && <Cuenta cuenta={cuenta} />}
                    {diag ? <Pasos diag={diag} suspendido={suspendido} /> : sinDiagnostico}
                </>
            )}

            {diag?.sugerencia && categoria !== 'sin_internet' && categoria !== 'otro' && (
                <p className="text-[11px] text-slate-500">Sistema: {diag.sugerencia}</p>
            )}
        </section>
    );
}
