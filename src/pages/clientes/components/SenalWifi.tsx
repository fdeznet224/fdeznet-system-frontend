import type { CalidadSenal } from './miRed';

const BARRAS: Record<CalidadSenal, number> = { buena: 4, regular: 3, 'débil': 2, 'muy débil': 1 };
const COLOR: Record<CalidadSenal, string> = {
    buena: 'text-emerald-600 dark:text-emerald-400',
    regular: 'text-amber-600 dark:text-amber-400',
    'débil': 'text-orange-600 dark:text-orange-400',
    'muy débil': 'text-rose-600 dark:text-rose-400',
};

/** Barritas de señal WiFi de un equipo, con la calidad en palabras (y los dBm si se piden). */
export default function SenalWifi({ calidad, dbm, conDbm = false }: { calidad: CalidadSenal; dbm?: number | null; conDbm?: boolean }) {
    const llenas = BARRAS[calidad];
    return (
        <span className={`inline-flex items-center gap-1 ${COLOR[calidad]}`} title={dbm != null ? `${dbm} dBm` : undefined}>
            <span className="inline-flex items-end gap-px" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={`w-[3px] rounded-sm ${n <= llenas ? 'bg-current' : 'bg-current opacity-20'}`} style={{ height: `${n * 3}px` }} />
                ))}
            </span>
            <span>Señal {calidad}{conDbm && dbm != null ? ` (${dbm} dBm)` : ''}</span>
        </span>
    );
}
