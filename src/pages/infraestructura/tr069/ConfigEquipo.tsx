import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon, GlobeAltIcon, LinkIcon, PlusIcon, ServerStackIcon, TrashIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import {
    BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO, BOTON_ICONO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA, TITULO_SECCION,
} from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';

type PuertoAbierto = { ruta: string; habilitado: boolean; externo: string; interno: string; ip: string; protocolo: string; descripcion: string };
type Wan = {
    ruta: string; nombre: string; tipo: 'pppoe' | 'ip'; modo: 'ruta' | 'puente'; direccionamiento: string | null;
    vlan: number | null; servicio: string; habilitada: boolean; estado: string; ip: string | null; mascara: string | null;
    puerta_enlace: string | null; dns: string; usuario: string | null; nat: boolean; tr069: boolean; puertos: string[];
    dmz: { habilitada: boolean; ip: string | null } | null; puertos_abiertos: PuertoAbierto[];
};
type Red = {
    indice: number; ssid: string; banda: string; habilitada: boolean; oculta: boolean; canal: number; canal_actual: number | null;
    canales: number[]; ancho: string | null; anchos: Record<string, string>; seguridad: string;
};
type Lan = { ip: string; mascara: string; dhcp: boolean; inicio: string; fin: string; tiempo: number | null; dns: string; reservas: { mac: string; ip: string }[] };
type Config = { marca: 'huawei' | 'zte'; ultimo_reporte: string | null; al_dia: boolean; wans: Wan[]; wifi: Red[]; lan: Lan; puertos: string[] };

const SECCIONES = [
    { id: 'wan', titulo: 'WAN', icono: GlobeAltIcon },
    { id: 'wifi', titulo: 'WiFi', icono: WifiIcon },
    { id: 'lan', titulo: 'LAN y DHCP', icono: ServerStackIcon },
    { id: 'nat', titulo: 'Puertos y DMZ', icono: LinkIcon },
] as const;

function etiquetaPuerto(puerto: string, wifi: Red[]) {
    const m = /^SSID(\d+)$/.exec(puerto);
    if (!m) return puerto;
    const red = wifi.find((r) => r.indice === Number(m[1]));
    return red ? `${red.ssid || puerto} (${red.banda})` : puerto;
}

function Interruptor({ valor, onChange, texto, disabled }: { valor: boolean; onChange: (v: boolean) => void; texto: string; disabled?: boolean }) {
    return (
        <label className={`flex items-center justify-between gap-3 text-sm ${disabled ? 'opacity-50' : ''}`}>
            <span className="text-slate-700 dark:text-slate-200">{texto}</span>
            <input type="checkbox" checked={valor} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-blue-600" />
        </label>
    );
}

