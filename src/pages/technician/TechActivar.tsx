import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    ClipboardDocumentIcon,
    MapPinIcon,
    QrCodeIcon,
    SignalIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Scanner } from '@yudiel/react-qr-scanner';

import client from '../../api/axios';
import { useSync } from '@/context/sync/context';
import { cachedRequest, getCachedValue, setCachedValue } from '../../offline/db';
import { apiErrorMessage } from '@/utils/apiError';
import SugerenciaNap from '@/components/naps/SugerenciaNap';

interface Opcion {
    id: number;
    nombre: string;
}

interface Catalogo {
    solicitud: {
        id: number;
        version: number;
        nombre?: string | null;
        telefono?: string | null;
        direccion?: string | null;
        zona_id?: number | null;
        plan_id?: number | null;
        descripcion?: string | null;
        cliente_id?: number | null;
        contrato?: string | null;
        onu_id?: number | null;
    };
    zonas: (Opcion & { plantilla_id?: number | null })[];
    zona_id?: number | null;
    infraestructura?: {
        router?: Opcion & { modo: string } | null;
        olt?: Opcion | null;
        red?: Opcion & { cidr?: string } | null;
        planes: (Opcion & { precio: number })[];
        naps: (Opcion & { capacidad: number })[];
        plantilla_id?: number | null;
    } | null;
    plantillas: (Opcion & { dia_pago?: number; meses_gratis_instalacion?: number })[];
    onus: { id: number; identificador: string; modelo?: string | null }[];
    usuario_pppoe: string;
}

interface Resultado {
    contrato: string;
    nombre: string;
    plan: string;
    modo: string;
    usuario_pppoe?: string | null;
    password_pppoe?: string | null;
    ip?: string | null;
    onu?: string | null;
    senal?: { potencia?: string; estado?: string; recomendacion?: string } | null;
    cambios: string[];
    tipo_alta?: TipoAlta;
    meses_gratis?: number;
}

// nueva = lleva los meses gratis de la plantilla; portabilidad = viene de otra
// compañía y solo paga su mensualidad.
type TipoAlta = 'nueva' | 'portabilidad';

interface Formulario {
    nombre: string;
    telefono: string;
    direccion: string;
    zona_id: string;
    plan_id: string;
    plantilla_id: string;
    contrato_apartado: string;
    onu: string;
    caja_nap_id: string;
    puerto_nap: string;
    latitud: string;
    longitud: string;
    mac_address: string;
    potencia: string;
    tipo_alta: TipoAlta;
}

const VACIO: Formulario = {
    nombre: '', telefono: '', direccion: '', zona_id: '', plan_id: '', plantilla_id: '',
    contrato_apartado: '', onu: '', caja_nap_id: '', puerto_nap: '', latitud: '', longitud: '',
    mac_address: '', potencia: '', tipo_alta: 'nueva',
};

const NUEVO = '__nuevo';
const OTRO = '__otro';

/** "AA:BB:CC..." y "aabbcc..." son la misma ONU. */
const normalizarSerie = (valor: string) => valor.toUpperCase().replace(/[^0-9A-Z]/g, '');

const etiqueta = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';
const campo = 'w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const tarjeta = 'space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

type OnuDisponible = Catalogo['onus'][number];

