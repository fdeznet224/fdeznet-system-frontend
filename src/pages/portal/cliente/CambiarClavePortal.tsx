import { useState } from 'react';
import { toast } from 'react-hot-toast';

import portalClient from '@/api/portal';
import { BOTON_PRIMARIO, CAMPO, ETIQUETA_CAMPO } from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';

/** Cambiar la contraseña del portal. En la primera entrada la actual ya se sabe (es el contrato). */
export default function CambiarClavePortal({ actual: actualConocida, onListo }: { actual?: string; onListo: () => void }) {
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [repetida, setRepetida] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nueva !== repetida) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setEnviando(true);
        setError(null);
        try {
            await portalClient.post('/portal/clave', { actual: actualConocida ?? actual, nueva });
            toast.success('Contraseña guardada');
            onListo();
        } catch (err) {
            setError(apiErrorMessage(err, 'No se pudo guardar'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <form onSubmit={guardar} className="space-y-3">
            {actualConocida === undefined && (
                <div>
                    <label htmlFor="clave-actual" className={ETIQUETA_CAMPO}>Contraseña actual</label>
                    <input id="clave-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={CAMPO} />
                </div>
            )}
            <div>
                <label htmlFor="clave-nueva" className={ETIQUETA_CAMPO}>Contraseña nueva (mínimo 8)</label>
                <input id="clave-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={8} maxLength={64} className={CAMPO} />
            </div>
            <div>
                <label htmlFor="clave-repetida" className={ETIQUETA_CAMPO}>Repite la contraseña</label>
                <input id="clave-repetida" type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" className={CAMPO} />
            </div>
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
            <button type="submit" disabled={enviando || nueva.length < 8 || !repetida} className={BOTON_PRIMARIO}>
                {enviando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
        </form>
    );
}
