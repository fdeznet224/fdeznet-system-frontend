import { useEffect, useState } from 'react';
import type { FormEvent } from 'react'; 
import axios from 'axios';
import { apiErrorMessage } from '@/utils/apiError';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { notifySessionChanged } from '@/offline/db';
import { useBrand } from '@/context/brand/useBrand';
import { activarHuella, entrarConHuella, huellaActivadaAqui, huellaPosible, nombreDeEsteCelular, NO_PREGUNTAR_HUELLA } from '@/utils/huella';
import {
    defaultPathForRole,
    type AppRole,
} from '@/utils/roles';
import { 
    SignalIcon, 
    UserIcon, 
    LockClosedIcon, 
    ArrowPathIcon,
    EyeIcon,
    EyeSlashIcon,
    FingerPrintIcon,
} from '@heroicons/react/24/outline';

interface LoginUser {
    id: number;
    usuario: string;
    rol: string;
}

interface LoginResponse {
    access_token: string;
    token_type: 'bearer';
    user: LoginUser;
}

const ROLES: AppRole[] = ['admin', 'supervisor', 'cajero', 'tecnico'];

/** Rol de la sesión guardada en este dispositivo, si hay una. */
function rolGuardado(): AppRole | null {
    try {
        const rol = (JSON.parse(localStorage.getItem('user') || 'null') as { rol?: string } | null)?.rol?.trim().toLowerCase();
        return ROLES.find((item) => item === rol) ?? null;
    } catch {
        return null;
    }
}

