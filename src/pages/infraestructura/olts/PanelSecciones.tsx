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

/* ---------------------------------------------------------------- edición */

type Editar = (operacion: string, datos: Record<string, string>, titulo: string, peligro?: boolean) => void;
interface Opcion { valor: string; texto: string }
interface CampoForm { clave: string; etiqueta: string; tipo?: 'texto' | 'numero' | 'select' | 'switch' | 'clave'; opciones?: Opcion[] }

const op = (lista: [string, string][]): Opcion[] => lista.map(([valor, texto]) => ({ valor, texto }));
const SI_NO = op([['1', 'Habilitado'], ['0', 'Deshabilitado']]);
const VELOCIDADES = op([['0x0', 'auto'], ['0x1', 'full-10'], ['0x2', 'full-100'], ['0x3', 'full-1000'], ['0x5', 'full-10G'], ['0x6', 'full-2.5G'],
    ['0x7', 'full-5G'], ['0x8', 'full-25G'], ['0x9', 'full-40G'], ['0x11', 'half-10'], ['0x12', 'half-100'], ['0x13', 'half-1000']]);
const ETIQUETAS_ESTADO: Record<string, string> = {
    selectonuport: 'Puerto', link_status: 'Enlace', admin_status: 'Admin', speed_config: 'Velocidad configurada',
    speed_status: 'Velocidad real', loop_status: 'Lazo', max_frame: 'Trama máxima',
};
const enciende = (v: unknown) => (String(v).toLowerCase() === 'enable' ? '1' : '0');
const nombres = (lista: unknown): Opcion[] => (Array.isArray(lista) ? lista.map((v) => ({ valor: String(v), texto: String(v) })) : []);
const texto = (v: unknown) => (v == null || v === 'N/A' || v === 'NULL' ? '' : String(v));

