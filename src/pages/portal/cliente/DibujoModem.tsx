import { useId } from 'react';

type Variante = 'zte' | 'huawei-blanca' | 'huawei-negra' | 'huawei-x6' | 'generico';

/** Qué módem dibujar según las fotos de los equipos que se instalan:
 * ZTE F670L negra, plana y sin antenas; Huawei HG8145V5 blanca y HG8145V3 negra, las dos con
 * dos antenas de lámina y rejilla arriba; Huawei EG8145X6-10 blanca, lisa, con ranuras al costado. */
function varianteModem(marca: 'huawei' | 'zte' | null | undefined, modelo: string | null | undefined): Variante {
    if (marca === 'zte') return 'zte';
    if (marca === 'huawei') {
        if (/x6/i.test(modelo ?? '')) return 'huawei-x6';
        return /v3\b/i.test(modelo ?? '') ? 'huawei-negra' : 'huawei-blanca';
    }
    return 'generico';
}

const TONOS = {
    blanca: { cara: ['#ffffff', '#e4e9f0'], grueso: '#b9c3cf', bordeGrueso: '#a3aebb', hoyo: '#9aa6b5', borde: '#c3ccd7', antena: ['#ffffff', '#d3dae3'], reflejo: 0.95 },
    negra: { cara: ['#3b424d', '#1c2027'], grueso: '#0f1216', bordeGrueso: '#2a3039', hoyo: '#080a0c', borde: '#4b5563', antena: ['#424a56', '#15181d'], reflejo: 0.16 },
};

// La cara de arriba casi de frente, inclinada hacia el cliente como en la foto del diseño.
// Plano: u (0‥100) a lo ancho, v (0‥60) de enfrente (abajo) hacia atrás (arriba).
const ESQUINA = { x: 46, y: 148 };
const ANCHO = { x: 1.26, y: -0.15 };
const FONDO = { x: -0.24, y: -1.05 };
const PLANO = `matrix(${ANCHO.x} ${ANCHO.y} ${FONDO.x} ${FONDO.y} ${ESQUINA.x} ${ESQUINA.y})`;
const punto = (u: number, v: number) => ({ x: ESQUINA.x + u * ANCHO.x + v * FONDO.x, y: ESQUINA.y + u * ANCHO.y + v * FONDO.y });
// Hacia dónde se ve el grueso del equipo (abajo y a la izquierda).
const GRUESO = { x: -1.1, y: 1.6 };
const CAPAS = 7;

/** Dibujo del módem del cliente, adaptado de cómo es su equipo: de frente, con su etiqueta y
 * sus luces (verdes si contesta, ámbar si no) y un brillo suave del color de la marca. */
