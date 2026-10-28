import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowRightStartOnRectangleIcon, ChevronDownIcon, MagnifyingGlassIcon,
    MoonIcon, SignalIcon, Squares2X2Icon, SunIcon,
} from '@heroicons/react/24/outline';
import { Squares2X2Icon as Squares2X2Lleno } from '@heroicons/react/24/solid';

import client from '@/api/axios';
import ClientDetailModal from '@/pages/clientes/components/ClientDetailModal';
import { notifySessionChanged } from '@/offline/db';
import type { AppRole } from '@/utils/roles';
import { useBrand } from '@/context/brand/useBrand';
import { CuadroIcono } from '@/components/ui/Pagina';
import BuscadorGlobal, { type ClienteEncontrado } from './BuscadorGlobal';
import { AbrirBuscador } from './buscadorContexto';
import type { ContextoMas } from './MasSecciones';
import { RUTA_MAS, barraDelRol, grupoDeRuta, gruposDelRol, itemDeRuta, type ItemNav } from './navegacion';

interface SessionUser {
    usuario: string;
    rol: AppRole;
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

export function Inicial({ nombre, className = '' }: { nombre: string; className?: string }) {
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold uppercase text-white ${className}`}>
            {(nombre || '?').charAt(0)}
        </span>
    );
}

export default function Layout() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const location = useLocation();
    const user = getSessionUser(localStorage.getItem('user'));

    const [buscadorAbierto, setBuscadorAbierto] = useState(false);
    const [clienteAbierto, setClienteAbierto] = useState<ClienteEncontrado | null>(null);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark'));

    const grupos = useMemo(() => gruposDelRol(user.rol), [user.rol]);
    const barra = useMemo(() => barraDelRol(user.rol), [user.rol]);
    const actual = itemDeRuta(location.pathname);
    const grupoActual = grupoDeRuta(location.pathname);
    // Cada grupo se abre o cierra a mano; sin tocarlo, solo está abierto el de la pantalla actual.
    const [gruposElegidos, setGruposElegidos] = useState<Record<string, boolean>>({});
    const grupoAbierto = (nombre: string) => gruposElegidos[nombre] ?? nombre === grupoActual?.nombre;

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

    const enBarra = barra.some((item) => item.ruta === actual?.ruta);
    const enMas = location.pathname === RUTA_MAS || (!enBarra && Boolean(actual));
    const contextoMas: ContextoMas = { grupos, barra, usuario: user.usuario, nombreRol: NOMBRE_ROL[user.rol], empresa: brand.empresa_nombre, darkMode, cambiarTema, cerrarSesion, abrirBuscador: () => setBuscadorAbierto(true) };
    const esActual = (item: ItemNav) => actual?.ruta === item.ruta;
    const temaEtiqueta = darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro';

    const logo = (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: brand.color_primario }}>
            {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-5 w-5 text-white" />}
        </span>
    );

    return (
        <AbrirBuscador.Provider value={() => setBuscadorAbierto(true)}>
        <div className="flex h-[100dvh] overflow-hidden bg-fondo font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {/* BARRA LATERAL (computadora) */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-black/[0.06] bg-white/70 dark:border-slate-800 dark:bg-slate-900 lg:flex">
                <div className="flex h-16 items-center gap-3 px-5">
                    {logo}
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{brand.empresa_nombre}</p>
                        <p className="text-xs text-[#5b6170] dark:text-slate-400">Administración</p>
                    </div>
                </div>

                <div className="px-3 pb-2">
                    <button type="button" onClick={() => setBuscadorAbierto(true)} className="flex h-10 w-full items-center gap-2 rounded-xl bg-[#e4e4ea] px-3 text-sm text-[#5b6170] transition hover:bg-[#dadae0] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span className="flex-1 text-left">Buscar cliente...</span>
                        <kbd className="rounded-md bg-white px-1.5 font-sans text-[10px] font-semibold text-[#5b6170] dark:bg-slate-900">Ctrl K</kbd>
                    </button>
                </div>

                <nav aria-label="Menú principal" className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
                    {grupos.map((grupo, indice) => {
                        const enlaces = grupo.items.map((item) => (
                            <Link
                                key={item.ruta}
                                to={item.ruta}
                                aria-current={esActual(item) ? 'page' : undefined}
                                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition ${esActual(item)
                                    ? 'bg-blue-600/10 font-semibold text-slate-900 dark:bg-blue-500/15 dark:text-white'
                                    : 'font-medium text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-slate-800/70'}`}
                            >
                                <CuadroIcono icono={item.icono} tono={item.tono} className="h-7 w-7" />
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
                                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase text-[#5b6170] transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    {grupo.nombre}
                                    <ChevronDownIcon className={`h-3.5 w-3.5 transition ${abierto ? '' : '-rotate-90'}`} />
                                </button>
                                {abierto && <div className="space-y-0.5 pb-2">{enlaces}</div>}
                            </div>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-3 border-t border-black/[0.06] p-3 dark:border-slate-800">
                    <Inicial nombre={user.usuario} className="h-9 w-9 text-sm" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.usuario}</p>
                        <p className="text-xs text-[#5b6170] dark:text-slate-400">{NOMBRE_ROL[user.rol]}</p>
                    </div>
                    <button type="button" onClick={cambiarTema} title={temaEtiqueta} aria-label={temaEtiqueta} className="rounded-lg p-2 text-[#5b6170] transition hover:bg-black/[0.05] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                        {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión" className="rounded-lg p-2 text-[#5b6170] transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400">
                        <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Sin barra arriba: cada pantalla abre con su título grande (y la lupa en el celular). */}
                <main className="custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
                        <Outlet context={contextoMas} />
                    </div>
                </main>
            </div>

            {/* BARRA DE ABAJO (celular): lo de todos los días y Más */}
            <nav aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dcdce2] bg-[#f9f9fb]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
                <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))` }}>
                    {barra.map((item) => (
                        <Link
                            key={item.ruta}
                            to={item.ruta}
                            aria-current={esActual(item) ? 'page' : undefined}
                            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] transition ${esActual(item) ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-semibold text-[#5b6170] dark:text-slate-400'}`}
                        >
                            <item.icono className={`h-6 w-6 ${esActual(item) ? 'stroke-[2.2]' : ''}`} />
                            {item.corto || item.nombre}
                        </Link>
                    ))}
                    <Link
                        to={RUTA_MAS}
                        aria-current={location.pathname === RUTA_MAS ? 'page' : undefined}
                        className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] transition ${enMas ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-semibold text-[#5b6170] dark:text-slate-400'}`}
                    >
                        {enMas ? <Squares2X2Lleno className="h-6 w-6" /> : <Squares2X2Icon className="h-6 w-6" />}
                        Más
                    </Link>
                </div>
            </nav>

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
        </AbrirBuscador.Provider>
    );
}
