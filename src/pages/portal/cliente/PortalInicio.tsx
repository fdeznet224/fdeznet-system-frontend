import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    HomeIcon, ChartBarIcon, WifiIcon, LifebuoyIcon, ArrowRightOnRectangleIcon, BanknotesIcon, BoltIcon,
} from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import {
    BOTON_ACCION_SECUNDARIO, BOTON_PRIMARIO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA, TITULO_SECCION,
} from '@/components/ui/estilo';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import ConsumoCliente from '@/pages/clientes/components/ConsumoCliente';
import MiRedCliente from '@/pages/clientes/components/MiRedCliente';
import CambiarClavePortal from './CambiarClavePortal';

interface Adeudo { concepto: string; monto: number; vence: string | null; vencido: boolean }
interface Resumen {
    nombre: string;
    contrato: string;
    direccion: string | null;
    conectado: boolean;
    plan: { nombre: string; bajada_kbps: number; subida_kbps: number; precio: number } | null;
    saldo_a_favor: number;
    cuenta: { estado_servicio: string; explicacion: string; adeudos: Adeudo[]; promesa: { fecha: string } | null };
    pagos: { fecha: string; monto: number; metodo: string | null }[];
    datos_pago: string | null;
    tiene_onu: boolean;
}

type Pestana = 'inicio' | 'consumo' | 'red' | 'ayuda';
const PESTANAS: { id: Pestana; texto: string; icono: typeof HomeIcon }[] = [
    { id: 'inicio', texto: 'Inicio', icono: HomeIcon },
    { id: 'consumo', texto: 'Consumo', icono: ChartBarIcon },
    { id: 'red', texto: 'Mi red', icono: WifiIcon },
    { id: 'ayuda', texto: 'Ayuda', icono: LifebuoyIcon },
];
const FALLAS = [
    ['sin_internet', 'No tengo internet'],
    ['lentitud', 'El internet está lento'],
    ['router_wifi', 'Problema con mi WiFi o módem'],
    ['otro', 'Otra cosa'],
] as const;

const velocidad = (kbps: number) => (kbps >= 1024 ? `${Math.round(kbps / 1024)} Mbps` : `${kbps} Kbps`);
const dinero = (monto: number) => monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
// La plantilla de datos de pago está escrita para WhatsApp (*negritas*).
const sinFormatoWhatsapp = (texto: string) => texto.replace(/\*/g, '');

