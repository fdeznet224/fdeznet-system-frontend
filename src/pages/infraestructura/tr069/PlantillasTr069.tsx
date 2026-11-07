import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentDuplicateIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import {
    BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO, BOTON_ICONO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA, TITULO_SECCION,
} from '@/components/ui/estilo';
import { EncabezadoPagina, Vacio } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';
import type { EquipoTr069 } from './tr069';

type WanPlantilla = {
    nombre: string; acs: boolean; tipo: 'pppoe' | 'ip'; modo: 'ruta' | 'puente'; vlan: number; servicio: string;
    nat: boolean; pppoe_cliente: boolean; puertos: string[];
};
type RedPlantilla = { nombre: string; bandas: string[]; oculta: boolean };
type Definicion = { wans: WanPlantilla[]; redes: RedPlantilla[]; lan: Record<string, unknown> | null };
type Plantilla = { id?: number; nombre: string; marca: 'huawei' | 'zte'; modelos: string; automatica: boolean; definicion: Definicion };

const BANDAS = ['2.4 GHz', '5 GHz'];
const LANS = ['LAN1', 'LAN2', 'LAN3', 'LAN4'];
const NUEVA: Plantilla = {
    nombre: '', marca: 'huawei', modelos: '', automatica: false,
    definicion: {
        wans: [{ nombre: 'Internet', acs: true, tipo: 'pppoe', modo: 'ruta', vlan: 10, servicio: 'TR069_INTERNET', nat: true, pppoe_cliente: true, puertos: ['LAN1', 'LAN2', 'LAN3', 'red:cliente'] }],
        redes: [{ nombre: 'cliente', bandas: [...BANDAS], oculta: false }],
        lan: null,
    },
};

const etiqueta = (p: string) => (p === 'red:cliente' ? 'WiFi del cliente' : p.startsWith('red:') ? p.slice(4) : p);

