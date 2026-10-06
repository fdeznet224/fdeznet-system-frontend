import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { IScannerProps } from '@yudiel/react-qr-scanner';

interface Props {
    titulo: string;
    onLeido: (codigo: string) => void;
    onCerrar: () => void;
    onError?: (mensaje: string) => void;
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
 * Cámaras del celular, consultadas ANTES de abrir el escáner: abrir una cámara
 * y cambiar a otra enseguida falla en Android porque la primera sigue ocupada.
 * Sin permiso previo los nombres llegan vacíos; se pide permiso con una toma
 * corta, se suelta y se vuelve a consultar.
 */
function useCamaras() {
    const [estado, setEstado] = useState<{ listo: boolean; dispositivos: MediaDeviceInfo[] }>({
        listo: false,
        dispositivos: [],
    });
    useEffect(() => {
        let vigente = true;
        const videos = async () => (
            (await navigator.mediaDevices?.enumerateDevices?.().catch(() => []) ?? [])
                .filter((d) => d.kind === 'videoinput')
        );
        void (async () => {
            let lista = await videos();
            if (lista.length > 0 && !lista.every((d) => d.label)) {
                try {
                    const toma = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    toma.getTracks().forEach((t) => t.stop());
                    // Android tarda un momento en liberar la cámara.
                    await new Promise((r) => setTimeout(r, 400));
                    lista = await videos();
                } catch {
                    // Sin permiso: el escáner lo pedirá y mostrará el error.
                }
            }
            if (vigente) setEstado({ listo: true, dispositivos: lista.every((d) => d.label) ? lista : [] });
        })();
        return () => { vigente = false; };
    }, []);
    return estado;
}

/** "NotReadableError" → texto para el técnico. */
function motivoError(error: unknown) {
    const nombre = error instanceof Error ? error.name : '';
    if (nombre === 'NotAllowedError') return 'Permite el uso de la cámara para esta página';
    if (nombre === 'NotReadableError') return 'La cámara está ocupada por otra app; ciérrala e intenta de nuevo';
    if (nombre === 'NotFoundError') return 'No se encontró una cámara';
    return nombre ? `No se pudo abrir la cámara (${nombre})` : 'No se pudo abrir la cámara';
}

const FORMATOS: IScannerProps['formats'] = ['code_128', 'code_39', 'qr_code', 'data_matrix'];

interface CamaraProps {
    onLeido: (codigo: string) => void;
    onError?: (mensaje: string) => void;
    formats?: IScannerProps['formats'];
    className?: string;
}

/**
 * Cámara para códigos de barras de ONU (Code 128) y QR. Usa la cámara
 * principal en alta resolución con enfoque continuo y algo de zoom, para que
 * el código se lea sin pegar el celular a la etiqueta.
 */
export function CamaraCodigo({ onLeido, onError, formats = FORMATOS, className = '' }: CamaraProps) {
    const { listo, dispositivos } = useCamaras();
    const camaras = useMemo(() => camarasTraseras(dispositivos), [dispositivos]);
    const [elegida, setElegida] = useState(0);
    // 0 = cámara principal con enfoque y zoom; 1 = la misma sin extras;
    // 2 = la trasera que dé el navegador. Se baja de nivel si una falla.
    const [nivel, setNivel] = useState(0);
    const camara = camaras.length > 0 && nivel < 2 ? camaras[elegida % camaras.length] : null;

    const constraints = useMemo<MediaTrackConstraints>(() => ({
        ...(camara ? { deviceId: { exact: camara.deviceId } } : { facingMode: 'environment' }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // "advanced" es de mejor esfuerzo: si el celular no lo soporta, se ignora.
        ...(nivel === 0 ? {
            advanced: [
                { focusMode: 'continuous' } as MediaTrackConstraintSet,
                { zoom: 2 } as MediaTrackConstraintSet,
            ],
        } : {}),
    }), [camara, nivel]);

    const alFallar = (error: unknown) => {
        if (nivel < 2) setNivel((n) => n + 1);
        else onError?.(motivoError(error));
    };

    if (!listo) {
        return (
            <div className={`flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-black text-xs font-bold text-white/70 ${className}`}>
                Abriendo cámara...
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black">
                <Scanner
                    constraints={constraints}
                    formats={formats}
                    scanDelay={300}
                    components={{ zoom: true, torch: true, finder: false }}
                    onScan={(res) => { const codigo = res?.[0]?.rawValue; if (codigo) onLeido(codigo); }}
                    onError={alFallar}
                />
                {/* Guía de lector de código de barras: franja ancha y baja con
                    línea láser, en vez del cuadro de QR. */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative h-[30%] w-[88%] rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                        <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)]" />
                    </div>
                </div>
            </div>
            {camaras.length > 1 && nivel < 2 && (
                <button
                    type="button"
                    onClick={() => { setNivel(0); setElegida((i) => (i + 1) % camaras.length); }}
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
                    Pon el código de barras sobre la línea roja, a unos 15 cm. Si sigue borroso, sube el zoom o cambia de cámara.
                </p>
            </div>
        </div>
    );
}
