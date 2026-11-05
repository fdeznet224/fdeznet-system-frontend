import { useState } from 'react';
import { toast } from 'react-hot-toast';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import CampoClave from './CampoClave';
import { BOTON, ERROR, ETIQUETA } from './ui';

/** Cambiar la contraseña del portal. En la primera entrada la actual ya se sabe (es el contrato). */
export default function CambiarClavePortal({ actual: actualConocida, color, onListo }: { actual?: string; color: string; onListo: () => void }) {
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
        <form onSubmit={guardar} className="space-y-4">
            {actualConocida === undefined && (
                <div className="space-y-1.5">
                    <label htmlFor="clave-actual" className={ETIQUETA}>Contraseña actual</label>
                    <CampoClave id="clave-actual" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
                </div>
            )}
            <div className="space-y-1.5">
                <label htmlFor="clave-nueva" className={ETIQUETA}>Contraseña nueva (mínimo 8)</label>
                <CampoClave id="clave-nueva" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={8} maxLength={64} />
            </div>
            <div className="space-y-1.5">
                <label htmlFor="clave-repetida" className={ETIQUETA}>Repite la contraseña</label>
                <CampoClave id="clave-repetida" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <p className={ERROR}>{error}</p>}
            <button type="submit" disabled={enviando || nueva.length < 8 || !repetida} className={BOTON} style={{ background: color }}>
                {enviando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
        </form>
    );
}