function SelectorPuertos({ puertos, elegidos, wifi, onChange }: { puertos: string[]; elegidos: string[]; wifi: Red[]; onChange: (p: string[]) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {puertos.map((p) => {
                const activo = elegidos.includes(p);
                return (
                    <button
                        key={p} type="button"
                        onClick={() => onChange(activo ? elegidos.filter((x) => x !== p) : [...elegidos, p])}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${activo
                            ? 'bg-blue-600 text-white ring-blue-600'
                            : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'}`}
                    >
                        {etiquetaPuerto(p, wifi)}
                    </button>
                );
            })}
        </div>
    );
}

/** Formulario de una WAN: editar la que existe o crear una nueva (sin `wan`). */
function FormWan({ wan, config, ocupado, onGuardar, onCancelar }: {
    wan: Wan | null; config: Config; ocupado: boolean; onGuardar: (datos: Record<string, unknown>) => void; onCancelar: () => void;
}) {
    const [f, setF] = useState({
        tipo: wan?.tipo ?? 'pppoe', modo: wan?.modo ?? 'ruta', vlan: String(wan?.vlan ?? ''), servicio: wan?.servicio || 'INTERNET',
        nombre: wan?.nombre ?? '', habilitada: wan?.habilitada ?? true, usuario: wan?.usuario ?? '', clave: '', nat: wan?.nat ?? true,
        direccionamiento: wan?.direccionamiento ?? 'DHCP', ip: wan?.ip ?? '', mascara: wan?.mascara ?? '', puerta_enlace: wan?.puerta_enlace ?? '',
        dns: wan?.dns ?? '', puertos: wan?.puertos ?? [] as string[],
    });
    const poner = (cambio: Partial<typeof f>) => setF((a) => ({ ...a, ...cambio }));
    const bloqueada = Boolean(wan?.tr069);

    const enviar = () => {
        const datos: Record<string, unknown> = {
            modo: f.modo, vlan: Number(f.vlan), servicio: f.servicio, habilitada: f.habilitada, puertos: f.puertos,
        };
        if (!wan) datos.tipo = f.tipo;
        if (f.nombre && f.nombre !== wan?.nombre) datos.nombre = f.nombre;
        if (f.modo === 'ruta') {
            datos.nat = f.nat;
            if (f.dns) datos.dns = f.dns;
            if (f.tipo === 'pppoe') {
                datos.usuario = f.usuario;
                if (f.clave) datos.clave = f.clave;
            } else {
                datos.direccionamiento = f.direccionamiento;
                if (f.direccionamiento === 'Static') Object.assign(datos, { ip: f.ip, mascara: f.mascara, puerta_enlace: f.puerta_enlace });
            }
        }
        onGuardar(datos);
    };

    return (
        <form className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            {bloqueada && (
                <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Por esta WAN entra el TR-069: no se puede apagar, pasar a puente ni cambiarle la VLAN, porque el módem se quedaría sin control remoto.
                </p>
            )}
            <div className="grid grid-cols-2 gap-2">
                {!wan && (
                    <label className="col-span-2 sm:col-span-1">
                        <span className={ETIQUETA_CAMPO}>Tipo</span>
                        <select className={CAMPO} value={f.tipo} onChange={(e) => poner({ tipo: e.target.value as 'pppoe' | 'ip' })}>
                            <option value="pppoe">PPPoE</option>
                            <option value="ip">IP (DHCP o fija)</option>
                        </select>
                    </label>
                )}
                <label>
                    <span className={ETIQUETA_CAMPO}>Modo</span>
                    <select className={CAMPO} value={f.modo} disabled={bloqueada} onChange={(e) => poner({ modo: e.target.value as 'ruta' | 'puente' })}>
                        <option value="ruta">Ruta</option>
                        <option value="puente">Puente</option>
                    </select>
                </label>
                <label>
                    <span className={ETIQUETA_CAMPO}>VLAN</span>
                    <input className={CAMPO} inputMode="numeric" value={f.vlan} disabled={bloqueada} onChange={(e) => poner({ vlan: e.target.value.replace(/\D/g, '') })} required />
                </label>
                <label>
                    <span className={ETIQUETA_CAMPO}>Servicio</span>
                    <input className={CAMPO} value={f.servicio} onChange={(e) => poner({ servicio: e.target.value.toUpperCase() })} />
                </label>
                <label className={wan ? '' : 'col-span-2 sm:col-span-1'}>
                    <span className={ETIQUETA_CAMPO}>Nombre</span>
                    <input className={CAMPO} value={f.nombre} placeholder="Lo pone el módem" onChange={(e) => poner({ nombre: e.target.value })} />
                </label>
            </div>
            {f.modo === 'ruta' && f.tipo === 'pppoe' && (
                <div className="grid grid-cols-2 gap-2">
                    <label>
                        <span className={ETIQUETA_CAMPO}>Usuario PPPoE</span>
                        <input className={CAMPO} value={f.usuario} onChange={(e) => poner({ usuario: e.target.value })} required={!wan} />
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>Contraseña PPPoE</span>
                        <input className={CAMPO} value={f.clave} placeholder={wan ? 'Sin cambiar' : ''} onChange={(e) => poner({ clave: e.target.value })} required={!wan} />
                    </label>
                </div>
            )}
            {f.modo === 'ruta' && f.tipo === 'ip' && (
                <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2">
                        <span className={ETIQUETA_CAMPO}>Dirección IP</span>
                        <select className={CAMPO} value={f.direccionamiento} onChange={(e) => poner({ direccionamiento: e.target.value })}>
                            <option value="DHCP">Por DHCP</option>
                            <option value="Static">Fija</option>
                        </select>
                    </label>
                    {f.direccionamiento === 'Static' && (
                        <>
                            <input className={CAMPO} placeholder="IP" value={f.ip} onChange={(e) => poner({ ip: e.target.value })} required />
                            <input className={CAMPO} placeholder="Máscara" value={f.mascara} onChange={(e) => poner({ mascara: e.target.value })} required />
                            <input className={`${CAMPO} col-span-2`} placeholder="Puerta de enlace" value={f.puerta_enlace} onChange={(e) => poner({ puerta_enlace: e.target.value })} required />
                        </>
                    )}
                </div>
            )}
            {f.modo === 'ruta' && (
                <label className="block">
                    <span className={ETIQUETA_CAMPO}>DNS (separados por coma)</span>
                    <input className={CAMPO} value={f.dns} placeholder="Los que da el servidor" onChange={(e) => poner({ dns: e.target.value })} />
                </label>
            )}
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <Interruptor texto="Encendida" valor={f.habilitada} disabled={bloqueada} onChange={(v) => poner({ habilitada: v })} />
                {f.modo === 'ruta' && <Interruptor texto="NAT" valor={f.nat} onChange={(v) => poner({ nat: v })} />}
            </div>
            <div className="space-y-1.5">
                <span className={ETIQUETA_CAMPO}>Puertos y redes que salen por esta WAN</span>
                <SelectorPuertos puertos={config.puertos} elegidos={f.puertos} wifi={config.wifi} onChange={(p) => poner({ puertos: p })} />
                <p className="text-[11px] text-slate-400">Un puerto solo va por una WAN: al elegirlo aquí se quita de la otra.</p>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={onCancelar} className={`${BOTON_ACCION_SECUNDARIO} flex-1`}>Cancelar</button>
                <button type="submit" disabled={ocupado || !f.vlan} className={`${BOTON_ACCION_PRIMARIO} flex-1`}>
                    {ocupado ? 'Aplicando...' : wan ? 'Guardar' : 'Crear WAN'}
                </button>
            </div>
        </form>
    );
}

function FormWifi({ red, ocupado, onGuardar }: { red: Red; ocupado: boolean; onGuardar: (datos: Record<string, unknown>) => void }) {
    const [f, setF] = useState({ ssid: red.ssid, habilitada: red.habilitada, oculta: red.oculta, canal: red.canal, ancho: red.ancho ?? '' });
    const cambios: Record<string, unknown> = {};
    if (f.ssid !== red.ssid) cambios.ssid = f.ssid;
    if (f.habilitada !== red.habilitada) cambios.habilitada = f.habilitada;
    if (f.oculta !== red.oculta) cambios.oculta = f.oculta;
    if (f.canal !== red.canal) cambios.canal = f.canal;
    if (red.ancho !== null && f.ancho !== red.ancho) cambios.ancho = f.ancho;
    const anchos = Object.entries(red.anchos);

    return (
        <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); onGuardar(cambios); }}>
            <div className="flex items-center gap-2">
                <WifiIcon className={`h-5 w-5 shrink-0 ${red.habilitada ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300'}`} />
                <p className="flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Red {red.indice} · {red.banda} · {red.seguridad}{red.canal_actual ? ` · canal ${red.canal_actual}` : ''}
                </p>
            </div>
            <input className={CAMPO} value={f.ssid} maxLength={32} onChange={(e) => setF({ ...f, ssid: e.target.value })} aria-label="Nombre de la red" />
            <div className="grid grid-cols-2 gap-2">
                <label>
                    <span className={ETIQUETA_CAMPO}>Canal</span>
                    <select className={CAMPO} value={f.canal} onChange={(e) => setF({ ...f, canal: Number(e.target.value) })}>
                        <option value={0}>Automático</option>
                        {red.canales.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </label>
                <label>
                    <span className={ETIQUETA_CAMPO}>Ancho</span>
                    <select className={CAMPO} value={f.ancho} disabled={anchos.length < 2} onChange={(e) => setF({ ...f, ancho: e.target.value })}>
                        {anchos.length === 0 && <option value="">No disponible</option>}
                        {anchos.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                    </select>
                </label>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <Interruptor texto="Encendida" valor={f.habilitada} onChange={(v) => setF({ ...f, habilitada: v })} />
                <Interruptor texto="Red oculta" valor={f.oculta} onChange={(v) => setF({ ...f, oculta: v })} />
            </div>
            {Object.keys(cambios).length > 0 && (
                <button type="submit" disabled={ocupado} className={`${BOTON_ACCION_PRIMARIO} w-full`}>{ocupado ? 'Aplicando...' : 'Guardar'}</button>
            )}
        </form>
    );
}