export default function Login() {
    const { brand } = useBrand();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    // La app instalada abre en "/": si ya hay sesión en el dispositivo se entra
    // directo, también sin internet. Si la sesión venció, el servidor responde
    // 401 al volver la conexión y se regresa aquí.
    const [rolInicial] = useState(rolGuardado);
    // Huella: el botón sale en los celulares donde ya se activó; si no, se ofrece al entrar.
    const [conHuella, setConHuella] = useState(false);
    const [puedeHuella, setPuedeHuella] = useState(false);
    const [ofrecer, setOfrecer] = useState<LoginUser | null>(null);
    const [activando, setActivando] = useState(false);

    useEffect(() => {
        void huellaPosible().then((posible) => {
            setPuedeHuella(posible);
            setConHuella(posible && Boolean(huellaActivadaAqui()));
        });
    }, []);

    const irAlInicio = (user: LoginUser) => navigate(defaultPathForRole(user.rol.toLowerCase() as AppRole));

    const sesionIniciada = (data: LoginResponse, porHuella: boolean) => {
        // La sesión vive en una cookie HttpOnly; JavaScript conserva solo
        // los datos no sensibles necesarios para presentar la interfaz.
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(data.user));
        notifySessionChanged();
        toast.success(`¡Bienvenido de nuevo, ${data.user.usuario}!`, { icon: '👋' });
        if (!porHuella && puedeHuella && !huellaActivadaAqui() && !localStorage.getItem(NO_PREGUNTAR_HUELLA)) {
            setOfrecer(data.user);
            return;
        }
        irAlInicio(data.user);
    };

    const entrarHuella = async () => {
        setIsLoading(true);
        try {
            sesionIniciada(await entrarConHuella() as LoginResponse, true);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                toast('Se canceló la huella. También puedes entrar con tu contraseña.');
            } else if (axios.isAxiosError(error) && error.response?.status === 401) {
                localStorage.removeItem('huella-celular');
                setConHuella(false);
                toast.error(apiErrorMessage(error, 'Esa huella ya no está registrada; entra con tu contraseña.'));
            } else {
                toast.error(apiErrorMessage(error, 'No se pudo entrar con la huella. Entra con tu contraseña.'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const responderOferta = async (activar: boolean) => {
        if (!ofrecer) return;
        if (activar) {
            setActivando(true);
            try {
                await activarHuella(ofrecer.usuario, nombreDeEsteCelular());
                toast.success('Listo: la próxima vez entra con tu huella');
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
                    toast.error(apiErrorMessage(error, 'No se pudo activar la huella'));
                }
            } finally {
                setActivando(false);
            }
        } else {
            localStorage.setItem(NO_PREGUNTAR_HUELLA, '1');
        }
        irAlInicio(ofrecer);
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await client.post<LoginResponse>('/auth/login', formData);
            sesionIniciada(response.data, false);

        } catch (error) {
            console.error(error);
            // Sin respuesta del servidor no es la contraseña: es la conexión.
            const sinRespuesta = axios.isAxiosError(error) && !error.response;
            if (sinRespuesta || !navigator.onLine) {
                toast.error("Sin internet: para iniciar sesión necesitas conexión. Tu contraseña no es el problema.");
            } else if (axios.isAxiosError(error) && error.response?.status === 429) {
                toast.error("Demasiados intentos. Espera unos minutos y vuelve a intentar.");
            } else if (axios.isAxiosError(error) && error.response?.status === 401) {
                toast.error("Usuario o contraseña incorrectos");
            } else {
                toast.error(apiErrorMessage(error, "No se pudo iniciar sesión. Intenta de nuevo."));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (rolInicial) return <Navigate to={defaultPathForRole(rolInicial)} replace />;

    if (ofrecer) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6 font-sans dark:bg-slate-950">
                <div className="w-full max-w-sm text-center">
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <FingerPrintIcon className="h-11 w-11" />
                    </span>
                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">¿Entrar con tu huella la próxima vez?</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        En este celular podrás entrar con tu huella o tu cara, sin escribir la contraseña. Tu huella no sale del teléfono.
                    </p>
                    <button type="button" disabled={activando} onClick={() => void responderOferta(true)} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-70">
                        <FingerPrintIcon className="h-5 w-5" />{activando ? 'Activando…' : 'Activar huella'}
                    </button>
                    <button type="button" disabled={activando} onClick={() => void responderOferta(false)} className="mt-3 h-12 w-full rounded-xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        Ahora no
                    </button>
                </div>
            </div>
        );
    }

    const logo = (tamano: string) => (
        <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${tamano}`} style={{ background: `linear-gradient(135deg, ${brand.color_primario}, ${brand.color_secundario})` }}>
            {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-1/2 w-1/2 text-white" />}
        </span>
    );

    return (
        <div className="flex min-h-[100dvh] bg-white font-sans dark:bg-slate-950">
            {/* LADO DE LA MARCA (computadora) */}
            <aside className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-[#0b1020] p-12 text-white lg:flex">
                <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: `radial-gradient(60% 50% at 20% 10%, ${brand.color_primario}55, transparent 70%), radial-gradient(50% 40% at 90% 90%, ${brand.color_secundario}44, transparent 70%)` }} />
                {/* Hilos de fibra: solo decoración */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <path key={n} d={`M -20 ${120 + n * 90} C 180 ${60 + n * 95}, 380 ${260 + n * 70}, 640 ${160 + n * 85}`} fill="none" stroke="white" strokeWidth="1.2" />
                    ))}
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <circle key={`p${n}`} cx={90 + n * 75} cy={170 + ((n * 137) % 420)} r="3" fill="white" />
                    ))}
                </svg>
                <div className="relative flex items-center gap-3">
                    {logo('h-11 w-11')}
                    <span className="text-lg font-bold">{brand.empresa_nombre}</span>
                </div>
                <div className="relative max-w-md">
                    <h1 className="text-4xl font-bold leading-tight tracking-tight">Tu red, tus clientes y tu cobranza en un solo lugar.</h1>
                    <ul className="mt-8 space-y-3 text-sm text-slate-300">
                        <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Clientes en línea y señal de cada ONU</li>
                        <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Órdenes y técnicos en campo</li>
                        <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Cobros, cortes y avisos por WhatsApp</li>
                    </ul>
                </div>
                <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} {brand.empresa_nombre}</p>
            </aside>

            {/* FORMULARIO */}
            <main className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
                <div className="mx-auto w-full max-w-sm">
                    <div className="mb-8 lg:hidden">{logo('h-14 w-14')}</div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Portal de Administración</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Inicia sesión en {brand.empresa_nombre}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Administración, técnicos y cobradores entran aquí.</p>

                    {conHuella && (
                        <>
                            <button type="button" onClick={() => void entrarHuella()} disabled={isLoading} className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-blue-600 text-base font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-70 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10">
                                <FingerPrintIcon className="h-7 w-7" /> Entrar con huella
                            </button>
                            <p className="mt-6 text-center text-xs font-medium text-slate-400">o con tu contraseña</p>
                        </>
                    )}
                    <form className={`${conHuella ? 'mt-4' : 'mt-8'} space-y-4`} onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="login-usuario" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Usuario</label>
                            <div className="relative">
                                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="login-usuario"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    className="block h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="login-clave" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                            <div className="relative">
                                <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="login-clave"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    className="block h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-blue-600" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isLoading ? <><ArrowPathIcon className="h-5 w-5 animate-spin" />Entrando...</> : 'Iniciar Sesión'}
                        </button>
                    </form>
                    <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">© {new Date().getFullYear()} {brand.empresa_nombre}</p>
                </div>
            </main>
        </div>
    );
}
