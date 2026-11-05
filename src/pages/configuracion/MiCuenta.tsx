/** Mi cuenta de WisPay: plan, días que quedan de la mensualidad, versión en uso y la liberada. */
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon, CalendarDaysIcon, CreditCardIcon, SparklesIcon } from '@heroicons/react/24/outline';
import client from '@/api/axios';
import { EncabezadoPagina, FilaLista, Lista } from '@/components/ui/Pagina';
import { BOTON_PRIMARIO, TARJETA, type Tono } from '@/components/ui/estilo';

interface MiCuentaDatos {
    en_la_nube: boolean;
    version_en_uso: string;
    disponible?: boolean;
    cuenta?: {
        plan: string | null;
        es_demo: boolean;
        precio_mensual: string;
        vigente_hasta: string | null;
        dias_restantes: number | null;
        corte: string | null;
        contacto_pago: string | null;
    } | null;
    version?: {
        instalada: string;
        disponible: string | null;
        novedades: string | null;
        fecha: string | null;
        actualizando: boolean;
    } | null;
}

const errorMessage = (error: unknown) => {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    return typeof detail === 'string' ? detail : 'No se pudo completar la operación';
};

const fechaLarga = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

function textoDias(dias: number) {
    if (dias > 1) return `${dias} días`;
    if (dias === 1) return '1 día';
    if (dias === 0) return 'Vence hoy';
    return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
}

function tonoDias(dias: number): Tono {
    if (dias < 0) return 'rojo';
    if (dias <= 5) return 'ambar';
    return 'verde';
}

export default function MiCuenta() {
    const [datos, setDatos] = useState<MiCuentaDatos | null>(null);
    const [actualizando, setActualizando] = useState(false);
    const versionAntes = useRef<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<MiCuentaDatos>('/configuracion/mi-cuenta');
            setDatos(data);
            return data;
        } catch (error) {
            if (!actualizando) toast.error(errorMessage(error));
            return null;
        }
    }, [actualizando]);

    useEffect(() => { void cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Mientras se actualiza el sistema se reinicia: se pregunta cada pocos segundos
    // hasta que conteste con la versión nueva y entonces se recarga la página.
    useEffect(() => {
        if (!actualizando && !datos?.version?.actualizando) return;
        if (!versionAntes.current && datos) versionAntes.current = datos.version_en_uso;
        const id = window.setInterval(async () => {
            const nuevo = await cargar();
            if (nuevo && versionAntes.current && nuevo.version_en_uso !== versionAntes.current) {
                window.clearInterval(id);
                toast.success(`Listo, ya estás en la versión ${nuevo.version_en_uso}`);
                window.setTimeout(() => window.location.reload(), 1500);
            }
        }, 5000);
        return () => window.clearInterval(id);
    }, [actualizando, datos, cargar]);

    const actualizar = async () => {
        if (!datos?.version?.disponible) return;
        if (!window.confirm(`Se instala la versión ${datos.version.disponible}. El sistema se reinicia y deja de responder alrededor de un minuto. ¿Actualizar ahora?`)) return;
        versionAntes.current = datos.version_en_uso;
        setActualizando(true);
        try {
            await client.post('/configuracion/mi-cuenta/actualizar');
            toast.success('Actualizando; esta página se recarga sola al terminar');
        } catch (error) {
            toast.error(errorMessage(error));
            setActualizando(false);
        }
    };

    const cuenta = datos?.cuenta;
    const version = datos?.version;
    const enCurso = actualizando || !!version?.actualizando;

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <EncabezadoPagina titulo="Mi cuenta" descripcion="Tu plan de WisPay y la versión de tu sistema."
                volver={{ a: '/admin/configuracion', texto: 'Configuración' }} />

            {datos && !datos.en_la_nube && (
                <Lista><FilaLista titulo="Versión" valor={datos.version_en_uso} /></Lista>
            )}

            {datos?.en_la_nube && !datos.disponible && (
                <p className={`${TARJETA} p-4 text-sm text-slate-500`}>No se pudo consultar tu cuenta en este momento. Versión en uso: {datos.version_en_uso}.</p>
            )}

            {cuenta && (
                <Lista titulo="Mensualidad" pie={cuenta.contacto_pago ? `Para pagar: ${cuenta.contacto_pago}` : undefined}>
                    <FilaLista icono={CreditCardIcon} tono="azul" titulo="Plan"
                        valor={cuenta.es_demo ? 'Demo gratis' : cuenta.plan || '—'} />
                    {cuenta.dias_restantes !== null && cuenta.vigente_hasta && (
                        <FilaLista icono={CalendarDaysIcon} tono={tonoDias(cuenta.dias_restantes)}
                            titulo={cuenta.es_demo ? 'Tu demo termina' : 'Pagado hasta'}
                            detalle={fechaLarga(cuenta.vigente_hasta)}
                            valor={textoDias(cuenta.dias_restantes)} tonoValor={tonoDias(cuenta.dias_restantes)} />
                    )}
                    {cuenta.corte && !cuenta.es_demo && (
                        <FilaLista titulo="Se suspende si no se registra el pago" valor={fechaLarga(cuenta.corte)} tonoValor="rojo" />
                    )}
                </Lista>
            )}

            {datos?.en_la_nube && datos.disponible && (
                <Lista titulo="Versión">
                    <FilaLista icono={SparklesIcon} tono="violeta" titulo="En uso" valor={datos.version_en_uso} />
                    {version?.disponible ? (
                        <div className="flex flex-col gap-3 p-4">
                            <div>
                                <p className="text-[15px] font-bold text-slate-900 dark:text-white">Hay una versión nueva: {version.disponible}</p>
                                {version.fecha && <p className="text-[13px] text-[#5b6170] dark:text-slate-400">Disponible desde el {fechaLarga(version.fecha)}</p>}
                            </div>
                            {version.novedades && (
                                <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">{version.novedades}</p>
                            )}
                            <button type="button" disabled={enCurso} onClick={() => void actualizar()} className={BOTON_PRIMARIO}>
                                <ArrowPathIcon className={`h-4 w-4 ${enCurso ? 'animate-spin' : ''}`} />
                                {enCurso ? 'Actualizando…' : 'Actualizar ahora'}
                            </button>
                            <p className="text-xs text-[#5b6170] dark:text-slate-400">Tus clientes, pagos y configuración se conservan. Mientras se reinicia (cerca de un minuto) el sistema no responde; mejor hazlo en un horario tranquilo.</p>
                        </div>
                    ) : enCurso ? (
                        <FilaLista titulo="Actualizando…" detalle="La página se recarga sola al terminar" />
                    ) : (
                        <FilaLista titulo="Estás al día" detalle="Cuando salga una versión nueva aparecerá aquí" />
                    )}
                </Lista>
            )}
        </div>
    );
}