function FormLan({ lan, ocupado, onGuardar }: { lan: Lan; ocupado: boolean; onGuardar: (datos: Record<string, unknown>) => void }) {
    const [f, setF] = useState({ ...lan, tiempo: String(Math.round((lan.tiempo ?? 86400) / 3600)) });
    return (
        <form
            className={`${TARJETA} space-y-3 p-4`}
            onSubmit={(e) => { e.preventDefault(); onGuardar({ ip: f.ip, mascara: f.mascara, dhcp: f.dhcp, inicio: f.inicio, fin: f.fin, dns: f.dns, tiempo: Number(f.tiempo) * 3600 }); }}
        >
            <div className="grid grid-cols-2 gap-2">
                <label>
                    <span className={ETIQUETA_CAMPO}>IP del módem</span>
                    <input className={CAMPO} value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} required />
                </label>
                <label>
                    <span className={ETIQUETA_CAMPO}>Máscara</span>
                    <input className={CAMPO} value={f.mascara} onChange={(e) => setF({ ...f, mascara: e.target.value })} required />
                </label>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <Interruptor texto="Servidor DHCP" valor={f.dhcp} onChange={(v) => setF({ ...f, dhcp: v })} />
            </div>
            {f.dhcp && (
                <div className="grid grid-cols-2 gap-2">
                    <label>
                        <span className={ETIQUETA_CAMPO}>Desde</span>
                        <input className={CAMPO} value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} required />
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>Hasta</span>
                        <input className={CAMPO} value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} required />
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>Tiempo (horas)</span>
                        <input className={CAMPO} inputMode="numeric" value={f.tiempo} onChange={(e) => setF({ ...f, tiempo: e.target.value.replace(/\D/g, '') })} />
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>DNS</span>
                        <input className={CAMPO} value={f.dns} placeholder="El módem" onChange={(e) => setF({ ...f, dns: e.target.value })} />
                    </label>
                </div>
            )}
            <p className="text-[11px] text-slate-400">Si cambias la IP del módem, los equipos del cliente toman la nueva red al reconectarse.</p>
            <button type="submit" disabled={ocupado} className={`${BOTON_ACCION_PRIMARIO} w-full`}>{ocupado ? 'Aplicando...' : 'Guardar LAN'}</button>
        </form>
    );
}

