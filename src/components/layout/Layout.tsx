import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
    ArrowRightStartOnRectangleIcon, ChevronDownIcon, MagnifyingGlassIcon,
    MoonIcon, SignalIcon, Squares2X2Icon, SunIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import ClientDetailModal from '@/pages/clientes/components/ClientDetailModal';
import { notifySessionChanged } from '@/offline/db';
import type { AppRole } from '@/utils/roles';
import { useBrand } from '@/context/brand/useBrand';
import BuscadorGlobal, { type ClienteEncontrado } from './BuscadorGlobal';
import { GRUPO_PRINCIPAL, barraDelRol, grupoDeRuta, gruposDelRol, itemDeRuta, type ItemNav } from './navegacion';

interface SessionUser {
    usuario: string;
    rol: AppRole;
}

interface LicenseNotice {
    estado: string;
    mensaje: string;
    plan_nombre: string | null;
    vigente_hasta: string | null;
}

const NOMBRE_ROL: Record<AppRole, string> = { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero', tecnico: 'Técnico' };

function getSessionUser(raw: string | null): SessionUser {
    if (!raw) return { usuario: 'Invitado', rol: 'cajero' };
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            const record = parsed as Record<string, unknown>;
            const role = typeof record.rol === 'string' ? record.rol.trim().toLowerCase() : '';
            if (role === 'admin' || role === 'supervisor' || role === 'cajero' || role === 'tecnico') {
                return { usuario: typeof record.usuario === 'string' ? record.usuario : 'Invitado', rol: role };
            }
        }
    } catch {
        console.error('No fue posible leer la sesión guardada');
    }
    return { usuario: 'Invitado', rol: 'cajero' };
}

