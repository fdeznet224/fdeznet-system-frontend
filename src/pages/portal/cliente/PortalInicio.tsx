import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowDownIcon, ArrowRightOnRectangleIcon, ArrowUpIcon, ChartBarIcon, CheckCircleIcon, ChevronDownIcon,
    ArrowDownTrayIcon, HomeIcon, LifebuoyIcon, MoonIcon, PowerIcon, SignalIcon, SunIcon, WifiIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import ConsumoCliente from '@/pages/clientes/components/ConsumoCliente';
import CambiarClavePortal from './CambiarClavePortal';
import RedPortal from './RedPortal';
import { useInstalacion } from './instalacion';
import { BOTON, BOTON_SUAVE, CAMPO, ERROR, ETIQUETA, FONDO, TARJETA, TITULO, cambiarTema, dinero, velocidad } from './ui';

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
    ['lentitud', 'Va lento'],
    ['router_wifi', 'WiFi o módem'],
    ['otro', 'Otra cosa'],
] as const;

// La plantilla de datos de pago está escrita para WhatsApp (*negritas*).
const sinFormatoWhatsapp = (texto: string) => texto.replace(/\*/g, '');
const fechaCorta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** Portal del cliente: su cuenta, su consumo, la red de su casa y ayuda. */
export default function PortalInicio() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pestana, setPestana] = useState<Pestana>('inicio');
    const color = brand.color_primario;

    useEffect(() => {
        document.title = `${brand.empresa_nombre} · Mi internet`;
    }, [brand.empresa_nombre]);

    useEffect(() => {
        portalClient.get<Resumen>('/portal/resumen')
            .then(({ data }) => setResumen(data))
            .catch((e) => {
                if (e.response?.status === 403) navigate('/cliente', { replace: true });
                else setError(apiErrorMessage(e, 'No se pudo cargar tu cuenta'));
            });
    }, [navigate]);

    const ir = (destino: Pestana) => {
        setPestana(destino);
        window.scrollTo({ top: 0 });
    };

    const salir = async () => {
        await portalClient.post('/portal/salir').catch(() => undefined);
        navigate('/cliente', { replace: true });
    };

    return (
        <div className={`${FONDO} pb-28`}>
            <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-lg dark:border-white/5 dark:bg-[#0b0f17]/80">
                <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl" style={{ background: color }}>
                        {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-4 w-4 text-white" />}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold">{brand.empresa_nombre}</span>
                    <button type="button" onClick={cambiarTema} aria-label="Cambiar tema" className="rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                        <SunIcon className="hidden h-5 w-5 dark:block" />
                        <MoonIcon className="h-5 w-5 dark:hidden" />
                    </button>
                    <button type="button" onClick={() => void salir()} aria-label="Salir" className="rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                <div className="px-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {pestana === 'inicio' ? (resumen ? `Hola, ${resumen.nombre.split(' ')[0]}` : 'Hola') : PESTANAS.find((p) => p.id === pestana)?.texto}
                    </h1>
                    {resumen && pestana === 'inicio' && <p className="text-sm text-slate-500 dark:text-slate-400">Contrato {resumen.contrato}</p>}
                </div>

                {error && <p className={ERROR}>{error}</p>}
                {!resumen && !error && <div className={`${TARJETA} h-48 animate-pulse`} />}

                {resumen && pestana === 'inicio' && <Inicio resumen={resumen} color={color} ir={ir} />}
                {resumen && pestana === 'consumo' && <ConsumoCliente clienteId={0} nombre={resumen.nombre} portal />}
                {resumen && pestana === 'red' && (resumen.tiene_onu
                    ? <RedPortal color={color} />
                    : <p className={`${TARJETA} text-sm text-slate-500`}>Tu servicio no tiene un módem que se pueda controlar desde aquí.</p>)}
                {resumen && pestana === 'ayuda' && <Ayuda telefono={brand.empresa_telefono} color={color} />}
            </main>

            <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/60 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-white/5 dark:bg-slate-950/90">
                <div className="mx-auto grid max-w-lg grid-cols-4 px-2">
                    {PESTANAS.map(({ id, texto, icono: Icono }) => {
                        const activa = pestana === id;
                        return (
                            <button key={id} type="button" onClick={() => ir(id)} aria-current={activa ? 'page' : undefined}
                                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${activa ? '' : 'text-slate-400 dark:text-slate-500'}`}
                                style={activa ? { color } : undefined}>
                                <span className="flex h-7 w-12 items-center justify-center rounded-full" style={activa ? { background: `${color}1a` } : undefined}>
                                    <Icono className="h-5 w-5" />
                                </span>
                                {texto}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

function Inicio({ resumen, color, ir }: { resumen: Resumen; color: string; ir: (p: Pestana) => void }) {
    const [verPago, setVerPago] = useState(false);
    const total = resumen.cuenta.adeudos.reduce((suma, a) => suma + a.monto, 0);
    const vencido = resumen.cuenta.adeudos.some((a) => a.vencido);
    const proximo = resumen.cuenta.adeudos[0];
    const bajada = resumen.plan ? velocidad(resumen.plan.bajada_kbps) : null;
    const subida = resumen.plan ? velocidad(resumen.plan.subida_kbps) : null;
    const accesos = [
        { texto: 'Mi WiFi', icono: WifiIcon, destino: 'red' as const },
        { texto: 'Reiniciar módem', icono: PowerIcon, destino: 'red' as const },
        { texto: 'Mi consumo', icono: ChartBarIcon, destino: 'consumo' as const },
        { texto: 'Reportar falla', icono: LifebuoyIcon, destino: 'ayuda' as const },
    ];

    return (
        <>
            <section className={TARJETA}>
                <div className="flex items-center justify-between">
                    <p className={ETIQUETA}>Tu internet</p>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span className={`h-2 w-2 rounded-full ${resumen.conectado ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {resumen.conectado ? 'Conectado' : 'Sin conexión ahora'}
                    </span>
                </div>
                {resumen.plan && bajada && subida ? (
                    <div className="mt-3 flex items-end justify-between gap-4" data-testid="plan-portal">
                        <div>
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-5xl font-semibold tracking-tight">{bajada.valor}</span>
                                <span className="text-lg font-medium text-slate-500 dark:text-slate-400">{bajada.unidad}</span>
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Plan {resumen.plan.nombre}</p>
                        </div>
                        <div className="space-y-1 text-right text-xs text-slate-500 dark:text-slate-400">
                            <p className="flex items-center justify-end gap-1"><ArrowDownIcon className="h-3.5 w-3.5" />{bajada.valor} {bajada.unidad} bajada</p>
                            <p className="flex items-center justify-end gap-1"><ArrowUpIcon className="h-3.5 w-3.5" />{subida.valor} {subida.unidad} subida</p>
                        </div>
                    </div>
                ) : <p className="mt-3 text-sm text-slate-500">{resumen.cuenta.explicacion}</p>}
                {resumen.plan && resumen.cuenta.estado_servicio !== 'activo' && (
                    <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{resumen.cuenta.explicacion}</p>
                )}
            </section>

            <section className={`${TARJETA} space-y-4`}>
                <p className={ETIQUETA}>Tus pagos</p>
                {total > 0 ? (
                    <div>
                        <p className="text-4xl font-semibold tracking-tight">{dinero(total)}</p>
                        <p className={`mt-1 text-sm ${vencido ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {vencido ? 'Pago vencido' : proximo?.vence ? `Vence el ${proximo.vence}` : 'Por pagar'}
                            {resumen.cuenta.promesa && ` · promesa para el ${resumen.cuenta.promesa.fecha}`}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <CheckCircleIcon className="h-9 w-9 text-emerald-500" />
                        <div>
                            <p className="text-lg font-semibold">Estás al corriente</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{resumen.plan ? `Mensualidad ${dinero(resumen.plan.precio)}` : 'Sin adeudos'}</p>
                        </div>
                    </div>
                )}
                {resumen.saldo_a_favor > 0 && <p className="text-sm text-emerald-700 dark:text-emerald-300">Tienes {dinero(resumen.saldo_a_favor)} a favor.</p>}
                {resumen.datos_pago && (
                    <div>
                        <button type="button" onClick={() => setVerPago((v) => !v)} className={`${BOTON_SUAVE} w-full justify-between`} aria-expanded={verPago}>
                            ¿Cómo pago?
                            <ChevronDownIcon className={`h-4 w-4 transition ${verPago ? 'rotate-180' : ''}`} />
                        </button>
                        {verPago && <p className="mt-3 whitespace-pre-line px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{sinFormatoWhatsapp(resumen.datos_pago)}</p>}
                    </div>
                )}
                {resumen.pagos.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                        <p className={`${ETIQUETA} mb-2`}>Últimos pagos</p>
                        <ul className="space-y-2">
                            {resumen.pagos.slice(0, 3).map((p, n) => (
                                <li key={n} className="flex justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">{fechaCorta(p.fecha)}</span>
                                    <span className="font-medium">{dinero(p.monto)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-2 gap-3">
                {accesos.map(({ texto, icono: Icono, destino }) => (
                    <button key={texto} type="button" onClick={() => ir(destino)}
                        className={`${TARJETA} flex flex-col items-start gap-3 p-4 text-left transition active:scale-[0.98]`}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                            <Icono className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium">{texto}</span>
                    </button>
                ))}
            </section>

            <InstalarApp color={color} />
        </>
    );
}

function InstalarApp({ color }: { color: string }) {
    const { disponible, iphone, instalar } = useInstalacion();
    const [verPasos, setVerPasos] = useState(false);
    if (!disponible) return null;
    return (
        <section className={`${TARJETA} space-y-3`}>
            <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                    <ArrowDownTrayIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Instala la app</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ten tu cuenta a un toque desde tu pantalla de inicio.</p>
                </div>
                <button type="button" onClick={() => (iphone ? setVerPasos((v) => !v) : void instalar())} className={BOTON_SUAVE}>Instalar</button>
            </div>
            {iphone && verPasos && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    En Safari toca el botón <strong>Compartir</strong> (el cuadro con la flecha) y luego <strong>Agregar a inicio</strong>.
                </p>
            )}
        </section>
    );
}

function Ayuda({ telefono, color }: { telefono: string | null; color: string }) {
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

    const whatsapp = telefono ? `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')}` : null;

    return (
        <>
            <form onSubmit={reportar} className={`${TARJETA} space-y-4`}>
                <div>
                    <h2 className={TITULO}>Reportar una falla</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Antes prueba reiniciar tu módem desde Mi red; muchas veces se arregla solo.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="¿Qué pasa?">
                    {FALLAS.map(([valor, texto]) => {
                        const elegida = categoria === valor;
                        return (
                            <button key={valor} type="button" role="radio" aria-checked={elegida} onClick={() => setCategoria(valor)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${elegida ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                                style={elegida ? { background: color } : undefined}>
                                {texto}
                            </button>
                        );
                    })}
                </div>
                <textarea
                    value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={1000} aria-label="Cuéntanos qué pasa"
                    placeholder="Cuéntanos qué pasa: desde cuándo, si ya reiniciaste, qué foco está en rojo…" className={`${CAMPO} resize-none`}
                />
                <button type="submit" disabled={enviando || descripcion.trim().length < 5} className={BOTON} style={{ background: color }}>
                    {enviando ? 'Enviando…' : 'Enviar reporte'}
                </button>
            </form>

            {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className={`${TARJETA} flex items-center gap-4`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Escríbenos por WhatsApp</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{telefono}</p>
                    </div>
                </a>
            )}

            <section className={`${TARJETA} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className={TITULO}>Contraseña del portal</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">La que usas para entrar aquí.</p>
                    </div>
                    {!cambiando && <button type="button" onClick={() => setCambiando(true)} className={BOTON_SUAVE}>Cambiar</button>}
                </div>
                {cambiando && <CambiarClavePortal color={color} onListo={() => setCambiando(false)} />}
            </section>

            <InstalarApp color={color} />
        </>
    );
}
