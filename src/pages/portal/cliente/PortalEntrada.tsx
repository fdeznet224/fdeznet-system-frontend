import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, MoonIcon, SignalIcon, SunIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import CambiarClavePortal from './CambiarClavePortal';
import InstalarApp from './InstalarApp';
import { BOTON, CAMPO, ERROR, ETIQUETA, FONDO, TARJETA, cambiarTema } from './ui';

/**
 * Entrada al portal con el contrato. La primera vez la contraseña es el mismo
 * contrato y aquí mismo se le pide poner una suya.
 */
export default function PortalEntrada() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const [contrato, setContrato] = useState('');
    const [clave, setClave] = useState('');
    const [verClave, setVerClave] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debeCambiar, setDebeCambiar] = useState(false);

    useEffect(() => {
        document.title = `${brand.empresa_nombre} · Mi internet`;
    }, [brand.empresa_nombre]);

    // Con la app instalada abre aquí: si la sesión sigue viva, directo a su cuenta.
    useEffect(() => {
        portalClient.get<{ debe_cambiar: boolean }>('/portal/sesion')
            .then(({ data }) => { if (data?.debe_cambiar === false) navigate('/cliente/inicio', { replace: true }); })
            .catch(() => undefined);
    }, [navigate]);

    const entrar = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        setError(null);
        try {
            const { data } = await portalClient.post<{ debe_cambiar: boolean }>('/portal/entrar', { contrato: contrato.trim(), clave });
            if (data.debe_cambiar) setDebeCambiar(true);
            else navigate('/cliente/inicio', { replace: true });
        } catch (err) {
            setError(apiErrorMessage(err, 'No se pudo entrar'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className={`${FONDO} flex flex-col`}>
            <div className="flex justify-end p-4">
                <button type="button" onClick={cambiarTema} aria-label="Cambiar tema" className="rounded-full p-2.5 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">
                    <SunIcon className="hidden h-5 w-5 dark:block" />
                    <MoonIcon className="h-5 w-5 dark:hidden" />
                </button>
            </div>
            <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 pb-16">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl" style={{ background: brand.color_primario }}>
                        {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-7 w-7 text-white" />}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{debeCambiar ? 'Crea tu contraseña' : 'Entra a tu cuenta'}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{brand.empresa_nombre}</p>
                    </div>
                </div>

                {debeCambiar ? (
                    <div className={`${TARJETA} space-y-4`}>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Tu contrato aparece en el nombre de tu WiFi y cualquiera podría verlo. Elige una contraseña que solo tú sepas.
                        </p>
                        <CambiarClavePortal actual={clave} color={brand.color_primario} onListo={() => navigate('/cliente/inicio', { replace: true })} />
                    </div>
                ) : (
                    <form onSubmit={entrar} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="contrato" className={ETIQUETA}>Número de contrato</label>
                            <input
                                id="contrato" value={contrato} onChange={(e) => setContrato(e.target.value.toUpperCase())}
                                autoComplete="username" autoCapitalize="characters" maxLength={10} placeholder="Ej. A7F2"
                                className={`${CAMPO} font-semibold uppercase tracking-[0.2em] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="clave" className={ETIQUETA}>Contraseña</label>
                            <div className="relative">
                                <input
                                    id="clave" type={verClave ? 'text' : 'password'} value={clave} onChange={(e) => setClave(e.target.value)}
                                    autoComplete="current-password" className={`${CAMPO} pr-12`}
                                />
                                <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400">
                                    {verClave ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">¿Primera vez? Usa tu número de contrato.</p>
                        </div>
                        {error && <p className={ERROR}>{error}</p>}
                        <button type="submit" disabled={enviando || !contrato.trim() || !clave} className={BOTON} style={{ background: brand.color_primario }}>
                            {enviando ? 'Entrando…' : 'Entrar'}
                        </button>
                        <p className="pt-2 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Tu contrato viene en tus recibos y en el nombre de tu WiFi.
                            {brand.empresa_telefono && <><br />¿Olvidaste tu contraseña? Escríbenos al {brand.empresa_telefono}.</>}
                        </p>
                    </form>
                )}
                {!debeCambiar && <InstalarApp color={brand.color_primario} />}
            </main>
        </div>
    );
}