function Inicial({ nombre, className = '' }: { nombre: string; className?: string }) {
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold uppercase text-white dark:bg-white dark:text-slate-900 ${className}`}>
            {(nombre || '?').charAt(0)}
        </span>
    );
}

export default function Layout() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const location = useLocation();
    const user = getSessionUser(localStorage.getItem('user'));

    const [licenseNotice, setLicenseNotice] = useState<LicenseNotice | null>(null);
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);
    const [masAbierto, setMasAbierto] = useState(false);
    const [clienteAbierto, setClienteAbierto] = useState<ClienteEncontrado | null>(null);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark'));

    const grupos = useMemo(() => gruposDelRol(user.rol), [user.rol]);
    const barra = useMemo(() => barraDelRol(user.rol), [user.rol]);
    const actual = itemDeRuta(location.pathname);
    const grupoActual = grupoDeRuta(location.pathname);
    // Cada grupo se abre o cierra a mano; sin tocarlo, solo está abierto el de la pantalla actual.
    const [gruposElegidos, setGruposElegidos] = useState<Record<string, boolean>>({});
    const grupoAbierto = (nombre: string) => gruposElegidos[nombre] ?? nombre === grupoActual?.nombre;

    useEffect(() => {
        let active = true;
        const loadLicense = async () => {
            try {
                const { data } = await client.get<LicenseNotice>('/licencia/estado');
                if (active) setLicenseNotice(data);
            } catch { /* La navegación conserva su manejo normal de sesión. */ }
        };
        void loadLicense();
        const timer = window.setInterval(() => void loadLicense(), 5 * 60 * 1000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);

    // Ctrl+K (o ⌘K) abre el buscador desde cualquier pantalla.
    useEffect(() => {
        const atajo = (evento: KeyboardEvent) => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
                evento.preventDefault();
                setBuscadorAbierto(true);
            }
        };
        window.addEventListener('keydown', atajo);
        return () => window.removeEventListener('keydown', atajo);
    }, []);

    const cambiarTema = () => {
        const oscuro = !darkMode;
        setDarkMode(oscuro);
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: oscuro ? 'dark' : 'light' }));
    };

    const cerrarSesion = () => {
        void client.post('/auth/logout').finally(() => {
            localStorage.clear();
            notifySessionChanged();
            navigate('/');
        });
    };

    const alternarGrupo = (nombre: string) => setGruposElegidos((elegidos) => ({ ...elegidos, [nombre]: !grupoAbierto(nombre) }));

    const titulo = actual?.nombre || brand.empresa_nombre;
    const enBarra = barra.some((item) => item.ruta === actual?.ruta);
    const esActual = (item: ItemNav) => actual?.ruta === item.ruta;
    const temaEtiqueta = darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro';

    const logo = (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: brand.color_primario }}>
            {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-5 w-5 text-white" />}
        </span>
    );

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-[#f5f6f8] font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {/* BARRA LATERAL (computadora) */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
                <div className="flex h-16 items-center gap-3 px-5">
                    {logo}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{brand.empresa_nombre}</p>
                        <p className="text-xs text-slate-500">Administración</p>
                    </div>
                </div>

                <div className="px-3 pb-2">
                    <button type="button" onClick={() => setBuscadorAbierto(true)} className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:text-slate-300">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span className="flex-1 text-left">Buscar cliente...</span>
                        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">Ctrl K</kbd>
                    </button>
                </div>

                <nav aria-label="Menú principal" className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
                    {grupos.map((grupo, indice) => {
                        const enlaces = grupo.items.map((item) => (
                            <Link
                                key={item.ruta}
                                to={item.ruta}
                                aria-current={esActual(item) ? 'page' : undefined}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${esActual(item)
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'}`}
                            >
                                <item.icono className={`h-5 w-5 shrink-0 ${esActual(item) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                <span className="truncate">{item.nombre}</span>
                            </Link>
                        ));
                        if (indice === 0) return <div key={grupo.nombre} className="space-y-0.5 pb-2">{enlaces}</div>;
                        const abierto = grupoAbierto(grupo.nombre);
                        return (
                            <div key={grupo.nombre}>
                                <button
                                    type="button"
                                    onClick={() => alternarGrupo(grupo.nombre)}
                                    aria-expanded={abierto}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                    {grupo.nombre}
                                    <ChevronDownIcon className={`h-3.5 w-3.5 transition ${abierto ? '' : '-rotate-90'}`} />
                                </button>
                                {abierto && <div className="space-y-0.5 pb-2">{enlaces}</div>}
                            </div>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-3 border-t border-slate-200 p-3 dark:border-slate-800">
                    <Inicial nombre={user.usuario} className="h-9 w-9 text-sm" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.usuario}</p>
                        <p className="text-xs text-slate-500">{NOMBRE_ROL[user.rol]}</p>
                    </div>
                    <button type="button" onClick={cambiarTema} title={temaEtiqueta} aria-label={temaEtiqueta} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
                        {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400">
                        <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* ENCABEZADO */}
                <header className="app-topbar sticky top-0 z-40 flex min-h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:min-h-16 lg:px-8">
                    <div className="lg:hidden">{logo}</div>
                    {/* Celular: la marca (el título grande va en la página). Computadora: dónde estás. */}
                    <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-900 dark:text-white lg:hidden">{brand.empresa_nombre}</p>
                    <nav aria-label="Ubicación" className="hidden min-w-0 flex-1 items-center gap-2 text-sm lg:flex">
                        <span className="text-slate-400">{grupoActual && grupoActual.nombre !== GRUPO_PRINCIPAL ? grupoActual.nombre : brand.empresa_nombre}</span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="truncate font-semibold text-slate-900 dark:text-white">{titulo}</span>
                    </nav>
                    <span className="lg:hidden">
                        <button type="button" aria-label="Buscar cliente" onClick={() => setBuscadorAbierto(true)} className="app-icon-button">
                            <MagnifyingGlassIcon className="h-5 w-5" />
                        </button>
                    </span>
                    <button type="button" aria-label="Tu cuenta y más secciones" onClick={() => setMasAbierto(true)} className="lg:hidden">
                        <Inicial nombre={user.usuario} className="h-9 w-9 text-sm" />
                    </button>
                </header>

                <main className="custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
                        {licenseNotice && ['gracia', 'vencida', 'suspendida', 'revocada'].includes(licenseNotice.estado) && (
                            <div className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${licenseNotice.estado === 'gracia' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200' : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}`}>
                                {licenseNotice.mensaje}{licenseNotice.plan_nombre ? ` · Plan ${licenseNotice.plan_nombre}` : ''}
                            </div>
                        )}
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* BARRA DE ABAJO (celular) */}
            <nav aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
                <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))` }}>
                    {barra.map((item) => (
                        <Link
                            key={item.ruta}
                            to={item.ruta}
                            aria-current={esActual(item) ? 'page' : undefined}
                            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${esActual(item) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${esActual(item) ? 'bg-blue-50 dark:bg-blue-500/15' : ''}`}>
                                <item.icono className="h-5 w-5" />
                            </span>
                            {item.corto || item.nombre}
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMasAbierto(true)}
                        className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${!enBarra && actual ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <span className={`flex h-7 w-12 items-center justify-center rounded-full ${!enBarra && actual ? 'bg-blue-50 dark:bg-blue-500/15' : ''}`}>
                            <Squares2X2Icon className="h-5 w-5" />
                        </span>
                        Más
                    </button>
                </div>
            </nav>

            {/* MÁS: todas las secciones y la cuenta (celular) */}
            <Dialog open={masAbierto} onClose={() => setMasAbierto(false)} aria-label="Más secciones" className="fixed inset-0 z-[80] lg:hidden">
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-x-0 bottom-0 flex max-h-[88dvh]">
                    <DialogPanel className="flex w-full flex-col overflow-hidden rounded-t-3xl bg-[#f5f6f8] dark:bg-slate-950">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                            <Inicial nombre={user.usuario} className="h-10 w-10" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.usuario}</p>
                                <p className="text-xs text-slate-500">{NOMBRE_ROL[user.rol]} · {brand.empresa_nombre}</p>
                            </div>
                            <button type="button" onClick={() => setMasAbierto(false)} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 space-y-5 overflow-y-auto p-4">
                            {grupos.map((grupo) => (
                                <div key={grupo.nombre}>
                                    <p className="mb-2 px-1 text-xs font-semibold text-slate-400">{grupo.nombre}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {grupo.items.map((item) => (
                                            <Link
                                                key={item.ruta}
                                                to={item.ruta}
                                                onClick={() => setMasAbierto(false)}
                                                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center text-xs font-semibold leading-tight transition active:scale-95 ${esActual(item)
                                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                                                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'}`}
                                            >
                                                <item.icono className="h-6 w-6" />
                                                {item.nombre}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
                                <button type="button" onClick={cambiarTema} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                                    {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                    {darkMode ? 'Modo claro' : 'Modo oscuro'}
                                </button>
                                <button type="button" onClick={cerrarSesion} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-400">
                                    <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            <BuscadorGlobal
                abierto={buscadorAbierto}
                rol={user.rol}
                onCerrar={() => setBuscadorAbierto(false)}
                onCliente={setClienteAbierto}
                onSeccion={(item) => navigate(item.ruta)}
            />

            {clienteAbierto && (
                <ClientDetailModal isOpen onClose={() => setClienteAbierto(null)} cliente={clienteAbierto} />
            )}
        </div>
    );
}
