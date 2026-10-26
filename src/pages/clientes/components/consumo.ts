import { compartirImagen } from '@/components/cobro/imagenCobro';

export interface DiaConsumo {
    fecha: string;
    bajada: number;
    subida: number;
    minutos: number;
}

export interface ConsumoMes {
    mes: string;
    dias: DiaConsumo[];
    total_bajada: number;
    total_subida: number;
    dias_con_uso: number;
    /** Primer día que el sistema registró consumo de este cliente. */
    registro_desde: string | null;
}

export type EstadoDia = 'uso' | 'sin_uso' | 'sin_registro' | 'futuro';

export { compartirImagen };

export function datos(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toLocaleString('es-MX', { maximumFractionDigits: 1 })} GB`;
    if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
    if (bytes > 0) return '<1 MB';
    return '0';
}

export function horas(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    return `${Math.round(minutos / 60)} h`;
}

export function hoyIso(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

export function estadoDia(dia: DiaConsumo, registroDesde: string | null, hoy = hoyIso()): EstadoDia {
    if (dia.fecha > hoy) return 'futuro';
    if (dia.bajada + dia.subida > 0) return 'uso';
    if (!registroDesde || dia.fecha < registroDesde) return 'sin_registro';
    return 'sin_uso';
}

export function nombreMes(mes: string): string {
    const [anio, numero] = mes.split('-').map(Number);
    const texto = new Date(anio, numero - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function moverMes(mes: string, pasos: number): string {
    const [anio, numero] = mes.split('-').map(Number);
    const fecha = new Date(anio, numero - 1 + pasos, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

/** Días transcurridos del mes (hasta hoy) que el sistema sí registró. */
export function diasRegistrados(consumo: ConsumoMes, hoy = hoyIso()): number {
    return consumo.dias.filter((dia) => {
        const estado = estadoDia(dia, consumo.registro_desde, hoy);
        return estado === 'uso' || estado === 'sin_uso';
    }).length;
}

const ANCHO = 1080;
const MARGEN = 64;
const CELDA = (ANCHO - MARGEN * 2) / 7;
const ALTO_CELDA = 120;
const FUENTE = '"Plus Jakarta Sans", system-ui, sans-serif';
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const COLORES: Record<EstadoDia, [string, string]> = {
    uso: ['#d1fae5', '#065f46'],
    sin_uso: ['#ffe4e6', '#9f1239'],
    sin_registro: ['#f8fafc', '#94a3b8'],
    futuro: ['#ffffff', '#cbd5e1'],
};

function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

/** Imagen para el cliente: el calendario del mes con lo que usó cada día. */
export async function imagenConsumo({ consumo, cliente, empresa, color, telefono }: {
    consumo: ConsumoMes;
    cliente: string;
    empresa: string;
    color: string;
    telefono?: string | null;
}): Promise<Blob> {
    await document.fonts?.ready.catch(() => undefined);
    const [anio, numero] = consumo.mes.split('-').map(Number);
    const huecos = (new Date(anio, numero - 1, 1).getDay() + 6) % 7;
    const semanas = Math.ceil((huecos + consumo.dias.length) / 7);

    const canvas = document.createElement('canvas');
    canvas.width = ANCHO;
    canvas.height = 250 + 50 + 200 + 120 + 44 + semanas * ALTO_CELDA + 260;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ANCHO, 250);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 34px ${FUENTE}`;
    ctx.fillText(empresa.toUpperCase(), MARGEN, 84);
    ctx.font = `800 58px ${FUENTE}`;
    ctx.fillText(`Uso de internet · ${nombreMes(consumo.mes)}`, MARGEN, 160, ANCHO - MARGEN * 2);
    ctx.font = `600 32px ${FUENTE}`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(cliente, MARGEN, 212, ANCHO - MARGEN * 2);
    ctx.globalAlpha = 1;

    let y = 300;
    const mitad = (ANCHO - MARGEN * 2 - 24) / 2;
    const cifra = (x: number, etiqueta: string, valor: string, detalle: string) => {
        caja(ctx, x, y, mitad, 176, 28, '#f1f5f9');
        ctx.fillStyle = '#475569';
        ctx.font = `800 24px ${FUENTE}`;
        ctx.fillText(etiqueta.toUpperCase(), x + 28, y + 46);
        ctx.fillStyle = '#0f172a';
        ctx.font = `800 54px ${FUENTE}`;
        ctx.fillText(valor, x + 28, y + 110);
        ctx.fillStyle = '#64748b';
        ctx.font = `600 24px ${FUENTE}`;
        ctx.fillText(detalle, x + 28, y + 152);
    };
    cifra(MARGEN, 'Días con uso', `${consumo.dias_con_uso} de ${diasRegistrados(consumo)}`, 'días registrados del mes');
    cifra(MARGEN + mitad + 24, 'Datos usados', datos(consumo.total_bajada + consumo.total_subida),
        `${datos(consumo.total_bajada)} de bajada`);
    y += 176 + 50;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 24px ${FUENTE}`;
    DIAS_SEMANA.forEach((d, n) => ctx.fillText(d, MARGEN + CELDA * n + CELDA / 2, y + 28));
    y += 44;
    consumo.dias.forEach((dia, n) => {
        const pos = huecos + n;
        const x = MARGEN + CELDA * (pos % 7);
        const fila = y + ALTO_CELDA * Math.floor(pos / 7);
        const estado = estadoDia(dia, consumo.registro_desde);
        const [fondo, texto] = COLORES[estado];
        caja(ctx, x + 4, fila + 4, CELDA - 8, ALTO_CELDA - 8, 16, fondo);
        ctx.fillStyle = texto;
        ctx.font = `800 32px ${FUENTE}`;
        ctx.fillText(String(n + 1), x + CELDA / 2, fila + 52);
        if (estado === 'uso' || estado === 'sin_uso') {
            ctx.font = `700 21px ${FUENTE}`;
            ctx.fillText(estado === 'uso' ? datos(dia.bajada + dia.subida) : 'Sin uso', x + CELDA / 2, fila + 90);
        }
    });
    y += semanas * ALTO_CELDA + 30;
    ctx.textAlign = 'left';

    const leyenda: [EstadoDia, string][] = [['uso', 'Usó internet'], ['sin_uso', 'Sin uso'], ['sin_registro', 'Sin registro']];
    ctx.font = `600 26px ${FUENTE}`;
    let x = MARGEN;
    for (const [estado, texto] of leyenda) {
        caja(ctx, x, y, 36, 36, 8, COLORES[estado][0]);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, 36, 36, 8);
        ctx.stroke();
        ctx.fillStyle = '#334155';
        ctx.fillText(texto, x + 48, y + 28);
        x += 48 + ctx.measureText(texto).width + 40;
    }
    y += 90;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(MARGEN, y, ANCHO - MARGEN * 2, 2);
    ctx.fillStyle = '#64748b';
    ctx.font = `600 26px ${FUENTE}`;
    ctx.fillText([empresa, telefono, 'Datos tomados del equipo de red'].filter(Boolean).join(' · '), MARGEN, y + 48, ANCHO - MARGEN * 2);

    const recortada = document.createElement('canvas');
    recortada.width = ANCHO;
    recortada.height = Math.min(canvas.height, y + 90);
    recortada.getContext('2d')!.drawImage(canvas, 0, 0);
    return new Promise((resolve, reject) => {
        recortada.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
    });
}
