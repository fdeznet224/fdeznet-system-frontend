import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { IScannerProps } from '@yudiel/react-qr-scanner';

interface Props {
    titulo: string;
    onLeido: (codigo: string) => void;
    onCerrar: () => void;
    onError?: () => void;
    formats?: IScannerProps['formats'];
}

// Lentes que no enfocan de cerca: en los Samsung "la cámara trasera" que da
// el navegador suele ser el gran angular y el código se ve lejano y borroso.
const LENTE_NO_PRINCIPAL = /ultra|wide|angular|tele|macro|depth|profundidad/i;
const TRASERA = /back|rear|trasera|environment/i;

/** Número de "camera2 N" en Android; la principal suele ser la más baja. */
function indiceCamara(etiqueta: string) {
    const encontrado = etiqueta.match(/camera\d?\s*(\d+)/i);
    return encontrado ? Number(encontrado[1]) : 99;
}

function camarasTraseras(dispositivos: MediaDeviceInfo[]) {
    const video = dispositivos.filter((d) => d.kind === 'videoinput' && d.deviceId);
    const traseras = video.filter((d) => TRASERA.test(d.label));
    const lista = traseras.length > 0 ? traseras : video;
    return [...lista].sort((a, b) => {
        const secundariaA = LENTE_NO_PRINCIPAL.test(a.label) ? 1 : 0;
        const secundariaB = LENTE_NO_PRINCIPAL.test(b.label) ? 1 : 0;
        return secundariaA - secundariaB || indiceCamara(a.label) - indiceCamara(b.label);
    });
}

/**
 * Cámaras del celular. Sin permiso previo los nombres llegan vacíos y no se
 * distingue el gran angular: se vuelve a preguntar cuando el escáner ya abrió
 * la cámara.
 */
function useCamaras() {
    const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
    useEffect(() => {
        let vigente = true;
        let intentos = 0;
        let espera: ReturnType<typeof setTimeout> | undefined;
        const consultar = async () => {
            const lista = await navigator.mediaDevices?.enumerateDevices?.().catch(() => []) ?? [];
            if (!vigente) return;
            const video = lista.filter((d) => d.kind === 'videoinput');
            const conNombre = video.length > 0 && video.every((d) => d.label);
            if (conNombre || intentos >= 8) setDispositivos(conNombre ? video : []);
            else {
                intentos += 1;
                espera = setTimeout(() => void consultar(), 700);
            }
        };
        void consultar();
        return () => { vigente = false; clearTimeout(espera); };
    }, []);
    return dispositivos;
}

const FORMATOS: IScannerProps['formats'] = ['code_128', 'code_39', 'qr_code', 'data_matrix'];

interface CamaraProps {
    onLeido: (codigo: string) => void;
    onError?: () => void;
    formats?: IScannerProps['formats'];
    className?: string;
}

/**
 * Cámara para códigos de barras de ONU (Code 128) y QR. Usa la cámara
 * principal en alta resolución con enfoque continuo y algo de zoom, para que
 * el código se lea sin pegar el celular a la etiqueta.
 */
export function CamaraCodigo({ onLeido, onError, formats = FORMATOS, className = '' }: CamaraProps) {
    const dispositivos = useCamaras();
    const camaras = useMemo(() => camarasTraseras(dispositivos), [dispositivos]);
    const [elegida, setElegida] = useState(0);
    const camara = camaras.length > 0 ? camaras[elegida % camaras.length] : null;

    const constraints = useMemo<MediaTrackConstraints>(() => ({
        ...(camara ? { deviceId: { exact: camara.deviceId } } : { facingMode: 'environment' }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // "advanced" es de mejor esfuerzo: si el celular no lo soporta, se ignora.
        advanced: [
            { focusMode: 'continuous' } as MediaTrackConstraintSet,
            { zoom: 2 } as MediaTrackConstraintSet,
        ],
    }), [camara]);

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            {/* Rectangular: un Code 128 es largo y no cabe bien en un cuadro. */}
            <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black">
                <Scanner
                    key={camara?.deviceId || 'predeterminada'}
                    constraints={constraints}
                    formats={formats}
                    scanDelay={300}
                    components={{ zoom: true, torch: true, finder: true }}
                    onScan={(res) => { const codigo = res?.[0]?.rawValue; if (codigo) onLeido(codigo); }}
                    onError={() => onError?.()}
                />
            </div>
            {camaras.length > 1 && (
                <button
                    type="button"
                    onClick={() => setElegida((i) => (i + 1) % camaras.length)}
                    className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                >
                    <ArrowPathIcon className="h-4 w-4" /> Cambiar cámara ({(elegida % camaras.length) + 1}/{camaras.length})
                </button>
            )}
        </div>
    );
}

/** Escáner a pantalla completa. */
export default function EscanerCodigo({ titulo, onLeido, onCerrar, onError, formats }: Props) {
    return (
        <div role="dialog" aria-label={titulo} className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-center justify-between gap-3 p-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
                <p className="text-sm font-black">{titulo}</p>
                <button type="button" aria-label="Cerrar escáner" onClick={onCerrar} className="rounded-full bg-white/10 p-2">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
                <CamaraCodigo onLeido={onLeido} onError={onError} formats={formats} className="w-full max-w-lg" />
                <p className="max-w-sm text-center text-xs font-semibold text-white/70">
                    Aleja el celular unos 15 cm y centra el código. Si sigue borroso, sube el zoom o cambia de cámara.
                </p>
            </div>
        </div>
    );
}