/** Portal del cliente: su cuenta, su consumo, la red de su casa y ayuda. */
export default function PortalInicio() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pestana, setPestana] = useState<Pestana>('inicio');

    useEffect(() => {
        portalClient.get<Resumen>('/portal/resumen')
            .then(({ data }) => setResumen(data))
            .catch((e) => {
                if (e.response?.status === 403) navigate('/cliente', { replace: true });
                else setError(apiErrorMessage(e, 'No se pudo cargar tu cuenta'));
            });
    }, [navigate]);

    const salir = async () => {
        await portalClient.post('/portal/salir').catch(() => undefined);
        navigate('/cliente', { replace: true });
    };

    const total = resumen?.cuenta.adeudos.reduce((suma, a) => suma + a.monto, 0) ?? 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
            <header className="px-4 pb-6 pt-6 text-white" style={{ background: brand.color_primario }}>
                <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm opacity-80">{brand.empresa_nombre}</p>
                        <h1 className="truncate text-xl font-bold">{resumen ? `Hola, ${resumen.nombre.split(' ')[0]}` : 'Tu cuenta'}</h1>
                        {resumen && <p className="text-sm opacity-80">Contrato {resumen.contrato}</p>}
                    </div>
                    <button type="button" onClick={() => void salir()} aria-label="Salir" className="rounded-xl bg-white/15 p-2.5 hover:bg-white/25">
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto -mt-3 max-w-lg space-y-4 px-4">
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
                {!resumen && !error && <p className="py-10 text-center text-sm text-slate-400">Cargando...</p>}

                {resumen && pestana === 'inicio' && (
                    <>
                        <div className={`${TARJETA} space-y-3 p-4`}>
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Mi servicio</h2>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${resumen.conectado ? PILDORA.verde : PILDORA.neutro}`}>
                                    {resumen.conectado ? 'Conectado' : 'Sin conexión ahora'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{resumen.cuenta.explicacion}</p>
                            {resumen.plan && (
                                <div className="grid grid-cols-3 gap-2" data-testid="plan-portal">
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plan</p>
                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{resumen.plan.nombre}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bajada</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{velocidad(resumen.plan.bajada_kbps)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subida</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{velocidad(resumen.plan.subida_kbps)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`${TARJETA} space-y-3 p-4`}>
                            <div className="flex items-center gap-2">
                                <BanknotesIcon className="h-5 w-5 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Mis pagos</h2>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{total > 0 ? 'Por pagar' : 'Adeudo'}</p>
                                    <p className={`text-2xl font-bold ${total > 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{dinero(total)}</p>
                                </div>
                                {resumen.plan && <p className="text-xs text-slate-500 dark:text-slate-400">Mensualidad {dinero(resumen.plan.precio)}</p>}
                            </div>
                            {resumen.cuenta.adeudos.map((a, n) => (
                                <div key={n} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{a.concepto}</span>
                                    <span className={`shrink-0 text-xs font-semibold ${a.vencido ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                                        {dinero(a.monto)}{a.vence ? ` · ${a.vencido ? 'venció' : 'vence'} ${a.vence}` : ''}
                                    </span>
                                </div>
                            ))}
                            {resumen.saldo_a_favor > 0 && (
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">Tienes {dinero(resumen.saldo_a_favor)} a favor.</p>
                            )}
                            {resumen.datos_pago && (
                                <details className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                    <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">¿Cómo pago?</summary>
                                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{sinFormatoWhatsapp(resumen.datos_pago)}</p>
                                </details>
                            )}
                            {resumen.pagos.length > 0 && (
                                <div className="space-y-1">
                                    <h3 className={TITULO_SECCION}>Últimos pagos</h3>
                                    {resumen.pagos.map((p, n) => (
                                        <div key={n} className="flex justify-between px-1 text-sm text-slate-600 dark:text-slate-300">
                                            <span>{new Date(`${p.fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <span className="font-semibold">{dinero(p.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {resumen && pestana === 'consumo' && <ConsumoCliente clienteId={0} nombre={resumen.nombre} portal />}

                {resumen && pestana === 'red' && (resumen.tiene_onu
                    ? <MiRedCliente portal />
                    : <p className={`${TARJETA} p-4 text-sm text-slate-500`}>Tu servicio no tiene un módem que se pueda controlar desde aquí.</p>)}

                {resumen && pestana === 'ayuda' && <Ayuda telefono={brand.empresa_telefono} />}
            </main>

            <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div className="mx-auto grid max-w-lg grid-cols-4">
                    {PESTANAS.map(({ id, texto, icono: Icono }) => (
                        <button
                            key={id} type="button" onClick={() => setPestana(id)}
                            className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${pestana === id ? '' : 'text-slate-400'}`}
                            style={pestana === id ? { color: brand.color_primario } : undefined}
                        >
                            <Icono className="h-6 w-6" />
                            {texto}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}

function Ayuda({ telefono }: { telefono: string | null }) {
    const [categoria, setCategoria] = useState<string>('sin_internet');
    const [descripcion, setDescripcion] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [cambiando, setCambiando] = useState(false);

    const reportar = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        try {
            const { data } = await portalClient.post<{ id: number }>('/portal/falla', { categoria, descripcion });
            toast.success(`Recibimos tu reporte${data.id ? ` #${data.id}` : ''}. Un técnico te contactará.`, { duration: 8000 });
            setDescripcion('');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'No se pudo enviar el reporte'));
        } finally {
            setEnviando(false);
        }
    };

    const whatsapp = telefono ? `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(?!52)(\d{10})$/, '52$1')}` : null;

    return (
        <>
            <form onSubmit={reportar} className={`${TARJETA} space-y-3 p-4`}>
                <div className="flex items-center gap-2">
                    <BoltIcon className="h-5 w-5 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Reportar una falla</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Antes, prueba reiniciar tu módem desde "Mi red": muchas veces se arregla solo.</p>
                <div>
                    <label htmlFor="falla" className={ETIQUETA_CAMPO}>¿Qué pasa?</label>
                    <select id="falla" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={CAMPO}>
                        {FALLAS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="detalle" className={ETIQUETA_CAMPO}>Cuéntanos más</label>
                    <textarea
                        id="detalle" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={1000}
                        placeholder="Desde cuándo, si ya reiniciaste el módem, qué foco está en rojo..." className={CAMPO}
                    />
                </div>
                <button type="submit" disabled={enviando || descripcion.trim().length < 5} className={BOTON_PRIMARIO}>
                    {enviando ? 'Enviando...' : 'Enviar reporte'}
                </button>
            </form>

            {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className={`${TARJETA} flex items-center justify-between gap-3 p-4`}>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Escríbenos por WhatsApp</span>
                    <span className="text-sm text-slate-500">{telefono}</span>
                </a>
            )}

            <div className={`${TARJETA} space-y-3 p-4`}>
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Contraseña del portal</h2>
                    {!cambiando && <button type="button" onClick={() => setCambiando(true)} className={BOTON_ACCION_SECUNDARIO}>Cambiar</button>}
                </div>
                {cambiando && <CambiarClavePortal onListo={() => setCambiando(false)} />}
            </div>
        </>
    );
}
