import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDownIcon, ArrowUpIcon, BanknotesIcon, ChartBarIcon, HomeIcon, LifebuoyIcon, MoonIcon, SignalIcon, SunIcon,
    UserCircleIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import AyudaPortal from './AyudaPortal';
import ConsumoPortal from './ConsumoPortal';
import InstalarApp from './InstalarApp';
import PagosPortal from './PagosPortal';
import PerfilPortal, { Notificaciones } from './PerfilPortal';
import RedPortal from './RedPortal';
import SemanaPago from './SemanaPago';
import type { Pestana, Resumen } from './tipos';
import { ERROR, ETIQUETA, FONDO, TARJETA, cambiarTema, dinero, velocidad } from './ui';

const PESTANAS: { id: Exclude<Pestana, 'perfil'>; texto: string; icono: typeof HomeIcon }[] = [
    { id: 'inicio', texto: 'Inicio', icono: HomeIcon },
    { id: 'pagos', texto: 'Pagos', icono: BanknotesIcon },
    { id: 'consumo', texto: 'Consumo', icono: ChartBarIcon },
    { id: 'red', texto: 'Mi red', icono: WifiIcon },
    { id: 'ayuda', texto: 'Ayuda', icono: LifebuoyIcon },
];
const TITULOS: Record<Pestana, string> = {
    inicio: 'Inicio', pagos: 'Pagos', consumo: 'Consumo', red: 'Mi red', ayuda: 'Ayuda', perfil: 'Mi perfil',
};

/** Portal del cliente: su cuenta, pagos, consumo, la red de su casa, ayuda y su perfil. */
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
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl" style={{ background: color }}>
                        {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-4 w-4 text-white" />}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold">{brand.empresa_nombre}</span>
                    <button type="button" onClick={cambiarTema} aria-label="Cambiar tema" className="rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                        <SunIcon className="hidden h-5 w-5 dark:block" />
                        <MoonIcon className="h-5 w-5 dark:hidden" />
                    </button>
                    <button type="button" onClick={() => ir('perfil')} aria-label="Mi perfil"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10"
                        style={pestana === 'perfil' ? { color } : undefined}>
                        <UserCircleIcon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                <div className="px-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {pestana === 'inicio' ? (resumen ? `Hola, ${resumen.nombre.split(' ')[0]}` : 'Hola') : TITULOS[pestana]}
                    </h1>
                    {resumen && pestana === 'inicio' && <p className="text-sm text-slate-500 dark:text-slate-400">Contrato {resumen.contrato}</p>}
                </div>

                {error && <p className={ERROR}>{error}</p>}
                {!resumen && !error && <div className={`${TARJETA} h-48 animate-pulse`} />}

                {resumen && pestana === 'inicio' && <Inicio resumen={resumen} color={color} ir={ir} />}
                {resumen && pestana === 'pagos' && <PagosPortal resumen={resumen} color={color} onCambio={cargar} />}
                {resumen && pestana === 'consumo' && <ConsumoPortal nombre={resumen.nombre} color={color} />}
                {resumen && pestana === 'red' && (resumen.tiene_onu
                    ? <RedPortal color={color} />
                    : <p className={`${TARJETA} text-sm text-slate-500`}>Tu servicio no tiene un módem que se pueda controlar desde aquí.</p>)}
                {resumen && pestana === 'ayuda' && <AyudaPortal telefono={brand.empresa_telefono} color={color} />}
                {resumen && pestana === 'perfil' && <PerfilPortal resumen={resumen} color={color} onCambio={cargar} onSalir={() => void salir()} />}
            </main>

            <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/60 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-white/5 dark:bg-slate-950/90">
                <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
                    {PESTANAS.map(({ id, texto, icono: Icono }) => {
                        const activa = pestana === id;
                        return (
                            <button key={id} type="button" onClick={() => ir(id)} aria-current={activa ? 'page' : undefined}
                                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${activa ? '' : 'text-slate-400 dark:text-slate-500'}`}
                                style={activa ? { color } : undefined}>
                                <span className="flex h-7 w-11 items-center justify-center rounded-full" style={activa ? { background: `${color}1a` } : undefined}>
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
    const total = resumen.cuenta.adeudos.reduce((suma, a) => suma + a.monto, 0);
    const bajada = resumen.plan ? velocidad(resumen.plan.bajada_kbps) : null;
    const subida = resumen.plan ? velocidad(resumen.plan.subida_kbps) : null;
    const accesos = [
        { texto: total > 0 ? `Pagar ${dinero(total)}` : 'Mis facturas', icono: BanknotesIcon, destino: 'pagos' as const },
        { texto: 'Mi WiFi', icono: WifiIcon, destino: 'red' as const },
        { texto: 'Mi consumo', icono: ChartBarIcon, destino: 'consumo' as const },
        { texto: 'Reportar falla', icono: LifebuoyIcon, destino: 'ayuda' as const },
    ];

    return (
        <>
            <SemanaPago calendario={resumen.calendario} color={color} />

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

            <section className="grid grid-cols-2 gap-3">
                {accesos.map(({ texto, icono: Icono, destino }) => (
                    <button key={destino + texto} type="button" onClick={() => ir(destino)}
                        className={`${TARJETA} flex flex-col items-start gap-3 p-4 text-left transition active:scale-[0.98]`}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                            <Icono className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium">{texto}</span>
                    </button>
                ))}
            </section>

            <Notificaciones color={color} compacta />
            <InstalarApp color={color} />
        </>
    );
}
