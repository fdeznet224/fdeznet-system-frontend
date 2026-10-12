import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

/** Pestañas del detalle de la ONU, versión, alta manual y modificar: lo mismo que el panel VSOL. */

type Fila = Record<string, string | number | null | undefined>;
interface Columna { clave: string; titulo: string; formato?: (valor: unknown, fila: Fila) => ReactNode }

const habilitado = (v: unknown) => (String(v) === '1' || String(v).toLowerCase() === 'enable' ? 'Habilitado' : 'Deshabilitado');
const kbps = (v: unknown) => (String(v ?? '') === '0' ? 'Sin límite' : `${v} kbps`);
const ninguno = (v: unknown) => (v == null || v === '' || v === 'N/A' || v === 'NULL' ? '--' : String(v));
const velocidad = (v: unknown) => ({ '0x0': 'Automática' } as Record<string, string>)[String(v)] ?? ninguno(v);
const modoVlan = (v: unknown) => ({ '0': 'Transparente', '1': 'Tag', '2': 'Translate' } as Record<string, string>)[String(v)] ?? ninguno(v);

export function TablaPanel({ titulo, filas, columnas, vacio = 'Sin datos' }: {
    titulo?: string; filas: Fila[]; columnas: Columna[]; vacio?: string;
}) {
    return (
        <section className="vp-bloque">
            {titulo && <h3 className="vp-seccion">{titulo}</h3>}
            <div className="vp-tabla-caja">
                <table className="vp-tabla vp-tabla--compacta">
                    <thead><tr>{columnas.map((c) => <th key={c.clave}>{c.titulo}</th>)}</tr></thead>
                    <tbody>
                        {filas.map((fila, i) => (
                            <tr key={i}>{columnas.map((c) => <td key={c.clave}>{c.formato ? c.formato(fila[c.clave], fila) : ninguno(fila[c.clave])}</td>)}</tr>
                        ))}
                        {filas.length === 0 && <tr><td colSpan={columnas.length} className="vp-vacio">{vacio}</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function Valores({ titulo, valores }: { titulo: string; valores: [string, ReactNode][] }) {
    return (
        <section className="vp-bloque">
            <h3 className="vp-seccion">{titulo}</h3>
            <div className="vp-info-lista vp-valores">
                {valores.map(([etiqueta, valor]) => <div key={etiqueta}>{etiqueta}<b>{valor}</b></div>)}
            </div>
        </section>
    );
}

export const SECCIONES_DETALLE = [
    { clave: 'general', titulo: 'Visión General' },
    { clave: 'linea', titulo: 'Línea' },
    { clave: 'puerto', titulo: 'Puerto' },
    { clave: 'mac', titulo: 'MAC' },
    { clave: 'igmp', titulo: 'IGMP' },
    { clave: 'host_ip', titulo: 'Host IP' },
    { clave: 'tr069', titulo: 'TR069' },
] as const;

export type SeccionDetalle = typeof SECCIONES_DETALLE[number]['clave'];

/* eslint-disable @typescript-eslint/no-explicit-any */
function Contenido({ seccion, datos }: { seccion: Exclude<SeccionDetalle, 'general'>; datos: any }) {
    if (seccion === 'linea') {
        return (
            <>
                <TablaPanel titulo="T-CONT" filas={datos.tcont ?? []} columnas={[
                    { clave: 'tcontid', titulo: 'ID de T-CONT' }, { clave: 'tcontname', titulo: 'Nombre' }, { clave: 'dbaprofile', titulo: 'Perfil DBA' },
                ]} />
                <TablaPanel titulo="GEM Port" filas={datos.gemport ?? []} columnas={[
                    { clave: 'gemid', titulo: 'ID de GEM' }, { clave: 'gemname', titulo: 'Nombre' }, { clave: 'tcontid', titulo: 'T-CONT' },
                    { clave: 'gemstatus', titulo: 'Estado', formato: habilitado }, { clave: 'dstraffic', titulo: 'Tráfico de bajada' },
                    { clave: 'us_pir', titulo: 'Subida (PIR)', formato: kbps }, { clave: 'ds_pir', titulo: 'Bajada (PIR)', formato: kbps },
                ]} />
                <TablaPanel titulo="Servicio" filas={datos.servicio ?? []} columnas={[
                    { clave: 'servicename', titulo: 'Nombre' }, { clave: 'gemid', titulo: 'GEM' }, { clave: 'vlanmode', titulo: 'Modo VLAN', formato: modoVlan },
                    { clave: 'vlanlist', titulo: 'Lista de VLAN' }, { clave: 'coslist', titulo: 'Lista CoS' },
                ]} />
                <TablaPanel titulo="Service Port" filas={datos.service_port ?? []} columnas={[
                    { clave: 'servicePort', titulo: 'ID' }, { clave: 'gemport', titulo: 'GEM' }, { clave: 'vlan', titulo: 'VLAN' },
                    { clave: 'beginVid', titulo: 'VLAN usuario', formato: (_v, f) => (f.beginVid === f.endVid ? ninguno(f.beginVid) : `${f.beginVid}-${f.endVid}`) },
                    { clave: 'sVlan', titulo: 'SVLAN' }, { clave: 'mode', titulo: 'Modo' }, { clave: 'description', titulo: 'Descripción' },
                ]} />
                <TablaPanel titulo="VLAN de Puerto" filas={datos.vlan_puerto ?? []} columnas={[
                    { clave: 'name', titulo: 'Puerto' }, { clave: 'vlantype', titulo: 'Tipo' }, { clave: 'vlanid', titulo: 'VLAN' },
                    { clave: 'vlanpri', titulo: 'Prioridad' }, { clave: 'cvlanid', titulo: 'CVLAN' }, { clave: 'svlanid', titulo: 'SVLAN' },
                ]} />
            </>
        );
    }
    if (seccion === 'puerto') {
        return <TablaPanel titulo="Puertos Ethernet" filas={datos.puertos ?? []} columnas={[
            { clave: 'selectonuport', titulo: 'Puerto', formato: (v) => `ETH ${v}` }, { clave: 'en_port', titulo: 'Puerto', formato: habilitado },
            { clave: 'loop_detect', titulo: 'Detección de lazo', formato: habilitado }, { clave: 'selectPortSpeed', titulo: 'Velocidad', formato: velocidad },
            { clave: 'mac_limit', titulo: 'Límite MAC', formato: (v) => (String(v) === '0' ? 'Sin límite' : ninguno(v)) },
            { clave: 'us_pir', titulo: 'Subida (PIR)', formato: kbps }, { clave: 'ds_pir', titulo: 'Bajada (PIR)', formato: kbps },
        ]} />;
    }
    if (seccion === 'mac') {
        const g = datos.general ?? {};
        const limite = (v: unknown) => (String(v) === '0' ? 'Sin límite' : ninguno(v));
        return <Valores titulo="MAC" valores={[
            ['Tiempo de envejecimiento MAC', String(g.macAging) === '0' ? 'Predeterminado' : `${g.macAging} s`],
            ['Límite de MAC del lado PON', limite(g.ponMLimit)],
            ['Límite de MAC del lado LAN', limite(g.lanMLimit)],
            ['Límite de velocidad de subida', kbps(g.upSLimit)],
            ['Límite de velocidad de bajada', kbps(g.downSLimit)],
            ['Puertos Ethernet', ninguno(datos.puertos_eth)],
        ]} />;
    }
    if (seccion === 'igmp') {
        return <TablaPanel titulo="IGMP por puerto" filas={datos.puertos ?? []} columnas={[
            { clave: 'port', titulo: 'Puerto', formato: (v) => `ETH ${v}` }, { clave: 'max', titulo: 'Máximo de grupos' },
            { clave: 'bandwidth', titulo: 'Ancho de banda', formato: kbps }, { clave: 'enforce', titulo: 'Forzar ancho de banda', formato: habilitado },
            { clave: 'pname', titulo: 'Perfil IGMP' },
        ]} />;
    }
    if (seccion === 'host_ip') {
        return (
            <>
                <Valores titulo="Host IP" valores={[['Host IP que admite la ONU', ninguno(datos.cantidad)]]} />
                {/* Las columnas salen de lo que mande la OLT: casi nunca hay Host IP desde la OLT. */}
                <TablaPanel filas={datos.tabla ?? []} vacio="Sin Host IP configurado desde la OLT"
                    columnas={Object.keys((datos.tabla ?? [])[0] ?? { ID: '' }).map((clave) => ({ clave, titulo: clave }))} />
            </>
        );
    }
    return <Valores titulo="TR069" valores={[
        ['Gestión TR069', habilitado(datos.tr069_mng_en)],
        ['STUN', habilitado(datos.tr069_stun_en)],
        ...Object.entries(datos).filter(([k]) => !['tr069_mng_en', 'tr069_stun_en'].includes(k)).map(([k, v]) => [k, ninguno(v)] as [string, ReactNode]),
    ]} />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function SeccionOnu({ oltId, pon, onuid, seccion }: { oltId: number; pon: number; onuid: number; seccion: Exclude<SeccionDetalle, 'general'> }) {
    const [datos, setDatos] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);

    const leer = useCallback(async () => {
        setError(null);
        setDatos(null);
        try {
            const { data } = await client.get<{ data: unknown }>(`/olts/${oltId}/panel/onus/${pon}/${onuid}/seccion/${seccion}`);
            setDatos(data.data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer la ONU'));
        }
    }, [oltId, pon, onuid, seccion]);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    if (error) return <p className="vp-error">{error}</p>;
    if (!datos) return <div className="vp-vacio">Consultando la ONU…</div>;
    return <div className="vp-secciones"><Contenido seccion={seccion} datos={datos} /></div>;
}

interface VersionFila { onu_id: string; descripcion: string; version_principal: string; version_standby: string; version_hw: string }

export function VersionesPon({ oltId, pon }: { oltId: number; pon: number }) {
    const [filas, setFilas] = useState<VersionFila[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let vivo = true;
        client.get<{ data: VersionFila[] }>(`/olts/${oltId}/panel/pon/${pon}/versiones`)
            .then(({ data }) => vivo && setFilas(data.data))
            .catch((e) => vivo && setError(apiErrorMessage(e, 'No se pudieron leer las versiones')));
        return () => { vivo = false; };
    }, [oltId, pon]);

    if (error) return <p className="vp-error">{error}</p>;
    if (!filas) return <div className="vp-vacio">Leyendo versiones…</div>;
    return <TablaPanel filas={filas as unknown as Fila[]} vacio="Sin ONUs" columnas={[
        { clave: 'onu_id', titulo: 'ID de ONU' }, { clave: 'descripcion', titulo: 'Descripción' },
        { clave: 'version_principal', titulo: 'Versión Principal del Software' }, { clave: 'version_standby', titulo: 'Versión Standby del Software' },
        { clave: 'version_hw', titulo: 'Versión' },
    ]} />;
}

interface Perfiles {
    onu_id_sugerido: string;
    perfil_linea: string[];
    perfil_servicio: string[];
    perfil_alarma: string[];
    perfil_onu: string[];
    perfil_privado: string[];
    perfil_formato: string[];
    modos: Record<string, string>;
}

function usePerfiles(oltId: number, pon: number) {
    const [perfiles, setPerfiles] = useState<Perfiles | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        let vivo = true;
        client.get<{ data: Perfiles }>(`/olts/${oltId}/panel/pon/${pon}/perfiles`)
            .then(({ data }) => vivo && setPerfiles(data.data))
            .catch((e) => vivo && setError(apiErrorMessage(e, 'No se pudieron leer los perfiles')));
        return () => { vivo = false; };
    }, [oltId, pon]);
    return { perfiles, error };
}

function Ventana({ titulo, children, onCerrar }: { titulo: string; children: ReactNode; onCerrar: () => void }) {
    return createPortal(
        <div className="vp-modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="vp-modal-caja vp-modal-caja--ancha">
                <h3>{titulo}</h3>
                {children}
            </div>
        </div>,
        document.body,
    );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return <label className="vp-campo"><span>{etiqueta}</span>{children}</label>;
}

function Opciones({ valores, conNinguno }: { valores: string[]; conNinguno?: boolean }) {
    return (
        <>
            {conNinguno && <option value="N/A">N/A</option>}
            {valores.map((v) => <option key={v} value={v}>{v}</option>)}
        </>
    );
}

export function AltaManual({ oltId, pon, onCerrar, onListo }: { oltId: number; pon: number; onCerrar: () => void; onListo: () => void }) {
    const { perfiles, error } = usePerfiles(oltId, pon);
    const [form, setForm] = useState<Record<string, string>>({ modo: '0' });
    const [enviando, setEnviando] = useState(false);
    const valor = (clave: string, defecto = '') => form[clave] ?? defecto;
    const poner = (clave: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [clave]: e.target.value }));
    const modo = valor('modo', '0');
    const pideSn = modo === '0' || modo === '4';
    const pideLoid = modo === '1' || modo === '2';
    const pideClave = modo === '2' || modo === '3' || modo === '4';

    const guardar = async () => {
        if (!perfiles) return;
        setEnviando(true);
        try {
            await client.post(`/olts/${oltId}/panel/pon/${pon}/alta`, {
                onuid: Number(valor('onuid', perfiles.onu_id_sugerido)) || null,
                modo,
                sn: valor('sn') || null,
                loid: valor('loid') || null,
                clave: valor('clave') || null,
                perfil_onu: valor('perfil_onu', perfiles.perfil_onu[0] ?? 'default'),
                perfil_linea: valor('perfil_linea', perfiles.perfil_linea[0] ?? 'N/A'),
                perfil_servicio: valor('perfil_servicio', perfiles.perfil_servicio[0] ?? 'N/A'),
                perfil_alarma: valor('perfil_alarma', perfiles.perfil_alarma[0] ?? 'N/A'),
                perfil_privado: valor('perfil_privado', 'N/A'),
                perfil_formato: valor('perfil_formato', 'N/A'),
            });
            toast.success('ONU añadida en la OLT');
            onListo();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'La OLT no añadió la ONU'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Ventana titulo={`Añadir Manualmente · PON 0/${pon}`} onCerrar={onCerrar}>
            {error && <p className="vp-error">{error}</p>}
            {!perfiles && !error && <p>Leyendo perfiles de la OLT…</p>}
            {perfiles && (
                <div className="vp-formulario">
                    <Campo etiqueta="ID de ONU"><input inputMode="numeric" value={valor('onuid', perfiles.onu_id_sugerido)} onChange={poner('onuid')} /></Campo>
                    <Campo etiqueta="Modo de autenticación">
                        <select value={modo} onChange={poner('modo')}>
                            {Object.entries(perfiles.modos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </Campo>
                    {pideSn && <Campo etiqueta="SN"><input placeholder="HWTC0B46D3AF" value={valor('sn')} onChange={poner('sn')} /></Campo>}
                    {pideLoid && <Campo etiqueta="LOID"><input value={valor('loid')} onChange={poner('loid')} /></Campo>}
                    {pideClave && <Campo etiqueta="Contraseña"><input value={valor('clave')} onChange={poner('clave')} /></Campo>}
                    <Campo etiqueta="Perfil de ONU"><select value={valor('perfil_onu', perfiles.perfil_onu[0])} onChange={poner('perfil_onu')}><Opciones valores={perfiles.perfil_onu} /></select></Campo>
                    <Campo etiqueta="Perfil de Línea"><select value={valor('perfil_linea', perfiles.perfil_linea[0] ?? 'N/A')} onChange={poner('perfil_linea')}><Opciones valores={perfiles.perfil_linea} conNinguno /></select></Campo>
                    <Campo etiqueta="Perfil de Servicio"><select value={valor('perfil_servicio', perfiles.perfil_servicio[0] ?? 'N/A')} onChange={poner('perfil_servicio')}><Opciones valores={perfiles.perfil_servicio} conNinguno /></select></Campo>
                    <Campo etiqueta="Perfil de Alarma"><select value={valor('perfil_alarma', perfiles.perfil_alarma[0] ?? 'N/A')} onChange={poner('perfil_alarma')}><Opciones valores={perfiles.perfil_alarma} conNinguno /></select></Campo>
                    {perfiles.perfil_privado.length > 0 && <Campo etiqueta="Perfil Privado"><select value={valor('perfil_privado', 'N/A')} onChange={poner('perfil_privado')}><Opciones valores={perfiles.perfil_privado} conNinguno /></select></Campo>}
                    {perfiles.perfil_formato.length > 0 && <Campo etiqueta="Perfil de Formato"><select value={valor('perfil_formato', 'N/A')} onChange={poner('perfil_formato')}><Opciones valores={perfiles.perfil_formato} conNinguno /></select></Campo>}
                </div>
            )}
            <div className="vp-modal-botones">
                <button type="button" className="vp-btn" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                <button type="button" className="vp-btn vp-btn--lleno" onClick={() => void guardar()} disabled={!perfiles || enviando}>{enviando ? 'Añadiendo…' : 'Añadir'}</button>
            </div>
        </Ventana>
    );
}

export function ModificarOnu({ oltId, onu, onCerrar, onListo }: {
    oltId: number;
    onu: { pon: number; onuid: number; onu_id: string; serial: string; perfil: string; modo: string };
    onCerrar: () => void;
    onListo: () => void;
}) {
    const { perfiles, error } = usePerfiles(oltId, onu.pon);
    const [modo, setModo] = useState(onu.modo.toUpperCase() === 'LOID' ? '1' : '0');
    const [valor, setValor] = useState(onu.modo.toUpperCase() === 'LOID' ? '' : onu.serial);
    const [perfil, setPerfil] = useState(onu.perfil);
    const [enviando, setEnviando] = useState(false);

    const guardar = async () => {
        const cambiaId = valor.trim() !== '' && valor.trim().toUpperCase() !== onu.serial.toUpperCase();
        const cambiaPerfil = perfil !== onu.perfil;
        if (!cambiaId && !cambiaPerfil) {
            onCerrar();
            return;
        }
        setEnviando(true);
        try {
            await client.post(`/olts/${oltId}/panel/onus/${onu.pon}/${onu.onuid}/modificar`, {
                serial: onu.serial, modo, valor: cambiaId ? valor.trim() : null, perfil: cambiaPerfil ? perfil : null,
            });
            toast.success('ONU modificada en la OLT');
            onListo();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'La OLT no aplicó el cambio'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Ventana titulo={`Modificar ${onu.onu_id}`} onCerrar={onCerrar}>
            {error && <p className="vp-error">{error}</p>}
            <div className="vp-formulario">
                <Campo etiqueta="Modo de autenticación">
                    <select value={modo} onChange={(e) => setModo(e.target.value)}>
                        <option value="0">SN</option>
                        <option value="1">LOID</option>
                    </select>
                </Campo>
                <Campo etiqueta={modo === '0' ? 'SN' : 'LOID'}><input value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
                <Campo etiqueta="Perfil de ONU">
                    <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                        <Opciones valores={Array.from(new Set([onu.perfil, ...(perfiles?.perfil_onu ?? [])]))} />
                    </select>
                </Campo>
            </div>
            <p className="vp-nota">Cambiar el SN o LOID hace que la OLT espere otra ONU en este lugar.</p>
            <div className="vp-modal-botones">
                <button type="button" className="vp-btn" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                <button type="button" className="vp-btn vp-btn--lleno" onClick={() => void guardar()} disabled={enviando}>{enviando ? 'Aplicando…' : 'Aplicar'}</button>
            </div>
        </Ventana>
    );
}