function SeccionNat({ config, ocupado, accion }: { config: Config; ocupado: string | null; accion: (clave: string, url: string, datos: unknown, ok: string) => Promise<boolean> }) {
    const ruteadas = config.wans.filter((w) => w.modo === 'ruta');
    const [f, setF] = useState({ wan: ruteadas[0]?.ruta ?? '', externo: '', interno: '', ip: '', protocolo: 'TCP', descripcion: '' });
    const [dmz, setDmz] = useState(() => {
        const w = ruteadas.find((x) => x.dmz);
        return { wan: w?.ruta ?? '', habilitada: w?.dmz?.habilitada ?? false, ip: w?.dmz?.ip ?? '' };
    });
    const reglas = config.wans.flatMap((w) => w.puertos_abiertos.map((r) => ({ ...r, wan: w.nombre })));
    const conDmz = ruteadas.filter((w) => w.dmz);

    return (
        <div className="space-y-3">
            <div className={`${TARJETA} divide-y divide-slate-100 dark:divide-slate-800`}>
                {reglas.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No hay puertos abiertos.</p>}
                {reglas.map((r) => (
                    <div key={r.ruta} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.externo} → {r.ip}:{r.interno} · {r.protocolo}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{[r.descripcion, r.wan, !r.habilitado && 'apagada'].filter(Boolean).join(' · ')}</p>
                        </div>
                        <button
                            type="button" aria-label="Cerrar puerto" disabled={ocupado !== null} className={BOTON_ICONO}
                            onClick={() => void accion(`cerrar-${r.ruta}`, 'puertos/cerrar', { ruta: r.ruta }, `Puerto ${r.externo} cerrado`)}
                        >
                            <TrashIcon className="h-4 w-4 text-rose-600" />
                        </button>
                    </div>
                ))}
            </div>
            {ruteadas.length > 0 && (
                <form
                    className={`${TARJETA} space-y-2 p-4`}
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const ok = await accion('abrir', 'puertos', { ...f, externo: Number(f.externo), interno: Number(f.interno || f.externo) }, `Puerto ${f.externo} abierto`);
                        if (ok) setF({ ...f, externo: '', interno: '', descripcion: '' });
                    }}
                >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Abrir puerto</p>
                    <div className="grid grid-cols-2 gap-2">
                        <select className={`${CAMPO} col-span-2`} value={f.wan} onChange={(e) => setF({ ...f, wan: e.target.value })} aria-label="WAN">
                            {ruteadas.map((w) => <option key={w.ruta} value={w.ruta}>{w.nombre}</option>)}
                        </select>
                        <input className={CAMPO} placeholder="Puerto externo" inputMode="numeric" value={f.externo} onChange={(e) => setF({ ...f, externo: e.target.value.replace(/\D/g, '') })} required />
                        <input className={CAMPO} placeholder="Puerto interno" inputMode="numeric" value={f.interno} onChange={(e) => setF({ ...f, interno: e.target.value.replace(/\D/g, '') })} />
                        <input className={CAMPO} placeholder={`IP del equipo (${config.lan.ip.split('.').slice(0, 3).join('.')}.x)`} value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} required />
                        <select className={CAMPO} value={f.protocolo} onChange={(e) => setF({ ...f, protocolo: e.target.value })} aria-label="Protocolo">
                            <option value="TCP">TCP</option>
                            <option value="UDP">UDP</option>
                            <option value="AMBOS">TCP y UDP</option>
                        </select>
                        <input className={`${CAMPO} col-span-2`} placeholder="Descripción (cámaras, DVR...)" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
                    </div>
                    <button type="submit" disabled={ocupado !== null} className={`${BOTON_ACCION_PRIMARIO} w-full`}>{ocupado === 'abrir' ? 'Aplicando...' : 'Abrir'}</button>
                </form>
            )}
            {conDmz.length > 0 && (
                <form
                    className={`${TARJETA} space-y-2 p-4`}
                    onSubmit={(e) => { e.preventDefault(); void accion('dmz', 'wan', { ruta: dmz.wan, dmz: { habilitada: dmz.habilitada, ip: dmz.ip } }, 'DMZ guardada'); }}
                >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">DMZ</p>
                    {conDmz.length > 1 && (
                        <select className={CAMPO} value={dmz.wan} aria-label="WAN de la DMZ" onChange={(e) => {
                            const w = conDmz.find((x) => x.ruta === e.target.value);
                            setDmz({ wan: e.target.value, habilitada: w?.dmz?.habilitada ?? false, ip: w?.dmz?.ip ?? '' });
                        }}>
                            {conDmz.map((w) => <option key={w.ruta} value={w.ruta}>{w.nombre}</option>)}
                        </select>
                    )}
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <Interruptor texto="Mandar todo a un equipo" valor={dmz.habilitada} onChange={(v) => setDmz({ ...dmz, habilitada: v })} />
                    </div>
                    {dmz.habilitada && <input className={CAMPO} placeholder="IP del equipo" value={dmz.ip} onChange={(e) => setDmz({ ...dmz, ip: e.target.value })} required />}
                    <button type="submit" disabled={ocupado !== null} className={`${BOTON_ACCION_SECUNDARIO} w-full`}>{ocupado === 'dmz' ? 'Aplicando...' : 'Guardar DMZ'}</button>
                </form>
            )}
        </div>
    );
}

