import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignalIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { BOTON_PRIMARIO, CAMPO, ETIQUETA_CAMPO, TARJETA } from '@/components/ui/estilo';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import CambiarClavePortal from './CambiarClavePortal';

/**
 * Entrada al portal con el contrato. La primera vez la contraseña es el mismo
 * contrato y aquí mismo se le pide poner una suya.
 */
export default function PortalEntrada() {
    const { brand } = useBrand();
    const navigate = useNavigate();
    const [contrato, setContrato] = useState('');
    const [clave, setClave] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debeCambiar, setDebeCambiar] = useState(false);

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
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
            <div className="w-full max-w-sm space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl" style={{ background: brand.color_primario }}>
                        {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : <SignalIcon className="h-8 w-8 text-white" />}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{brand.empresa_nombre}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Portal del cliente</p>
                    </div>
                </div>

                {debeCambiar ? (
                    <div className={`${TARJETA} space-y-3 p-5`}>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Crea tu contraseña</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tu contrato aparece en el nombre de tu WiFi, así que cualquiera podría verlo. Pon una contraseña que solo tú sepas.
                        </p>
                        <CambiarClavePortal actual={clave} onListo={() => navigate('/cliente/inicio', { replace: true })} />
                    </div>
                ) : (
                    <form onSubmit={entrar} className={`${TARJETA} space-y-4 p-5`}>
                        <div>
                            <label htmlFor="contrato" className={ETIQUETA_CAMPO}>Número de contrato</label>
                            <input
                                id="contrato" value={contrato} onChange={(e) => setContrato(e.target.value.toUpperCase())}
                                autoComplete="username" autoCapitalize="characters" maxLength={10} placeholder="Ej. A7F2" className={`${CAMPO} uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal`}
                            />
                            <p className="mt-1 text-xs text-slate-400">Viene en tus recibos y en el nombre de tu WiFi.</p>
                        </div>
                        <div>
                            <label htmlFor="clave" className={ETIQUETA_CAMPO}>Contraseña</label>
                            <input
                                id="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)}
                                autoComplete="current-password" className={CAMPO}
                            />
                            <p className="mt-1 text-xs text-slate-400">¿Primera vez? Escribe tu número de contrato.</p>
                        </div>
                        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
                        <button type="submit" disabled={enviando || !contrato.trim() || !clave} className={BOTON_PRIMARIO} style={{ background: brand.color_primario }}>
                            {enviando ? 'Entrando...' : 'Entrar'}
                        </button>
                        {brand.empresa_telefono && (
                            <p className="text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Escríbenos al {brand.empresa_telefono}.</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
