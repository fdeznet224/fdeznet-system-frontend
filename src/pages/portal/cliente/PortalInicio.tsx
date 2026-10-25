import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon, ChevronRightIcon, DocumentTextIcon, HomeIcon, MoonIcon, SignalIcon, SunIcon, UserCircleIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import { datos } from '@/pages/clientes/components/consumo';
import AyudaPortal from './AyudaPortal';
import BienvenidaApp from './BienvenidaApp';
import { mensajeCalendario } from './calendario';
import ConsumoPortal from './ConsumoPortal';
import EstadoServicioPortal from './EstadoServicioPortal';
import PagosPortal from './PagosPortal';
import PerfilPortal, { Notificaciones } from './PerfilPortal';
import RedPortal from './RedPortal';
import ServiciosPortal from './ServiciosPortal';
import type { Pestana, Resumen } from './tipos';
import { ERROR, ETIQUETA, FONDO, TARJETA, cambiarTema, dinero, velocidad } from './ui';

const BARRA: { id: Exclude<Pestana, 'consumo'>; texto: string; icono: typeof HomeIcon }[] = [
    { id: 'inicio', texto: 'Inicio', icono: HomeIcon },
    { id: 'facturas', texto: 'Mis facturas', icono: DocumentTextIcon },
    { id: 'red', texto: 'Mi WiFi', icono: WifiIcon },
    { id: 'perfil', texto: 'Perfil', icono: UserCircleIcon },
];
const TITULOS: Record<Pestana, string> = {
    inicio: 'Inicio', facturas: 'Mis facturas', red: 'Mi WiFi', perfil: 'Mi perfil', consumo: 'Mi consumo',
};
const mesActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