/**
 * Lo mismo que entrar a la web del módem por acceso remoto, pero por TR-069:
 * WAN, enlace de puertos, WiFi, LAN/DHCP, puertos abiertos y DMZ.
 */
export default function ConfigEquipo({ deviceId }: { deviceId: string }) {
    const base = `/tr069/equipos/${encodeURIComponent(deviceId)}`;
    const [seccion, setSeccion] = useState<(typeof SECCIONES)[number]['id']>('wan');
    const [config, setConfig] = useState<Config | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [editando, setEditando] = useState<string | null>(null);

    const leer = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const { data } = await client.get<Config>(`${base}/config`, { timeout: 120000 });
            setConfig(data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer la configuración del equipo'));
        } finally {
            setCargando(false);
        }
    }, [base]);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    const accion = async (clave: string, url: string, datos: unknown, ok: string) => {
        setOcupado(clave);
        try {
            const { data } = await client.post<Config>(`${base}/${url}`, datos, { timeout: 120000 });
            setConfig(data);
            toast.success(ok);
            return true;
        } catch (e) {
            toast.error(apiErrorMessage(e, 'El equipo no aceptó el cambio'));
            return false;
        } finally {
            setOcupado(null);
        }
    };

    return (
        <section className="space-y-2" data-testid="config-equipo">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-[#e4e4ea] p-1 dark:bg-slate-800">
                            {SECCIONES.map((s) => (
                                <button
                                    key={s.id} type="button" onClick={() => setSeccion(s.id)}
                                    className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${seccion === s.id
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                >
                                    {s.titulo}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => void leer()} disabled={cargando || ocupado !== null} aria-label="Leer del módem" className={BOTON_ICONO}>
                            <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {cargando && !config && <p className="p-4 text-center text-sm text-slate-500">Leyendo el módem (puede tardar unos segundos)...</p>}
                    {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
                    {config && !config.al_dia && (
                        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                            El módem no contestó ahora; se muestra lo último que reportó.
                        </p>
                    )}

                    {config && seccion === 'wan' && (
                        <div className="space-y-2">
                            {config.wans.map((w) => (
                                <div key={w.ruta} className={`${TARJETA} space-y-2 p-4`}>
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{w.nombre}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {[w.tipo === 'pppoe' ? 'PPPoE' : 'IP', w.modo === 'ruta' ? 'Ruta' : 'Puente', w.vlan ? `VLAN ${w.vlan}` : 'sin VLAN',
                                                    w.servicio, w.usuario, w.ip].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${!w.habilitada ? PILDORA.neutro : w.estado === 'Connected' ? PILDORA.verde : PILDORA.ambar}`}>
                                                {!w.habilitada ? 'Apagada' : w.estado === 'Connected' ? 'Conectada' : w.estado || 'Sin estado'}
                                            </span>
                                            {w.tr069 && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.azul}`}>TR-069</span>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Sale por: {w.puertos.length ? w.puertos.map((p) => etiquetaPuerto(p, config.wifi)).join(', ') : 'ningún puerto'}
                                    </p>
                                    {editando === w.ruta ? (
                                        <FormWan
                                            wan={w} config={config} ocupado={ocupado === w.ruta} onCancelar={() => setEditando(null)}
                                            onGuardar={async (datos) => { if (await accion(w.ruta, 'wan', { ruta: w.ruta, ...datos }, 'WAN guardada')) setEditando(null); }}
                                        />
                                    ) : (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditando(w.ruta)} disabled={ocupado !== null} className={`${BOTON_ACCION_SECUNDARIO} flex-1`}>Editar</button>
                                            {!w.tr069 && (
                                                <button
                                                    type="button" disabled={ocupado !== null} className={`${BOTON_ACCION_SECUNDARIO} text-rose-600 dark:text-rose-400`}
                                                    onClick={() => { if (window.confirm(`¿Borrar la WAN ${w.nombre}?`)) void accion(`borrar-${w.ruta}`, 'wan/borrar', { ruta: w.ruta }, 'WAN borrada'); }}
                                                >
                                                    <TrashIcon className="h-4 w-4" /> {ocupado === `borrar-${w.ruta}` ? '...' : 'Borrar'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {editando === 'nueva' ? (
                                <div className={`${TARJETA} p-4`}>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">WAN nueva</p>
                                    <FormWan
                                        wan={null} config={config} ocupado={ocupado === 'nueva'} onCancelar={() => setEditando(null)}
                                        onGuardar={async (datos) => { if (await accion('nueva', 'wan', datos, 'WAN creada')) setEditando(null); }}
                                    />
                                </div>
                            ) : (
                                <button type="button" onClick={() => setEditando('nueva')} disabled={ocupado !== null} className={`${BOTON_ACCION_SECUNDARIO} w-full`}>
                                    <PlusIcon className="h-4 w-4" /> Agregar WAN
                                </button>
                            )}
                        </div>
                    )}

                    {config && seccion === 'wifi' && (
                        <div className="space-y-2">
                            <p className="px-1 text-[11px] text-slate-400">La contraseña se cambia arriba, en WiFi. Cambiar el nombre aquí no cambia el del contrato.</p>
                            {config.wifi.map((r) => (
                                <div key={`${r.indice}-${r.ssid}-${r.habilitada}-${r.oculta}-${r.canal}-${r.ancho}`} className={`${TARJETA} p-4`}>
                                    <FormWifi red={r} ocupado={ocupado === `wifi-${r.indice}`}
                                              onGuardar={(datos) => void accion(`wifi-${r.indice}`, `wifi/${r.indice}`, datos, `Red ${r.indice} guardada`)} />
                                </div>
                            ))}
                        </div>
                    )}

                    {config && seccion === 'lan' && (
                        <>
                            <FormLan key={JSON.stringify(config.lan)} lan={config.lan} ocupado={ocupado === 'lan'}
                                     onGuardar={(datos) => void accion('lan', 'lan', datos, 'LAN guardada')} />
                            {config.lan.reservas.length > 0 && (
                                <>
                                    <h4 className={TITULO_SECCION}>Equipos con IP fija</h4>
                                    <div className={`${TARJETA} divide-y divide-slate-100 dark:divide-slate-800`}>
                                        {config.lan.reservas.map((r) => (
                                            <p key={r.mac} className="p-3 text-sm text-slate-700 dark:text-slate-200">{r.ip} · <span className="text-slate-500">{r.mac}</span></p>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {config && seccion === 'nat' && <SeccionNat key={JSON.stringify(config.wans.map((w) => w.dmz))} config={config} ocupado={ocupado} accion={accion} />}
                </div>
        </section>
    );
}