export default function DibujoModem({ marca, modelo, enLinea, color, className = '' }: {
    marca?: 'huawei' | 'zte' | null; modelo?: string | null; enLinea: boolean; color: string; className?: string;
}) {
    const id = useId().replace(/:/g, '');
    const variante = varianteModem(marca, modelo);
    const huawei = variante.startsWith('huawei');
    const t = TONOS[variante === 'huawei-negra' || variante === 'zte' ? 'negra' : 'blanca'];
    const luz = enLinea ? '#22c55e' : '#f59e0b';
    const nombre = variante === 'zte' ? 'Módem ZTE' : huawei ? 'Módem Huawei' : 'Módem';
    const g = (n: string) => `${n}-${id}`;
    const antenas = [
        { base: punto(5, 57), giro: -9, largo: 66 },
        { base: punto(95, 57), giro: 9, largo: 62 },
    ];
    return (
        <svg viewBox="0 0 200 180" className={className} role="img" aria-label={nombre}>
            <defs>
                <radialGradient id={g('brillo')} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.38" />
                    <stop offset="55%" stopColor={color} stopOpacity="0.12" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={g('sombra')} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={g('cara')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={t.cara[0]} />
                    <stop offset="100%" stopColor={t.cara[1]} />
                </linearGradient>
                <linearGradient id={g('reflejo')} x1="0" y1="1" x2="0.7" y2="0">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={t.reflejo * 0.55} />
                </linearGradient>
                <linearGradient id={g('antena')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={t.antena[0]} />
                    <stop offset="100%" stopColor={t.antena[1]} />
                </linearGradient>
                <pattern id={g('rejilla')} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
                    <circle cx="1.3" cy="1.3" r="0.62" fill={t.hoyo} />
                </pattern>
            </defs>

            <ellipse cx="100" cy="100" rx="98" ry="80" fill={`url(#${g('brillo')})`} />
            <ellipse cx="102" cy="164" rx="78" ry="11" fill={`url(#${g('sombra')})`} />

            {huawei && antenas.map((a, i) => (
                // Antenas de lámina en las esquinas de atrás, casi paradas, con su bisagra.
                <g key={i} transform={`translate(${a.base.x} ${a.base.y}) rotate(${a.giro})`} stroke={t.borde} strokeWidth="0.7">
                    <rect x="-5.5" y={-a.largo} width="11" height={a.largo} rx="3" fill={`url(#${g('antena')})`} />
                    <rect x="-1.3" y={-a.largo + 4} width="2.6" height={a.largo - 14} rx="1.3" fill="#ffffff" opacity={t.reflejo * 0.5} stroke="none" />
                    <rect x="-4.5" y="-7" width="9" height="10" rx="2.5" fill={t.grueso} />
                </g>
            ))}

            {/* El grueso: la misma cara repetida hacia abajo y a la izquierda. */}
            {Array.from({ length: CAPAS }, (_, i) => CAPAS - i).map((k) => (
                <g key={k} transform={`translate(${GRUESO.x * k} ${GRUESO.y * k})`}>
                    <rect transform={PLANO} x="0" y="0" width="100" height="60" rx="7"
                        fill={t.grueso} stroke={k === CAPAS ? t.bordeGrueso : 'none'} strokeWidth="0.6" />
                </g>
            ))}

            {variante === 'huawei-x6' && Array.from({ length: 12 }, (_, i) => {
                // Ranuras del costado, como la X6-10.
                const a = punto(0, 14 + i * 3);
                return <path key={i} d={`M${a.x + GRUESO.x * 1.6} ${a.y + GRUESO.y * 1.6} l${GRUESO.x * 4.2} ${GRUESO.y * 4.2}`} stroke="#7d8999" strokeWidth="1" strokeLinecap="round" />;
            })}

            <g transform={PLANO}>
                <rect x="0" y="0" width="100" height="60" rx="7" fill={`url(#${g('cara')})`} stroke={t.borde} strokeWidth="0.5" />
                {huawei && variante !== 'huawei-x6' && <rect x="7" y="12" width="86" height="42" rx="3" fill={`url(#${g('rejilla')})`} />}
                {variante === 'zte' && <path d="M3 10.5 H97" stroke="#07080a" strokeWidth="0.9" />}
                <rect x="0" y="0" width="100" height="60" rx="7" fill={`url(#${g('reflejo')})`} />

                {/* La etiqueta del ISP, como la que traen los equipos instalados (sin texto). */}
                <g transform="translate(36 15)">
                    <rect width="50" height="30" rx="1.6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.35" />
                    <rect y="21" width="50" height="9" rx="1.6" fill="#facc15" />
                    <rect y="21" width="50" height="3" fill="#facc15" />
                    <circle cx="5" cy="25.5" r="2.4" fill="#e11d48" />
                    <rect x="9.5" y="24.6" width="34" height="1.8" rx="0.9" fill="#1e293b" opacity="0.7" />
                    <rect x="4" y="12" width="17" height="5" rx="1" fill={color} />
                    <rect x="4" y="8" width="13" height="1.8" rx="0.9" fill="#94a3b8" />
                    <rect x="4" y="4" width="10" height="1.8" rx="0.9" fill="#e11d48" opacity="0.75" />
                    {/* El plano va de abajo hacia arriba: el ícono se voltea para verse derecho. */}
                    <g transform="translate(33.5 11) scale(1 -1)" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
                        <path d="M-5.5 -1.5 A6.5 6.5 0 0 1 5.5 -1.5" />
                        <path d="M-3 1 A3.6 3.6 0 0 1 3 1" />
                        <circle cx="0" cy="3.2" r="0.9" fill={color} stroke="none" />
                    </g>
                    <rect x="31" y="4" width="5" height="4" rx="0.8" fill={color} />
                    <rect x="39" y="12" width="8" height="0.6" fill="#94a3b8" />
                    <rect x="39" y="5" width="8" height="0.6" fill="#94a3b8" />
                </g>

                {/* Luces al frente: Power, PON, LOS, Internet, LAN… */}
                {Array.from({ length: 10 }, (_, i) => (
                    <g key={i}>
                        <circle cx={12 + i * 8.4} cy="5.4" r="1.25" fill={i === 2 ? '#475569' : i >= 7 ? '#64748b' : luz} />
                        {enLinea && i < 7 && i !== 2 && (
                            <circle cx={12 + i * 8.4} cy="5.4" r="2.6" fill={luz} opacity="0.25">
                                {i === 3 && <animate attributeName="opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite" />}
                            </circle>
                        )}
                    </g>
                ))}
            </g>
        </svg>
    );
}