function Formulario({ titulo, campos, inicial, operacion, editar, boton = 'Aplicar', peligro, extra }: {
    titulo: string; campos: CampoForm[]; inicial?: Record<string, unknown>; operacion: string; editar: Editar;
    boton?: string; peligro?: boolean; extra?: Record<string, string>;
}) {
    const base = () => Object.fromEntries(campos.map((c) => [c.clave, texto(inicial?.[c.clave]) || (c.opciones?.[0]?.valor ?? '')]));
    const [valores, setValores] = useState<Record<string, string>>(base);
    const clave = JSON.stringify(inicial ?? {});
    useEffect(() => {
        const t = window.setTimeout(() => setValores(base()), 0);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);

    return (
        <form className="vp-form-op" onSubmit={(e) => { e.preventDefault(); editar(operacion, { ...valores, ...extra }, titulo, peligro); }}>
            <h4>{titulo}</h4>
            <div className="vp-formulario">
                {campos.map((c) => (
                    <Campo key={c.clave} etiqueta={c.etiqueta}>
                        {c.tipo === 'select' || c.tipo === 'switch' ? (
                            <select value={valores[c.clave] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}>
                                {(c.tipo === 'switch' ? SI_NO : c.opciones ?? []).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                            </select>
                        ) : (
                            <input
                                type={c.tipo === 'clave' ? 'password' : 'text'}
                                inputMode={c.tipo === 'numero' ? 'numeric' : undefined}
                                value={valores[c.clave] ?? ''}
                                onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
                            />
                        )}
                    </Campo>
                ))}
            </div>
            <div className="vp-modal-botones">
                <button type="submit" className={`vp-btn vp-btn--lleno${peligro ? ' vp-btn--peligro' : ''}`}>{boton}</button>
            </div>
        </form>
    );
}

function BotonBorrar({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
    return <button type="button" className="vp-btn vp-btn--peligro vp-btn--chico" aria-label={etiqueta} onClick={onClick}>Borrar</button>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Contenido({ seccion, datos, editar }: { seccion: Exclude<SeccionDetalle, 'general'>; datos: any; editar: Editar | null }) {
    const [puerto, setPuerto] = useState('1');
    const [tipoIgmp, setTipoIgmp] = useState('0');
    const puertos: any[] = datos.puertos ?? [];
    const opcionesPuerto = op((puertos.length ? puertos : [{ selectonuport: '1' }]).map((p, i) => [String(p.selectonuport ?? p.port ?? i + 1), `ETH ${p.selectonuport ?? p.port ?? i + 1}`]));
    const borrar = (operacion: string, fila: Record<string, unknown>, titulo: string) => editar?.(
        operacion, Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, texto(v)])), titulo, true,
    );

    if (seccion === 'linea') {
        const dba = nombres(datos.perfiles_dba);
        return (
            <>
                <TablaPanel titulo="T-CONT" filas={datos.tcont ?? []} columnas={[
                    { clave: 'tcontid', titulo: 'ID de T-CONT' }, { clave: 'tcontname', titulo: 'Nombre' }, { clave: 'dbaprofile', titulo: 'Perfil DBA' },
                    ...(editar ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => <BotonBorrar etiqueta={`Borrar T-CONT ${f.tcontid}`} onClick={() => borrar('tcont_borrar', f, `Borrar T-CONT ${f.tcontid}`)} /> }] : []),
                ]} />
                {editar && <Formulario titulo="Agregar T-CONT" operacion="tcont_agregar" editar={editar} boton="Agregar"
                    inicial={{ tcontid: String((datos.tcont?.length ?? 0) + 1), tcontname: `tcont_${(datos.tcont?.length ?? 0) + 1}` }}
                    campos={[{ clave: 'tcontid', etiqueta: 'ID de T-CONT', tipo: 'numero' }, { clave: 'tcontname', etiqueta: 'Nombre' },
                        dba.length ? { clave: 'dbaprofile', etiqueta: 'Perfil DBA', tipo: 'select', opciones: dba } : { clave: 'dbaprofile', etiqueta: 'Perfil DBA' }]} />}

                <TablaPanel titulo="GEM Port" filas={datos.gemport ?? []} columnas={[
                    { clave: 'gemid', titulo: 'ID de GEM' }, { clave: 'gemname', titulo: 'Nombre' }, { clave: 'tcontid', titulo: 'T-CONT' },
                    { clave: 'gemstatus', titulo: 'Estado', formato: habilitado }, { clave: 'dstraffic', titulo: 'Tráfico de bajada' },
                    { clave: 'us_pir', titulo: 'Subida (PIR)', formato: kbps }, { clave: 'ds_pir', titulo: 'Bajada (PIR)', formato: kbps },
                    ...(editar ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => <BotonBorrar etiqueta={`Borrar GEM ${f.gemid}`} onClick={() => borrar('gemport_borrar', f, `Borrar GEM port ${f.gemid}`)} /> }] : []),
                ]} />
                {editar && <Formulario titulo="Agregar GEM Port" operacion="gemport_agregar" editar={editar} boton="Agregar"
                    inicial={{ gemid: String((datos.gemport?.length ?? 0) + 1), gemname: `gem_${(datos.gemport?.length ?? 0) + 1}`, tcontid: '1', us_cir: '0', us_pir: '0', ds_cir: '0', ds_pir: '0', dstraffic: 'default' }}
                    campos={[{ clave: 'gemid', etiqueta: 'ID de GEM', tipo: 'numero' }, { clave: 'gemname', etiqueta: 'Nombre' }, { clave: 'tcontid', etiqueta: 'T-CONT', tipo: 'numero' },
                        { clave: 'dstraffic', etiqueta: 'Tráfico de bajada' }, { clave: 'us_cir', etiqueta: 'Subida CIR (kbps)', tipo: 'numero' }, { clave: 'us_pir', etiqueta: 'Subida PIR (kbps)', tipo: 'numero' },
                        { clave: 'ds_cir', etiqueta: 'Bajada CIR (kbps)', tipo: 'numero' }, { clave: 'ds_pir', etiqueta: 'Bajada PIR (kbps)', tipo: 'numero' }]} />}

                <TablaPanel titulo="Servicio" filas={datos.servicio ?? []} columnas={[
                    { clave: 'servicename', titulo: 'Nombre' }, { clave: 'gemid', titulo: 'GEM' }, { clave: 'vlanmode', titulo: 'Modo VLAN', formato: modoVlan },
                    { clave: 'vlanlist', titulo: 'Lista de VLAN' }, { clave: 'coslist', titulo: 'Lista CoS' },
                    ...(editar ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => <BotonBorrar etiqueta={`Borrar servicio ${f.servicename}`} onClick={() => borrar('servicio_borrar', f, `Borrar servicio ${f.servicename}`)} /> }] : []),
                ]} />
                {editar && <Formulario titulo="Agregar servicio" operacion="servicio_agregar" editar={editar} boton="Agregar"
                    inicial={{ servicename: `ser_${(datos.servicio?.length ?? 0) + 1}`, gemid: '1', vlanmode: '1', portMode: '1' }}
                    campos={[{ clave: 'servicename', etiqueta: 'Nombre' }, { clave: 'gemid', etiqueta: 'GEM', tipo: 'numero' },
                        { clave: 'vlanmode', etiqueta: 'Modo VLAN', tipo: 'select', opciones: op([['1', 'Tag'], ['2', 'Untag']]) },
                        { clave: 'vlanlist', etiqueta: 'Lista de VLAN (ej. 10,4)' },
                        { clave: 'portMode', etiqueta: 'Modo de puerto', tipo: 'select', opciones: op([['1', 'N/A'], ['2', 'Eth'], ['3', 'IPHost']]) },
                        { clave: 'portNum', etiqueta: 'Número de puerto' }]} />}

                <TablaPanel titulo="Service Port" filas={datos.service_port ?? []} columnas={[
                    { clave: 'servicePort', titulo: 'ID' }, { clave: 'gemport', titulo: 'GEM' }, { clave: 'vlan', titulo: 'VLAN' },
                    { clave: 'beginVid', titulo: 'VLAN usuario', formato: (_v, f) => (f.beginVid === f.endVid ? ninguno(f.beginVid) : `${f.beginVid}-${f.endVid}`) },
                    { clave: 'sVlan', titulo: 'SVLAN' }, { clave: 'mode', titulo: 'Modo' }, { clave: 'description', titulo: 'Descripción' },
                    ...(editar ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => <BotonBorrar etiqueta={`Borrar service port ${f.servicePort}`} onClick={() => editar('service_port_borrar', { srvid: String(f.servicePort) }, `Borrar service port ${f.servicePort}`, true)} /> }] : []),
                ]} />
                {editar && <Formulario titulo="Agregar Service Port" operacion="service_port_agregar" editar={editar} boton="Agregar"
                    inicial={{ srvid: String((datos.service_port?.length ?? 0) + 1), gemid: '1', servicemode: '0' }}
                    campos={[{ clave: 'srvid', etiqueta: 'ID', tipo: 'numero' }, { clave: 'gemid', etiqueta: 'GEM', tipo: 'numero' },
                        { clave: 'servicemode', etiqueta: 'Modo', tipo: 'select', opciones: op([['0', 'CVLAN']]) },
                        { clave: 'bvid', etiqueta: 'VLAN de usuario', tipo: 'numero' }, { clave: 'tvid', etiqueta: 'VLAN traducida', tipo: 'numero' },
                        { clave: 'description', etiqueta: 'Descripción' }]} />}

                <TablaPanel titulo="VLAN de Puerto" filas={datos.vlan_puerto ?? []} columnas={[
                    { clave: 'name', titulo: 'Puerto' }, { clave: 'vlantype', titulo: 'Tipo' }, { clave: 'vlanid', titulo: 'VLAN' },
                    { clave: 'vlanpri', titulo: 'Prioridad' }, { clave: 'cvlanid', titulo: 'CVLAN' }, { clave: 'svlanid', titulo: 'SVLAN' },
                    ...(editar ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => <BotonBorrar etiqueta={`Borrar VLAN de ${f.name}`}
                        onClick={() => editar('vlan_puerto_borrar', { name: texto(f.name), vlantype: texto(f.del_vlantype ?? f.vlantype), porttype: texto(f.del_porttype ?? f.porttype) }, `Borrar VLAN de ${f.name}`, true)} /> }] : []),
                ]} />
                {editar && <Formulario titulo="Agregar VLAN de puerto" operacion="vlan_puerto_agregar" editar={editar} boton="Agregar"
                    inicial={{ porttype: '0', portnum: '1', vlantype: '3' }}
                    campos={[{ clave: 'porttype', etiqueta: 'Tipo de puerto', tipo: 'select', opciones: op([['0', 'Eth'], ['1', 'WiFi'], ['2', 'Veip']]) },
                        { clave: 'portnum', etiqueta: 'Número de puerto', tipo: 'numero' },
                        { clave: 'vlantype', etiqueta: 'Modo', tipo: 'select', opciones: op([['1', 'Transparent'], ['2', 'Trunk'], ['3', 'Tag'], ['4', 'Hybrid']]) },
                        { clave: 'vlanid', etiqueta: 'VLAN', tipo: 'numero' }, { clave: 'vlanpri', etiqueta: 'Prioridad (0-7)', tipo: 'numero' }]} />}
            </>
        );
    }
    if (seccion === 'puerto') {
        const configurado = puertos.find((p) => String(p.selectonuport) === puerto) ?? {};
        const real = (datos.estado ?? []).find((p: any) => String(p.selectonuport) === puerto);
        // El formulario parte del estado real: la OLT reporta en_port=0 aunque el puerto esté encendido,
        // y aplicar ese 0 apagaría el puerto del cliente.
        const actual = real ? { ...configurado, en_port: enciende(real.admin_status), loop_detect: enciende(real.loop_status) } : configurado;
        return (
            <>
                <TablaPanel titulo="Estado de los puertos" filas={datos.estado ?? []} vacio="La ONU no reportó el estado de sus puertos"
                    columnas={Object.keys(ETIQUETAS_ESTADO).map((clave) => ({ clave, titulo: ETIQUETAS_ESTADO[clave], formato: clave === 'selectonuport' ? (v: unknown) => `ETH ${v}` : undefined }))} />
                <TablaPanel titulo="Configuración desde la OLT" filas={puertos} columnas={[
                    { clave: 'selectonuport', titulo: 'Puerto', formato: (v) => `ETH ${v}` }, { clave: 'en_port', titulo: 'Admin desde la OLT', formato: habilitado },
                    { clave: 'loop_detect', titulo: 'Detección de lazo', formato: habilitado }, { clave: 'selectPortSpeed', titulo: 'Velocidad', formato: velocidad },
                    { clave: 'mac_limit', titulo: 'Límite MAC', formato: (v) => (String(v) === '0' ? 'Sin límite' : ninguno(v)) },
                    { clave: 'us_pir', titulo: 'Subida (PIR)', formato: kbps }, { clave: 'ds_pir', titulo: 'Bajada (PIR)', formato: kbps },
                ]} />
                {editar && (
                    <>
                        <Campo etiqueta="Puerto a configurar">
                            <select value={puerto} onChange={(e) => setPuerto(e.target.value)}>{opcionesPuerto.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>
                        </Campo>
                        <Formulario titulo={`ETH ${puerto}: datos básicos`} operacion="puerto_basico" editar={editar} inicial={actual} extra={{ selectonuport: puerto }}
                            campos={[{ clave: 'en_port', etiqueta: 'Admin desde la OLT', tipo: 'switch' }, { clave: 'loop_detect', etiqueta: 'Detección de lazo', tipo: 'switch' },
                                { clave: 'selectPortSpeed', etiqueta: 'Velocidad', tipo: 'select', opciones: VELOCIDADES }, { clave: 'mac_limit', etiqueta: 'Límite MAC (0-255)', tipo: 'numero' }]} />
                        <Formulario titulo={`ETH ${puerto}: límite de subida`} operacion="puerto_subida" editar={editar} inicial={actual} extra={{ selectonuport: puerto }}
                            campos={[{ clave: 'us_cir', etiqueta: 'CIR (kbps)', tipo: 'numero' }, { clave: 'us_pir', etiqueta: 'PIR (kbps)', tipo: 'numero' }]} />
                        <Formulario titulo={`ETH ${puerto}: límite de bajada`} operacion="puerto_bajada" editar={editar} inicial={actual} extra={{ selectonuport: puerto }}
                            campos={[{ clave: 'ds_cir', etiqueta: 'CIR (kbps)', tipo: 'numero' }, { clave: 'ds_pir', etiqueta: 'PIR (kbps)', tipo: 'numero' }]} />
                    </>
                )}
            </>
        );
    }
    if (seccion === 'mac') {
        const g = datos.general ?? {};
        const limite = (v: unknown) => (String(v) === '0' ? 'Sin límite' : ninguno(v));
        return (
            <>
                <Valores titulo="MAC" valores={[
                    ['Tiempo de envejecimiento MAC', String(g.macAging) === '0' ? 'Predeterminado' : `${g.macAging} s`],
                    ['Límite de MAC del lado PON', limite(g.ponMLimit)],
                    ['Límite de MAC del lado LAN', limite(g.lanMLimit)],
                    ['Límite de velocidad de subida', kbps(g.upSLimit)],
                    ['Límite de velocidad de bajada', kbps(g.downSLimit)],
                    ['Puertos Ethernet', ninguno(datos.puertos_eth)],
                ]} />
                {editar && (
                    <>
                        <Formulario titulo="Límites de MAC" operacion="mac_general" editar={editar} inicial={g}
                            campos={[{ clave: 'macAging', etiqueta: 'Envejecimiento MAC (0-65535 s)', tipo: 'numero' },
                                { clave: 'ponMLimit', etiqueta: 'Límite MAC lado PON (0-65535)', tipo: 'numero' }, { clave: 'lanMLimit', etiqueta: 'Límite MAC lado LAN (0-65535)', tipo: 'numero' }]} />
                        <Formulario titulo="Tabla MAC de la ONU" operacion="mac_limpiar" editar={editar} campos={[]} boton="Limpiar tabla MAC" peligro />
                    </>
                )}
            </>
        );
    }
    if (seccion === 'igmp') {
        const actual = puertos.find((p) => String(p.port) === puerto) ?? {};
        const perfiles = nombres(datos.perfiles_igmp);
        const extra = (n: string) => ({ [`portnum${n}`]: puerto, [`porttype${n}`]: tipoIgmp });
        return (
            <>
                <TablaPanel titulo="IGMP por puerto" filas={puertos} columnas={[
                    { clave: 'port', titulo: 'Puerto', formato: (v) => `ETH ${v}` }, { clave: 'max', titulo: 'Máximo de grupos' },
                    { clave: 'bandwidth', titulo: 'Ancho de banda', formato: kbps }, { clave: 'enforce', titulo: 'Forzar ancho de banda', formato: habilitado },
                    { clave: 'pname', titulo: 'Perfil IGMP' },
                ]} />
                {editar && (
                    <>
                        <div className="vp-formulario">
                            <Campo etiqueta="Puerto"><select value={puerto} onChange={(e) => setPuerto(e.target.value)}>{opcionesPuerto.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select></Campo>
                            <Campo etiqueta="Tipo de puerto"><select value={tipoIgmp} onChange={(e) => setTipoIgmp(e.target.value)}><option value="0">eth</option><option value="1">veip</option></select></Campo>
                        </div>
                        <Formulario titulo="Máximo de grupos" operacion="igmp_maximo" editar={editar} inicial={actual} extra={extra('')}
                            campos={[{ clave: 'max', etiqueta: 'Máximo de grupos (0-65535)', tipo: 'numero' }]} />
                        <Formulario titulo="Ancho de banda" operacion="igmp_ancho" editar={editar} inicial={{ ...actual, enforce: String(actual.enforce).toLowerCase() === 'enable' ? '1' : '0' }} extra={extra('1')}
                            campos={[{ clave: 'bandwidth', etiqueta: 'Ancho de banda (0-65535)', tipo: 'numero' }, { clave: 'enforce', etiqueta: 'Forzar', tipo: 'switch' }]} />
                        <Formulario titulo="Perfil IGMP" operacion="igmp_perfil" editar={editar} inicial={actual} extra={extra('2')} boton="Asignar"
                            campos={[perfiles.length ? { clave: 'pname', etiqueta: 'Perfil', tipo: 'select', opciones: perfiles } : { clave: 'pname', etiqueta: 'Perfil' }]} />
                        <Formulario titulo="Quitar perfil IGMP" operacion="igmp_perfil_quitar" editar={editar} inicial={actual} extra={extra('2')} boton="Quitar perfil" peligro
                            campos={[{ clave: 'pname', etiqueta: 'Perfil' }]} />
                    </>
                )}
            </>
        );
    }
    if (seccion === 'host_ip') {
        const cantidad = Number(datos.cantidad) || 1;
        const ids = op(Array.from({ length: cantidad }, (_, i) => [String(i + 1), `IP Host ${i + 1}`]));
        const tabla: any[] = datos.tabla ?? [];
        const columnas: Columna[] = Object.keys(tabla[0] ?? { ID: '' }).map((clave) => ({ clave, titulo: clave }));
        return (
            <>
                <Valores titulo="Host IP" valores={[['Host IP que admite la ONU', ninguno(datos.cantidad)]]} />
                {/* Las columnas salen de lo que mande la OLT: casi nunca hay Host IP desde la OLT. */}
                <TablaPanel filas={tabla} vacio="Sin Host IP configurado desde la OLT" columnas={[
                    ...columnas,
                    ...(editar && tabla.length ? [{ clave: '_', titulo: 'Acción', formato: (_v: unknown, f: Fila) => {
                        const id = texto(f.selectonuport ?? f.iphostNum ?? f.id ?? f.ID);
                        return <BotonBorrar etiqueta={`Borrar IP Host ${id}`} onClick={() => editar('iphost_borrar', { selectonuport: id, iphostNum: id }, `Borrar IP Host ${id}`, true)} />;
                    } }] : []),
                ]} />
                {editar && (
                    <>
                        <Formulario titulo="Agregar IP Host" operacion="iphost_agregar" editar={editar} boton="Agregar" inicial={{ selectipmode: '1' }}
                            campos={[{ clave: 'selectonuport', etiqueta: 'IP Host', tipo: 'select', opciones: ids }, { clave: 'iphost_desc', etiqueta: 'Descripción' },
                                { clave: 'selectipmode', etiqueta: 'Modo', tipo: 'select', opciones: op([['1', 'DHCP'], ['2', 'Static-IP']]) },
                                { clave: 'ipAddr', etiqueta: 'IP (estática)' }, { clave: 'mask', etiqueta: 'Máscara (estática)' }, { clave: 'gateway', etiqueta: 'Puerta de enlace' },
                                { clave: 'dns1', etiqueta: 'DNS 1' }, { clave: 'dns2', etiqueta: 'DNS 2' }]} />
                        <Formulario titulo="VLAN del IP Host" operacion="iphost_vlan" editar={editar}
                            campos={[{ clave: 'selectonuport', etiqueta: 'IP Host', tipo: 'select', opciones: ids }, { clave: 'vlan', etiqueta: 'VLAN', tipo: 'numero' },
                                { clave: 'priority', etiqueta: 'Prioridad (0-7)', tipo: 'numero' }]} />
                    </>
                )}
            </>
        );
    }
    return (
        <>
            <Valores titulo="TR069" valores={[
                ['Gestión TR069', habilitado(datos.tr069_mng_en)],
                ['STUN', habilitado(datos.tr069_stun_en)],
                ...Object.entries(datos).filter(([k]) => !['tr069_mng_en', 'tr069_stun_en'].includes(k) && !/password/i.test(k)).map(([k, v]) => [k, ninguno(v)] as [string, ReactNode]),
            ]} />
            {editar && (
                <>
                    <Formulario titulo="Gestión TR069" operacion="tr069_gestion" editar={editar} inicial={datos}
                        campos={[{ clave: 'tr069_mng_en', etiqueta: 'Gestión TR069', tipo: 'switch' }, { clave: 'acsServerAddress', etiqueta: 'Servidor ACS' },
                            { clave: 'acsServerUsername', etiqueta: 'Usuario ACS' }, { clave: 'acsServerPassword', etiqueta: 'Contraseña ACS', tipo: 'clave' },
                            { clave: 'inform', etiqueta: 'Inform periódico', tipo: 'switch' }, { clave: 'informIntervalTime', etiqueta: 'Intervalo de inform (s)', tipo: 'numero' },
                            { clave: 'reverse_username', etiqueta: 'Usuario de conexión inversa' }, { clave: 'reverse_password', etiqueta: 'Contraseña de conexión inversa', tipo: 'clave' }]} />
                    <Formulario titulo="STUN" operacion="tr069_stun" editar={editar} inicial={datos}
                        campos={[{ clave: 'tr069_stun_en', etiqueta: 'STUN', tipo: 'switch' }, { clave: 'stunServerAddress', etiqueta: 'Servidor STUN' },
                            { clave: 'stunServerPort', etiqueta: 'Puerto STUN', tipo: 'numero' }, { clave: 'stunUsername', etiqueta: 'Usuario STUN' },
                            { clave: 'stunPassword', etiqueta: 'Contraseña STUN', tipo: 'clave' }]} />
                </>
            )}
        </>
    );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function SeccionOnu({ oltId, pon, onuid, serial, onuId, puedeCambiar, seccion }: {
    oltId: number; pon: number; onuid: number; serial: string; onuId: string; puedeCambiar: boolean; seccion: Exclude<SeccionDetalle, 'general'>;
}) {
    const [datos, setDatos] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendiente, setPendiente] = useState<{ operacion: string; datos: Record<string, string>; titulo: string; peligro?: boolean } | null>(null);
    const [enviando, setEnviando] = useState(false);

    // Al volver a leer tras aplicar, se quedan los datos anteriores: así no se pierde el puerto elegido.
    const leer = useCallback(async () => {
        setError(null);
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

    const aplicar = async () => {
        if (!pendiente) return;
        setEnviando(true);
        try {
            await client.post(`/olts/${oltId}/panel/onus/${pon}/${onuid}/config`, { serial, operacion: pendiente.operacion, datos: pendiente.datos });
            toast.success(`${pendiente.titulo}: aplicado en la ONU`);
            setPendiente(null);
            void leer();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'La OLT no aplicó el cambio'));
        } finally {
            setEnviando(false);
        }
    };

    if (error) return <p className="vp-error">{error}</p>;
    if (!datos) return <div className="vp-vacio">Consultando la ONU…</div>;
    return (
        <div className="vp-secciones">
            <Contenido seccion={seccion} datos={datos}
                editar={puedeCambiar ? (operacion, valores, titulo, peligro) => setPendiente({ operacion, datos: valores, titulo, peligro }) : null} />
            {pendiente && (
                <Ventana titulo={pendiente.titulo} onCerrar={() => setPendiente(null)}>
                    <p>Se aplica en la ONU <b>{onuId}</b>. Algunos cambios pueden dejar al cliente sin servicio hasta corregirlos.</p>
                    <div className="vp-modal-botones">
                        <button type="button" className="vp-btn" onClick={() => setPendiente(null)} disabled={enviando}>Cancelar</button>
                        <button type="button" className={`vp-btn vp-btn--lleno${pendiente.peligro ? ' vp-btn--peligro' : ''}`} onClick={() => void aplicar()} disabled={enviando}>
                            {enviando ? 'Aplicando…' : 'Confirmar'}
                        </button>
                    </div>
                </Ventana>
            )}
        </div>
    );
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