/** Portal del cliente: Inicio, Mis facturas, Mi WiFi y Perfil; el consumo se abre desde Inicio. */
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

    const cargar = useCallback(() => {
        portalClient.get<Resumen>('/portal/resumen')
            .then(({ data }) => setResumen(data))
            .catch((e) => {
                if (e.response?.status === 403) navigate('/cliente', { replace: true });
                else setError(apiErrorMessage(e, 'No se pudo cargar tu cuenta'));
            });
    }, [navigate]);

    useEffect(() => { cargar(); }, [cargar]);

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
                    {pestana === 'consumo' ? (
                        <button type="button" onClick={() => ir('inicio')} aria-label="Regresar" className="-ml-2 rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl" style={{ background: color }}>
                            {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-4 w-4 text-white" />}
                        </span>
                    )}
                    <span className="flex-1 truncate text-sm font-semibold">{brand.empresa_nombre}</span>
                    <button type="button" onClick={cambiarTema} aria-label="Cambiar tema" className="rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                        <SunIcon className="hidden h-5 w-5 dark:block" />
                        <MoonIcon className="h-5 w-5 dark:hidden" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                <div className="px-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {pestana === 'inicio' ? (resumen ? `Hola, ${resumen.nombre}` : 'Hola') : TITULOS[pestana]}
                    </h1>
                    {resumen && pestana === 'inicio' && <p className="text-sm text-slate-500 dark:text-slate-400">Contrato {resumen.contrato}</p>}
                </div>

                {error && <p className={ERROR}>{error}</p>}
                {!resumen && !error && <div className={`${TARJETA} h-48 animate-pulse`} />}

                {resumen && pestana === 'inicio' && <Inicio resumen={resumen} color={color} ir={ir} telefonoEmpresa={brand.empresa_telefono} onCambio={cargar} />}
                {resumen && pestana === 'consumo' && <ConsumoPortal nombre={resumen.nombre} color={color} />}
                {resumen && pestana === 'facturas' && <PagosPortal resumen={resumen} color={color} onCambio={cargar} />}
                {resumen && pestana === 'red' && (resumen.tiene_onu
                    ? <RedPortal color={color} />
                    : <p className={`${TARJETA} text-sm text-slate-500`}>Tu servicio no tiene un módem que se pueda controlar desde aquí.</p>)}
                {resumen && pestana === 'perfil' && (
                    <PerfilPortal resumen={resumen} color={color} telefonoEmpresa={brand.empresa_telefono} onCambio={cargar} onSalir={() => void salir()} />
                )}
            </main>

            {resumen && <BienvenidaApp color={color} />}

            <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/60 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-white/5 dark:bg-slate-950/90">
                <div className="mx-auto grid max-w-lg grid-cols-4 px-2">
                    {BARRA.map(({ id, texto, icono: Icono }) => {
                        const activa = pestana === id || (id === 'inicio' && pestana === 'consumo');
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

function Inicio({ resumen, color, ir, telefonoEmpresa, onCambio }: { resumen: Resumen; color: string; ir: (p: Pestana) => void; telefonoEmpresa: string | null; onCambio: () => void }) {
    const [mes, setMes] = useState<number | null>(null);
    const [ahora, setAhora] = useState<number | null>(null);
    const bajada = resumen.plan ? velocidad(resumen.plan.bajada_kbps) : null;
    const subida = resumen.plan ? velocidad(resumen.plan.subida_kbps) : null;
    const pago = mensajeCalendario(resumen.calendario);

    useEffect(() => {
        let vigente = true;
        portalClient.get<{ total_bajada: number; total_subida: number }>('/portal/consumo', { params: { mes: mesActual() } })
            .then(({ data }) => { if (vigente) setMes((data.total_bajada || 0) + (data.total_subida || 0)); })
            .catch(() => undefined);
        const leer = () => portalClient.get<{ bajada_bps: number; disponible: boolean }>('/portal/trafico')
            .then(({ data }) => { if (vigente && data.disponible) setAhora(data.bajada_bps); })
            .catch(() => undefined);
        void leer();
        const cada = window.setInterval(() => { if (document.visibilityState === 'visible') void leer(); }, 6000);
        return () => { vigente = false; window.clearInterval(cada); };
    }, []);

    return (
        <>
            <EstadoServicioPortal color={color} tieneOnu={resumen.tiene_onu} onReactivado={onCambio} />
            <section className={TARJETA} data-testid="plan-portal">
                <div className="flex items-center justify-between">
                    <p className={ETIQUETA}>Tu plan</p>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span className={`h-2 w-2 rounded-full ${resumen.conectado ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {resumen.conectado ? 'Conectado' : 'Sin conexión ahora'}
                    </span>
                </div>
                {resumen.plan && bajada && subida ? (
                    <>
                        <div className="mt-2 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-2xl font-semibold tracking-tight">{resumen.plan.nombre}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{bajada.valor} {bajada.unidad} de bajada · {subida.valor} {subida.unidad} de subida</p>
                            </div>
                            <p className="text-right">
                                <span className="block text-2xl font-semibold tracking-tight">{dinero(resumen.plan.precio)}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">al mes</span>
                            </p>
                        </div>
                        <button type="button" onClick={() => ir('facturas')}
                            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm dark:bg-slate-800/60">
                            <span className={pago.tono === 'rojo' ? 'font-medium text-rose-600 dark:text-rose-400' : pago.tono === 'ambar' ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}>
                                {pago.titulo}
                            </span>
                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                    </>
                ) : <p className="mt-2 text-sm text-slate-500">{resumen.cuenta.explicacion}</p>}
            </section>

            <button type="button" onClick={() => ir('consumo')} className={`${TARJETA} block w-full text-left`} data-testid="consumo-inicio">
                <div className="flex items-center justify-between">
                    <p className={ETIQUETA}>Tu consumo este mes</p>
                    <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-end justify-between gap-4">
                    <p className="text-3xl font-semibold tracking-tight">{mes === null ? '–' : datos(mes)}</p>
                    {ahora !== null && (
                        <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            {(ahora / 1_000_000).toFixed(ahora >= 10_000_000 ? 0 : 1)} Mbps ahora
                        </p>
                    )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Toca para ver tu consumo de cada día</p>
            </button>

            <ServiciosPortal contrato={resumen.contrato} telefonoEmpresa={telefonoEmpresa} color={color} />
            <AyudaPortal color={color} />
            <Notificaciones color={color} compacta />
        </>
    );
}