function Chips({ opciones, elegidos, onChange }: { opciones: string[]; elegidos: string[]; onChange: (v: string[]) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {opciones.map((o) => {
                const activo = elegidos.includes(o);
                return (
                    <button key={o} type="button" onClick={() => onChange(activo ? elegidos.filter((x) => x !== o) : [...elegidos, o])}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${activo
                                ? 'bg-blue-600 text-white ring-blue-600'
                                : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'}`}>
                        {etiqueta(o)}
                    </button>
                );
            })}
        </div>
    );
}

function Editor({ inicial, onGuardada, onCancelar }: { inicial: Plantilla; onGuardada: () => void; onCancelar: () => void }) {
    const [p, setP] = useState<Plantilla>(inicial);
    const [guardando, setGuardando] = useState(false);
    const d = p.definicion;
    const ponerDef = (cambio: Partial<Definicion>) => setP({ ...p, definicion: { ...d, ...cambio } });
    const ponerWan = (i: number, cambio: Partial<WanPlantilla>) => {
        let wans = d.wans.map((w, j) => (j === i ? { ...w, ...cambio } : w));
        // Un puerto solo va por una WAN.
        if (cambio.puertos) wans = wans.map((w, j) => (j === i ? w : { ...w, puertos: w.puertos.filter((x) => !cambio.puertos?.includes(x)) }));
        if (cambio.acs) wans = wans.map((w, j) => ({ ...w, acs: j === i }));
        ponerDef({ wans });
    };
    const ponerRed = (i: number, cambio: Partial<RedPlantilla>) => {
        const antes = d.redes[i].nombre;
        const redes = d.redes.map((r, j) => (j === i ? { ...r, ...cambio } : r));
        const wans = cambio.nombre !== undefined
            ? d.wans.map((w) => ({ ...w, puertos: w.puertos.map((x) => (x === `red:${antes}` ? `red:${cambio.nombre}` : x)) }))
            : d.wans;
        ponerDef({ redes, wans });
    };
    const puertos = [...LANS, ...d.redes.map((r) => `red:${r.nombre}`)];

    const guardar = async () => {
        setGuardando(true);
        try {
            const datos = { nombre: p.nombre, marca: p.marca, modelos: p.modelos, automatica: p.automatica, definicion: d };
            if (p.id) await client.put(`/tr069/plantillas/${p.id}`, datos);
            else await client.post('/tr069/plantillas', datos);
            toast.success('Plantilla guardada');
            onGuardada();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo guardar la plantilla'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className={`${TARJETA} space-y-3 p-4`}>
                <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2">
                        <span className={ETIQUETA_CAMPO}>Nombre</span>
                        <input className={CAMPO} value={p.nombre} placeholder="Huawei con Zona FdezNet" onChange={(e) => setP({ ...p, nombre: e.target.value })} />
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>Marca</span>
                        <select className={CAMPO} value={p.marca} onChange={(e) => setP({ ...p, marca: e.target.value as 'huawei' | 'zte' })}>
                            <option value="huawei">Huawei</option>
                            <option value="zte">ZTE</option>
                        </select>
                    </label>
                    <label>
                        <span className={ETIQUETA_CAMPO}>Modelos (vacío = todos)</span>
                        <input className={CAMPO} value={p.modelos} placeholder="HG8145V5, HG8145X6" onChange={(e) => setP({ ...p, modelos: e.target.value })} />
                    </label>
                </div>
                <label className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                    <span>
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">Aplicar sola</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Cuando un equipo de esta marca/modelo entra al ACS o se reinicia, se le pone lo que le falte.</span>
                    </span>
                    <input type="checkbox" checked={p.automatica} onChange={(e) => setP({ ...p, automatica: e.target.checked })} className="mt-1 h-5 w-5 accent-blue-600" />
                </label>
            </div>

            <section className="space-y-2">
                <h4 className={TITULO_SECCION}>Redes WiFi</h4>
                {d.redes.map((r, i) => (
                    <div key={i} className={`${TARJETA} space-y-2 p-4`}>
                        <div className="flex items-center gap-2">
                            {r.nombre === 'cliente'
                                ? <p className="flex-1 text-sm font-bold text-slate-900 dark:text-white">WiFi del cliente <span className="font-normal text-slate-500">(nombre y contraseña de su contrato)</span></p>
                                : <input className={`${CAMPO} flex-1`} value={r.nombre} placeholder="Nombre de la red" onChange={(e) => ponerRed(i, { nombre: e.target.value })} />}
                            {r.nombre !== 'cliente' && (
                                <button type="button" aria-label="Quitar red" className={BOTON_ICONO}
                                        onClick={() => ponerDef({ redes: d.redes.filter((_, j) => j !== i), wans: d.wans.map((w) => ({ ...w, puertos: w.puertos.filter((x) => x !== `red:${r.nombre}`) })) })}>
                                    <TrashIcon className="h-4 w-4 text-rose-600" />
                                </button>
                            )}
                        </div>
                        <Chips opciones={BANDAS} elegidos={r.bandas} onChange={(bandas) => ponerRed(i, { bandas })} />
                        {r.nombre !== 'cliente' && <p className="text-[11px] text-slate-400">Se crea abierta (sin contraseña), como la Zona de fichas.</p>}
                    </div>
                ))}
                <button type="button" className={`${BOTON_ACCION_SECUNDARIO} w-full`}
                        onClick={() => ponerDef({ redes: [...d.redes, { nombre: `Red ${d.redes.length}`, bandas: [...BANDAS], oculta: false }] })}>
                    <PlusIcon className="h-4 w-4" /> Agregar red
                </button>
            </section>

            <section className="space-y-2">
                <h4 className={TITULO_SECCION}>WAN</h4>
                {d.wans.map((w, i) => (
                    <div key={i} className={`${TARJETA} space-y-2 p-4`}>
                        <div className="flex items-center gap-2">
                            <input className={`${CAMPO} flex-1`} value={w.nombre} onChange={(e) => ponerWan(i, { nombre: e.target.value })} aria-label="Nombre de la WAN" />
                            {w.acs ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.azul}`}>ACS</span> : (
                                <button type="button" aria-label="Quitar WAN" className={BOTON_ICONO} onClick={() => ponerDef({ wans: d.wans.filter((_, j) => j !== i) })}>
                                    <TrashIcon className="h-4 w-4 text-rose-600" />
                                </button>
                            )}
                        </div>
                        {w.acs ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                La que pone el técnico (internet + ACS). No se le cambia VLAN ni modo; solo se le pone el PPPoE del cliente y sus puertos.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <select className={CAMPO} value={w.tipo} onChange={(e) => ponerWan(i, { tipo: e.target.value as 'pppoe' | 'ip' })} aria-label="Tipo">
                                    <option value="ip">IP</option>
                                    <option value="pppoe">PPPoE</option>
                                </select>
                                <select className={CAMPO} value={w.modo} onChange={(e) => ponerWan(i, { modo: e.target.value as 'ruta' | 'puente' })} aria-label="Modo">
                                    <option value="puente">Puente</option>
                                    <option value="ruta">Ruta</option>
                                </select>
                                <input className={CAMPO} inputMode="numeric" value={w.vlan} aria-label="VLAN" placeholder="VLAN"
                                       onChange={(e) => ponerWan(i, { vlan: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                                <input className={CAMPO} value={w.servicio} aria-label="Servicio" onChange={(e) => ponerWan(i, { servicio: e.target.value.toUpperCase() })} />
                            </div>
                        )}
                        <span className={ETIQUETA_CAMPO}>Puertos y redes que salen por aquí</span>
                        <Chips opciones={puertos} elegidos={w.puertos} onChange={(v) => ponerWan(i, { puertos: v })} />
                    </div>
                ))}
                <button type="button" className={`${BOTON_ACCION_SECUNDARIO} w-full`}
                        onClick={() => ponerDef({ wans: [...d.wans, { nombre: 'Puente', acs: false, tipo: 'ip', modo: 'puente', vlan: 4, servicio: 'INTERNET', nat: false, pppoe_cliente: false, puertos: [] }] })}>
                    <PlusIcon className="h-4 w-4" /> Agregar WAN
                </button>
            </section>

            <div className="flex gap-2">
                <button type="button" onClick={onCancelar} className={`${BOTON_ACCION_SECUNDARIO} flex-1`}>Cancelar</button>
                <button type="button" onClick={() => void guardar()} disabled={guardando || !p.nombre.trim()} className={`${BOTON_ACCION_PRIMARIO} flex-1`}>
                    {guardando ? 'Guardando...' : 'Guardar plantilla'}
                </button>
            </div>
        </div>
    );
}

/** Cómo deben quedar los equipos de cada marca/modelo; el sistema se los pone solo. */
export default function PlantillasTr069() {
    const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
    const [editando, setEditando] = useState<Plantilla | null>(null);
    const [equipos, setEquipos] = useState<EquipoTr069[]>([]);
    const [copiarDe, setCopiarDe] = useState('');
    const [copiando, setCopiando] = useState(false);

    const leer = useCallback(async () => {
        try {
            const { data } = await client.get<Plantilla[]>('/tr069/plantillas');
            setPlantillas(data);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudieron leer las plantillas'));
        }
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        client.get<EquipoTr069[]>('/tr069/equipos').then(({ data }) => setEquipos(data)).catch(() => setEquipos([]));
        return () => window.clearTimeout(t);
    }, [leer]);

    const copiar = async () => {
        if (!copiarDe) return;
        setCopiando(true);
        try {
            const { data } = await client.get<{ marca: 'huawei' | 'zte'; modelos: string; definicion: Definicion }>(
                `/tr069/plantillas/desde-equipo/${encodeURIComponent(copiarDe)}`, { timeout: 120000 });
            setEditando({ nombre: '', marca: data.marca, modelos: data.modelos, automatica: false, definicion: data.definicion });
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo leer ese equipo'));
        } finally {
            setCopiando(false);
        }
    };

    const borrar = async (p: Plantilla) => {
        if (!p.id || !window.confirm(`¿Borrar la plantilla ${p.nombre}?`)) return;
        try {
            await client.delete(`/tr069/plantillas/${p.id}`);
            void leer();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo borrar'));
        }
    };

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <EncabezadoPagina
                volver={{ a: '/admin/tr069', texto: 'TR-069' }}
                titulo="Plantillas"
                descripcion="El técnico solo pone la WAN de internet y el ACS; el sistema le pone al equipo lo demás."
            />
            {editando ? (
                <Editor inicial={editando} onCancelar={() => setEditando(null)} onGuardada={() => { setEditando(null); void leer(); }} />
            ) : (
                <>
                    {plantillas.length === 0 && <Vacio icono={DocumentDuplicateIcon} titulo="Sin plantillas" detalle="Copia una de un equipo que ya esté bien configurado." />}
                    {plantillas.map((p) => (
                        <div key={p.id} className={`${TARJETA} flex items-center gap-3 p-4`}>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.nombre}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {p.marca === 'huawei' ? 'Huawei' : 'ZTE'} · {p.modelos || 'todos los modelos'} · {p.definicion.wans.length} WAN · {p.definicion.redes.length} redes
                                </p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.automatica ? PILDORA.verde : PILDORA.neutro}`}>
                                {p.automatica ? 'Automática' : 'Manual'}
                            </span>
                            <button type="button" onClick={() => setEditando(p)} className={BOTON_ACCION_SECUNDARIO}>Editar</button>
                            <button type="button" aria-label="Borrar" onClick={() => void borrar(p)} className={BOTON_ICONO}><TrashIcon className="h-4 w-4 text-rose-600" /></button>
                        </div>
                    ))}
                    <div className={`${TARJETA} space-y-2 p-4`}>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Nueva plantilla</p>
                        <span className={ETIQUETA_CAMPO}>Copiar de un equipo que ya está bien</span>
                        <div className="flex gap-2">
                            <select className={`${CAMPO} flex-1`} value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
                                <option value="">Elige un equipo...</option>
                                {equipos.map((e) => <option key={e.id} value={e.id}>{e.cliente?.nombre ?? 'Sin cliente'} · {e.modelo.replace('%2D', '-')} · {e.serie}</option>)}
                            </select>
                            <button type="button" onClick={() => void copiar()} disabled={!copiarDe || copiando} className={BOTON_ACCION_PRIMARIO}>
                                {copiando ? 'Leyendo...' : 'Copiar'}
                            </button>
                        </div>
                        <button type="button" onClick={() => setEditando(NUEVA)} className={`${BOTON_ACCION_SECUNDARIO} w-full`}>
                            <PlusIcon className="h-4 w-4" /> Empezar en blanco
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