/** Buscar la ONU en el inventario disponible, elegirla de la lista o escanear su código. */
function SelectorOnu({ onus, valor, elegida, onCambiar }: {
    onus: OnuDisponible[];
    valor: string;
    elegida?: OnuDisponible;
    onCambiar: (valor: string) => void;
}) {
    const [escaneando, setEscaneando] = useState(false);
    const [abierta, setAbierta] = useState(false);
    const busqueda = normalizarSerie(valor);
    const coincidencias = onus.filter((o) => !busqueda || normalizarSerie(o.identificador).includes(busqueda)).slice(0, 30);

    const alEscanear = (codigo: string) => {
        setEscaneando(false);
        const leido = normalizarSerie(codigo);
        const onu = onus.find((o) => normalizarSerie(o.identificador) === leido)
            || onus.find((o) => leido.includes(normalizarSerie(o.identificador)));
        onCambiar(onu ? onu.identificador : codigo.trim());
        if (onu) toast.success(`ONU ${onu.identificador}`);
        else toast.error('Ese código no está en el inventario disponible');
    };

    return (
        <div>
            <span className={etiqueta}>ONU instalada ({onus.length} disponibles)</span>
            <div className="flex gap-2">
                <input
                    aria-label="ONU instalada"
                    value={valor}
                    onFocus={() => setAbierta(true)}
                    onChange={(e) => { onCambiar(e.target.value); setAbierta(true); }}
                    placeholder="Busca por serial o MAC"
                    className={`${campo} font-mono uppercase`}
                />
                <button type="button" aria-label="Escanear código de la ONU" onClick={() => setEscaneando(true)}
                    className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-black text-white dark:bg-blue-600">
                    <QrCodeIcon className="h-5 w-5" /> Escanear
                </button>
            </div>
            {elegida ? (
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircleIcon className="h-4 w-4" /> {elegida.identificador}{elegida.modelo ? ` · ${elegida.modelo}` : ''}</p>
            ) : valor && coincidencias.length === 0 ? (
                <p className="mt-1 text-xs font-bold text-rose-600">Ninguna ONU disponible coincide. Revisa el serial o regístrala en Inventario.</p>
            ) : null}
            {abierta && !elegida && coincidencias.length > 0 && (
                <ul role="listbox" aria-label="ONUs disponibles" className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    {coincidencias.map((o) => (
                        <li key={o.id}>
                            <button type="button" role="option" aria-selected={false} onClick={() => { onCambiar(o.identificador); setAbierta(false); }}
                                className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800">
                                <span className="font-mono text-sm font-black">{o.identificador}</span>
                                <span className="text-[11px] text-slate-500">{o.modelo || ''}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {escaneando && (
                <div role="dialog" aria-label="Escanear ONU" className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
                        <p className="text-sm font-black">Apunta al código de barras o QR de la ONU</p>
                        <button type="button" aria-label="Cerrar escáner" onClick={() => setEscaneando(false)} className="rounded-full bg-white/10 p-2"><XMarkIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="flex flex-1 items-center justify-center p-4">
                        <div className="aspect-square w-full max-w-sm overflow-hidden rounded-3xl">
                            <Scanner
                                onScan={(res) => { const codigo = res?.[0]?.rawValue; if (codigo) alEscanear(codigo); }}
                                onError={() => { toast.error('No se pudo abrir la cámara'); setEscaneando(false); }}
                                formats={['code_128', 'code_39', 'qr_code', 'ean_13', 'data_matrix']}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Nueva solicitud levantada por el técnico en el domicilio; luego se activa. */
function NuevaSolicitud() {
    const navigate = useNavigate();
    const [datos, setDatos] = useState({ nombre: '', telefono: '', direccion: '' });
    const [guardando, setGuardando] = useState(false);

    const guardar = async (e: FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { data } = await client.post<{ id: number }>('/ordenes/', {
                tipo: 'instalacion',
                prospecto_nombre: datos.nombre.trim(),
                prospecto_telefono: datos.telefono.trim() || null,
                prospecto_direccion: datos.direccion.trim(),
                motivo: 'Solicitud del técnico',
            });
            navigate(`/tech/activar/${data.id}`, { replace: true });
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo registrar la solicitud'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <form onSubmit={guardar} className={tarjeta}>
            <p className="text-sm text-slate-500">Registra los datos del cliente. Después eliges zona, plan y equipo para activarlo.</p>
            <label className="block"><span className={etiqueta}>Nombre completo</span>
                <input required minLength={2} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className={campo} /></label>
            <label className="block"><span className={etiqueta}>Teléfono</span>
                <input inputMode="tel" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} className={campo} /></label>
            <label className="block"><span className={etiqueta}>Dirección</span>
                <input required minLength={5} value={datos.direccion} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} className={campo} /></label>
            <button disabled={guardando} className="h-12 w-full rounded-xl bg-blue-600 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Continuar'}
            </button>
        </form>
    );
}

export default function TechActivar() {
    const { ordenId } = useParams();
    const navigate = useNavigate();
    const { online } = useSync();
    const esNueva = ordenId === 'nueva';
    const claveBorrador = `activacion-borrador-${ordenId}`;

    const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
    const [form, setForm] = useState<Formulario>(VACIO);
    const [contratos, setContratos] = useState<string[]>([]);
    const [ocupados, setOcupados] = useState<number[]>([]);
    const [activando, setActivando] = useState(false);
    const [resultado, setResultado] = useState<Resultado | null>(null);

    const cargarCatalogo = useCallback(async (zonaId?: string) => {
        const consulta = zonaId ? `?zona_id=${zonaId}` : '';
        const { data, fromCache } = await cachedRequest<Catalogo>(`activacion-${ordenId}${consulta}`, async () => (
            await client.get<Catalogo>(`/ordenes/${ordenId}/activacion${consulta}`)
        ).data);
        setCatalogo(data);
        return { data, fromCache };
    }, [ordenId]);

    useEffect(() => {
        if (esNueva) return;
        void (async () => {
            try {
                const { data, fromCache } = await cargarCatalogo();
                const borrador = await getCachedValue<Formulario>(claveBorrador).catch(() => null);
                const onu = data.onus.find((o) => o.id === data.solicitud.onu_id);
                setForm({
                    ...VACIO,
                    nombre: data.solicitud.nombre || '',
                    telefono: data.solicitud.telefono || '',
                    direccion: data.solicitud.direccion || '',
                    zona_id: data.zona_id ? String(data.zona_id) : '',
                    plan_id: data.solicitud.plan_id ? String(data.solicitud.plan_id) : '',
                    plantilla_id: data.infraestructura?.plantilla_id ? String(data.infraestructura.plantilla_id) : '',
                    onu: onu?.identificador || '',
                    ...(borrador || {}),
                });
                if (fromCache) toast('Sin internet: datos guardados en tu celular');
            } catch {
                toast.error('No hay datos de esta solicitud en el celular. Ábrela una vez con internet.');
                navigate('/tech/dashboard');
            }
            try {
                const { data } = await cachedRequest<{ apartados: { codigo: string }[] }>('contratos-apartados', async () => (
                    await client.get('/contratos/apartados')
                ).data);
                const codigos = Array.isArray(data?.apartados) ? data.apartados.map((c) => c.codigo) : [];
                setContratos(codigos);
                setForm((f) => ({ ...f, contrato_apartado: f.contrato_apartado || codigos[0] || '' }));
            } catch {
                setContratos([]);
            }
        })();
    }, [cargarCatalogo, claveBorrador, esNueva, navigate]);

    useEffect(() => {
        if (!form.caja_nap_id) {
            setOcupados([]);
            return;
        }
        cachedRequest<{ puerto_nap?: number | string | null }[]>(`nap-${form.caja_nap_id}-detalles`, async () => (
            await client.get(`/infraestructura/naps/${form.caja_nap_id}/detalles`)
        ).data)
            .then(({ data }) => setOcupados(data.map((c) => Number(c.puerto_nap)).filter(Number.isFinite)))
            .catch(() => setOcupados([]));
    }, [form.caja_nap_id]);

    const infra = catalogo?.infraestructura;
    const esDhcp = infra?.router?.modo === 'dhcp';
    const nap = infra?.naps.find((n) => String(n.id) === form.caja_nap_id);
    const onuElegida = useMemo(
        () => catalogo?.onus.find((o) => normalizarSerie(o.identificador) === normalizarSerie(form.onu)),
        [catalogo, form.onu],
    );
    const [escribiendoOtro, setEscribiendoOtro] = useState(false);
    const modoContrato = contratos.includes(form.contrato_apartado) && !escribiendoOtro
        ? 'apartado'
        : escribiendoOtro || form.contrato_apartado ? OTRO : NUEVO;
    const elegirContrato = (valor: string) => {
        setEscribiendoOtro(valor === OTRO);
        cambiar({ contrato_apartado: valor === NUEVO || valor === OTRO ? '' : valor });
    };
    const cambiar = (cambios: Partial<Formulario>) => setForm((f) => ({ ...f, ...cambios }));
    // Un borrador guardado antes de existir la opción cuenta como instalación nueva.
    const portabilidad = form.tipo_alta === 'portabilidad';
    const mesesGratis = catalogo?.plantillas.find((p) => String(p.id) === form.plantilla_id)?.meses_gratis_instalacion ?? 0;

    const elegirZona = async (zonaId: string) => {
        cambiar({ zona_id: zonaId, plan_id: '', caja_nap_id: '', puerto_nap: '' });
        if (!zonaId) return;
        try {
            const { data } = await cargarCatalogo(zonaId);
            const plantilla = data.infraestructura?.plantilla_id;
            cambiar({ plantilla_id: plantilla ? String(plantilla) : '' });
        } catch {
            toast.error('Sin internet no se pueden cargar los datos de otra zona');
        }
    };

    const capturarGps = () => {
        if (!navigator.geolocation) {
            toast.error('Tu celular no tiene GPS');
            return;
        }
        const aviso = toast.loading('Obteniendo ubicación...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                cambiar({ latitud: String(pos.coords.latitude), longitud: String(pos.coords.longitude) });
                toast.success('Ubicación lista', { id: aviso });
            },
            () => toast.error('Activa la ubicación del celular', { id: aviso }),
            { enableHighAccuracy: true, timeout: 15000 },
        );
    };

    const activar = async (e: FormEvent) => {
        e.preventDefault();
        if (!catalogo) return;
        if (!online) {
            await setCachedValue(claveBorrador, form);
            toast.success('Guardado en el celular. Para activar conéctate (por ejemplo a la red Zona del ISP).');
            return;
        }
        if (!form.zona_id || !form.plan_id) return toast.error('Elige la zona y el plan');
        if (infra?.olt && !onuElegida) return toast.error('Escribe o elige el serial/MAC de la ONU instalada');
        if (form.caja_nap_id && !form.puerto_nap) return toast.error('Indica el puerto de la caja NAP');
        if (!form.latitud || !form.longitud) return toast.error('Falta capturar la ubicación GPS');
        if (esDhcp && !form.mac_address.trim()) return toast.error('Falta la MAC que ve el MikroTik');

        setActivando(true);
        const aviso = toast.loading('Activando en el MikroTik...');
        try {
            // La versión más reciente: los avances guardados sin internet la cambian al sincronizar.
            const { data: fresco } = await cargarCatalogo(form.zona_id);
            const { data } = await client.post<Resultado>(`/ordenes/${catalogo.solicitud.id}/activar`, {
                version: fresco.solicitud.version,
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim() || null,
                direccion: form.direccion.trim(),
                zona_id: Number(form.zona_id),
                plan_id: Number(form.plan_id),
                plantilla_id: form.plantilla_id ? Number(form.plantilla_id) : null,
                contrato_apartado: form.contrato_apartado.trim().toUpperCase() || null,
                onu_id: onuElegida?.id ?? null,
                caja_nap_id: form.caja_nap_id ? Number(form.caja_nap_id) : null,
                puerto_nap: form.puerto_nap ? Number(form.puerto_nap) : null,
                latitud: Number(form.latitud),
                longitud: Number(form.longitud),
                mac_address: esDhcp ? form.mac_address.trim() : null,
                potencia_optica_dbm: form.potencia ? Number(form.potencia) : null,
                tipo_alta: portabilidad ? 'portabilidad' : 'nueva',
            });
            toast.success('¡Cliente activado!', { id: aviso });
            await setCachedValue(claveBorrador, null);
            setResultado(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo activar'), { id: aviso, duration: 8000 });
            // Si el cliente quedó creado pero el MikroTik falló, el reintento lo reutiliza.
            void cargarCatalogo(form.zona_id).catch(() => undefined);
        } finally {
            setActivando(false);
        }
    };

    const copiar = (texto?: string | null) => {
        if (!texto) return;
        void navigator.clipboard?.writeText(texto);
        toast.success('Copiado');
    };

    const encabezado = (titulo: string, subtitulo?: string | null) => (
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
            <button type="button" aria-label="Volver" onClick={() => navigate('/tech/dashboard')} className="-ml-2 rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeftIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{titulo}</p>
                {subtitulo && <p className="truncate text-base font-black text-slate-800 dark:text-white">{subtitulo}</p>}
            </div>
        </div>
    );

    if (esNueva) {
        return (
            <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 dark:bg-slate-950 dark:text-white">
                {encabezado('Nueva instalación')}
                <div className="mx-auto max-w-lg p-4"><NuevaSolicitud /></div>
            </div>
        );
    }

    if (resultado) {
        const filas: [string, string | null | undefined][] = [
            ['Contrato', resultado.contrato],
            ['Plan', resultado.plan],
            ['Cobro', resultado.tipo_alta === 'portabilidad'
                ? 'Cambio de compañía, paga desde hoy'
                : resultado.meses_gratis ? `${resultado.meses_gratis} mes${resultado.meses_gratis === 1 ? '' : 'es'} gratis` : 'Sin meses gratis'],
            ...(resultado.modo === 'dhcp' ? [] : [
                ['Usuario PPPoE', resultado.usuario_pppoe] as [string, string | null | undefined],
                ['Contraseña PPPoE', resultado.password_pppoe] as [string, string | null | undefined],
            ]),
            ['IP', resultado.ip],
            ['ONU', resultado.onu],
        ];
        return (
            <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 dark:bg-slate-950 dark:text-white">
                {encabezado('Cliente activado', resultado.nombre)}
                <div className="mx-auto max-w-lg space-y-4 p-4">
                    <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <CheckCircleIcon className="h-10 w-10 shrink-0 text-emerald-600" />
                        <div>
                            <p className="font-black text-emerald-700 dark:text-emerald-400">Servicio activo y orden cerrada</p>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Configura el router del cliente con estos datos.</p>
                        </div>
                    </div>
                    <div className={tarjeta}>
                        {filas.map(([nombre, valor]) => (
                            <div key={nombre} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                                <div className="min-w-0">
                                    <p className={etiqueta}>{nombre}</p>
                                    <p className="break-all font-mono text-lg font-black">{valor || '—'}</p>
                                </div>
                                {valor && (
                                    <button type="button" aria-label={`Copiar ${nombre}`} onClick={() => copiar(valor)} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                                        <ClipboardDocumentIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className={tarjeta}>
                        <p className={`${etiqueta} flex items-center gap-1`}><SignalIcon className="h-4 w-4" /> Señal de la ONU</p>
                        {resultado.senal ? (
                            <>
                                <p className="font-mono text-2xl font-black">{resultado.senal.potencia}</p>
                                <p className="text-sm text-slate-500">{resultado.senal.recomendacion}</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">La OLT no respondió a tiempo. Revisa la señal después desde el cliente.</p>
                        )}
                    </div>
                    {resultado.cambios.length > 0 && (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            <p className="font-black">Cambios anotados para el administrador</p>
                            <ul className="mt-1 list-disc pl-5">{resultado.cambios.map((c) => <li key={c}>{c}</li>)}</ul>
                        </div>
                    )}
                    <button type="button" onClick={() => navigate('/tech/dashboard')} className="h-12 w-full rounded-xl bg-blue-600 text-xs font-black uppercase tracking-widest text-white">
                        Volver a mi agenda
                    </button>
                </div>
            </div>
        );
    }

    if (!catalogo) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-50 font-bold text-slate-500 dark:bg-slate-950">Cargando solicitud...</div>;
    }

    const capacidad = nap?.capacidad || 16;
    return (
        <div className="min-h-screen bg-slate-50 pb-28 text-slate-900 dark:bg-slate-950 dark:text-white">
            {encabezado('Activar instalación', form.nombre || `Solicitud #${catalogo.solicitud.id}`)}
            <form onSubmit={activar} className="mx-auto max-w-lg space-y-4 p-4">
                {catalogo.solicitud.cliente_id && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        Un intento anterior ya registró al cliente (contrato {catalogo.solicitud.contrato}). Corrige lo necesario y vuelve a activar.
                    </p>
                )}
                <div className={tarjeta}>
                    <label className="block"><span className={etiqueta}>Nombre del titular</span>
                        <input required minLength={2} value={form.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={campo} /></label>
                    <label className="block"><span className={etiqueta}>Teléfono</span>
                        <input inputMode="tel" value={form.telefono} onChange={(e) => cambiar({ telefono: e.target.value })} className={campo} /></label>
                    <label className="block"><span className={etiqueta}>Dirección</span>
                        <input required minLength={5} value={form.direccion} onChange={(e) => cambiar({ direccion: e.target.value })} className={campo} /></label>
                </div>

                <div className={tarjeta}>
                    <label className="block"><span className={etiqueta}>Zona</span>
                        <select required value={form.zona_id} onChange={(e) => void elegirZona(e.target.value)} className={campo}>
                            <option value="">Elige la zona</option>
                            {catalogo.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select></label>
                    {infra && (
                        <p className="text-xs font-bold text-slate-500">
                            MikroTik: {infra.router?.nombre || 'sin configurar'} · OLT: {infra.olt?.nombre || 'sin OLT'} · Red: {infra.red?.cidr || 'sin red'}
                        </p>
                    )}
                    <label className="block"><span className={etiqueta}>Plan</span>
                        <select required value={form.plan_id} onChange={(e) => cambiar({ plan_id: e.target.value })} className={campo}>
                            <option value="">Elige el plan</option>
                            {(infra?.planes || []).map((p) => <option key={p.id} value={p.id}>{p.nombre} · ${p.precio}</option>)}
                        </select></label>
                    <label className="block"><span className={etiqueta}>Cobro</span>
                        <select value={form.plantilla_id} onChange={(e) => cambiar({ plantilla_id: e.target.value })} className={campo}>
                            <option value="">Sin plantilla</option>
                            {catalogo.plantillas.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre}{String(p.id) === String(infra?.plantilla_id) ? ' (de la zona)' : ''}</option>
                            ))}
                        </select></label>
                    <div>
                        <span className={etiqueta}>Tipo de alta</span>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                ['nueva', 'Instalación nueva', mesesGratis > 0 ? `${mesesGratis} mes${mesesGratis === 1 ? '' : 'es'} gratis` : 'sin meses gratis'],
                                ['portabilidad', 'Cambio de compañía', 'paga desde hoy'],
                            ] as [TipoAlta, string, string][]).map(([valor, titulo, detalle]) => {
                                const activo = (valor === 'portabilidad') === portabilidad;
                                return (
                                    <button
                                        key={valor}
                                        type="button"
                                        onClick={() => cambiar({ tipo_alta: valor })}
                                        className={`rounded-xl border px-3 py-2 text-left ${activo
                                            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10'
                                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}
                                    >
                                        <span className="block text-xs font-black text-slate-800 dark:text-slate-100">{titulo}</span>
                                        <span className={`block text-[11px] ${activo ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>{detalle}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className={tarjeta}>
                    {!catalogo.solicitud.cliente_id && (
                        <div>
                            <label className="block"><span className={etiqueta}>Contrato escrito en el conector</span>
                                <select
                                    value={modoContrato === 'apartado' ? form.contrato_apartado : modoContrato}
                                    onChange={(e) => elegirContrato(e.target.value)}
                                    className={`${campo} font-mono`}
                                >
                                    {contratos.map((c, i) => <option key={c} value={c}>{c}{i === 0 ? ' · siguiente' : ''}</option>)}
                                    <option value={NUEVO}>Que el sistema genere uno</option>
                                    <option value={OTRO}>Escribir otro contrato apartado</option>
                                </select>
                            </label>
                            {modoContrato === OTRO && (
                                <input
                                    aria-label="Contrato apartado"
                                    value={form.contrato_apartado}
                                    onChange={(e) => cambiar({ contrato_apartado: e.target.value.toUpperCase() })}
                                    placeholder="Ej. A7F2"
                                    className={`${campo} mt-2 font-mono uppercase`}
                                />
                            )}
                            {contratos.length === 0 && modoContrato === NUEVO && (
                                <p className="mt-1 text-xs text-slate-500">No tienes contratos apartados guardados; se generará uno al activar.</p>
                            )}
                        </div>
                    )}
                    {infra?.olt && (
                        <SelectorOnu
                            onus={catalogo.onus}
                            valor={form.onu}
                            elegida={onuElegida}
                            onCambiar={(onu) => cambiar({ onu })}
                        />
                    )}
                    {esDhcp && (
                        <label className="block"><span className={etiqueta}>MAC WAN/CPE que ve el MikroTik</span>
                            <input value={form.mac_address} onChange={(e) => cambiar({ mac_address: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" className={`${campo} font-mono uppercase`} /></label>
                    )}
                    <button type="button" onClick={capturarGps} className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-xs font-black uppercase tracking-widest ${form.latitud ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                        <MapPinIcon className="h-5 w-5" /> {form.latitud ? 'Ubicación capturada' : 'Capturar ubicación GPS'}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block"><span className={etiqueta}>Caja NAP</span>
                            <select value={form.caja_nap_id} onChange={(e) => cambiar({ caja_nap_id: e.target.value, puerto_nap: '' })} className={campo}>
                                <option value="">Sin caja</option>
                                {(infra?.naps || []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                            </select></label>
                        <label className="block"><span className={etiqueta}>Puerto</span>
                            <select value={form.puerto_nap} disabled={!form.caja_nap_id} onChange={(e) => cambiar({ puerto_nap: e.target.value })} className={campo}>
                                <option value="">—</option>
                                {Array.from({ length: capacidad }, (_, i) => i + 1).map((p) => (
                                    <option key={p} value={p} disabled={ocupados.includes(p)}>{p}{ocupados.includes(p) ? ' (ocupado)' : ''}</option>
                                ))}
                            </select></label>
                    </div>
                    <SugerenciaNap
                        latitud={form.latitud}
                        longitud={form.longitud}
                        zonaId={form.zona_id}
                        permitidas={(infra?.naps || []).map((n) => n.id)}
                        elegidaId={form.caja_nap_id}
                        onElegir={(id) => cambiar({ caja_nap_id: String(id), puerto_nap: '' })}
                    />
                    {infra?.olt && (
                        <label className="block"><span className={etiqueta}>Potencia medida (dBm, opcional)</span>
                            <input inputMode="decimal" value={form.potencia} onChange={(e) => cambiar({ potencia: e.target.value })} placeholder="-19.5" className={campo} /></label>
                    )}
                </div>

                <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                    <button disabled={activando} className="mx-auto block h-12 w-full max-w-lg rounded-xl bg-emerald-600 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">
                        {activando ? 'Activando...' : online ? 'Activar cliente' : 'Guardar (sin internet)'}
                    </button>
                </div>
            </form>
        </div>
    );
}
