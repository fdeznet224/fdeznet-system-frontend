import { iso, mesesCalendario, tipoDia, type FechasCobro, type Tipo } from './fechasCobro';

/** Lo que el técnico le explica al cliente sobre su cobro. */
export interface Cobro extends FechasCobro {
    mensualidad: number;
    prorrateo?: { total: number; desde: string; hasta: string; dias: number } | null;
    primer_pago: { fecha: string; total: number };
    explicacion: string[];
}

export interface DatosImagen {
    cobro: Cobro;
    empresa: string;
    color: string;
    titulo: string;
    subtitulo?: string | null;
    telefono?: string | null;
    pie?: string | null;
}

export const pesos = (monto: number) => monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
export const fechaCorta = (isoFecha: string) =>
    new Date(`${isoFecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

const ANCHO = 1080;
const MARGEN = 64;
const CELDA = (ANCHO - MARGEN * 2) / 7;
const ALTO_CELDA = 92;
const FUENTE = '"Plus Jakarta Sans", system-ui, sans-serif';
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Los mismos colores que el calendario de la pantalla, en tema claro.
const FONDO: Record<Exclude<Tipo, null>, [string, string]> = {
    gratis: ['#d1fae5', '#065f46'],
    prorrateo: ['#fef3c7', '#92400e'],
    mensualidad: ['#e0f2fe', '#075985'],
};
const PAGO = '#4f46e5';
const CORTE = '#e11d48';

function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
    const salida: string[] = [];
    let actual = '';
    for (const palabra of texto.split(' ')) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (ctx.measureText(prueba).width > ancho && actual) {
            salida.push(actual);
            actual = palabra;
        } else {
            actual = prueba;
        }
    }
    if (actual) salida.push(actual);
    return salida;
}

function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

function semanas(anio: number, mes: number) {
    const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;
    return Math.ceil((huecos + new Date(anio, mes + 1, 0).getDate()) / 7);
}

/**
 * Imagen para mandar por WhatsApp: cuánto paga, cuándo, el calendario de los
 * primeros meses y la explicación, con el nombre de la empresa.
 */
export async function imagenCobro(datos: DatosImagen): Promise<Blob> {
    await document.fonts?.ready.catch(() => undefined);
    const { cobro } = datos;
    const [anioInicio, mesInicio] = cobro.activacion.split('-').map(Number);
    const meses = Array.from({ length: mesesCalendario(cobro) }, (_, i) => {
        const fecha = new Date(anioInicio, mesInicio - 1 + i, 1);
        return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `500 30px ${FUENTE}`;
    const textoExplicacion = cobro.explicacion.map((l) => lineas(ctx, l, ANCHO - MARGEN * 2 - 36));

    const altoCalendario = meses.reduce((total, m) => total + 70 + 44 + semanas(m.anio, m.mes) * ALTO_CELDA + 24, 0);
    const altoExplicacion = textoExplicacion.reduce((total, l) => total + l.length * 42 + 18, 0);
    canvas.width = ANCHO;
    // Alto de sobra; al final se recorta a lo dibujado.
    canvas.height = 300 + 330 + altoCalendario + 200 + 90 + altoExplicacion + 200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'alphabetic';

    // Encabezado con el color de la empresa
    ctx.fillStyle = datos.color;
    ctx.fillRect(0, 0, ANCHO, 250);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 34px ${FUENTE}`;
    ctx.fillText(datos.empresa.toUpperCase(), MARGEN, 84);
    ctx.font = `800 60px ${FUENTE}`;
    ctx.fillText(datos.titulo, MARGEN, 160);
    if (datos.subtitulo) {
        ctx.font = `600 32px ${FUENTE}`;
        ctx.globalAlpha = 0.9;
        ctx.fillText(datos.subtitulo, MARGEN, 212);
        ctx.globalAlpha = 1;
    }

    // Montos
    let y = 300;
    const mitad = (ANCHO - MARGEN * 2 - 24) / 2;
    const monto = (x: number, w: number, fondo: string, color: string, etiqueta: string, valor: string, detalle?: string) => {
        caja(ctx, x, y, w, 168, 28, fondo);
        ctx.fillStyle = color;
        ctx.font = `800 24px ${FUENTE}`;
        ctx.fillText(etiqueta.toUpperCase(), x + 28, y + 46);
        ctx.fillStyle = '#0f172a';
        ctx.font = `800 52px ${FUENTE}`;
        ctx.fillText(valor, x + 28, y + 106);
        if (detalle) {
            ctx.fillStyle = '#64748b';
            ctx.font = `600 24px ${FUENTE}`;
            ctx.fillText(detalle, x + 28, y + 148);
        }
    };
    if (cobro.prorrateo) {
        monto(MARGEN, mitad, '#fffbeb', '#b45309', 'Prorrateo', pesos(cobro.prorrateo.total),
            `${fechaCorta(cobro.prorrateo.desde)} – ${fechaCorta(cobro.prorrateo.hasta)}`);
        monto(MARGEN + mitad + 24, mitad, '#f1f5f9', '#475569', 'Mensualidad', pesos(cobro.mensualidad));
    } else {
        monto(MARGEN, ANCHO - MARGEN * 2, '#f1f5f9', '#475569', 'Mensualidad', pesos(cobro.mensualidad));
    }
    y += 192;
    caja(ctx, MARGEN, y, ANCHO - MARGEN * 2, 132, 28, '#ecfdf5');
    ctx.fillStyle = '#047857';
    ctx.font = `800 24px ${FUENTE}`;
    ctx.fillText(`PRIMER PAGO · ${fechaCorta(cobro.primer_pago.fecha).toUpperCase()}`, MARGEN + 28, y + 46);
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 56px ${FUENTE}`;
    ctx.fillText(pesos(cobro.primer_pago.total), MARGEN + 28, y + 108);
    y += 132 + 24;

    // Calendario
    for (const { anio, mes } of meses) {
        const nombre = new Date(anio, mes, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        ctx.fillStyle = '#0f172a';
        ctx.font = `800 36px ${FUENTE}`;
        ctx.textAlign = 'left';
        ctx.fillText(nombre.charAt(0).toUpperCase() + nombre.slice(1), MARGEN, y + 50);
        y += 70;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = `700 24px ${FUENTE}`;
        DIAS_SEMANA.forEach((d, n) => ctx.fillText(d, MARGEN + CELDA * n + CELDA / 2, y + 28));
        y += 44;
        const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;
        const diasMes = new Date(anio, mes + 1, 0).getDate();
        for (let n = 0; n < diasMes; n++) {
            const pos = huecos + n;
            const x = MARGEN + CELDA * (pos % 7);
            const fila = y + ALTO_CELDA * Math.floor(pos / 7);
            const dia = iso(anio, mes, n + 1);
            const tipo = tipoDia(cobro, dia);
            const pago = dia === cobro.primer_pago.fecha;
            const corte = dia === cobro.corte;
            const [fondo, texto] = pago ? [PAGO, '#ffffff'] : corte ? [CORTE, '#ffffff'] : tipo ? FONDO[tipo] : ['', '#64748b'];
            if (fondo) caja(ctx, x + 4, fila + 4, CELDA - 8, ALTO_CELDA - 8, 16, fondo);
            if (dia === cobro.activacion) {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.roundRect(x + 6, fila + 6, CELDA - 12, ALTO_CELDA - 12, 14);
                ctx.stroke();
            }
            ctx.fillStyle = texto;
            ctx.font = `${pago || corte ? 800 : 700} 32px ${FUENTE}`;
            ctx.fillText(String(n + 1), x + CELDA / 2, fila + ALTO_CELDA / 2 + 11);
        }
        y += semanas(anio, mes) * ALTO_CELDA + 24;
    }
    ctx.textAlign = 'left';

    // Leyenda
    const leyenda: [string, string, boolean?][] = [
        ...(cobro.gratis_hasta ? [[FONDO.gratis[0], 'Mes gratis'] as [string, string]] : []),
        ...(cobro.prorrateo ? [[FONDO.prorrateo[0], 'Prorrateo'] as [string, string]] : []),
        [FONDO.mensualidad[0], '1.ª mensualidad'],
        [PAGO, 'Día de pago'],
        ...(cobro.corte ? [[CORTE, 'Corte si no paga'] as [string, string]] : []),
        ['#0f172a', 'Instalación', true],
    ];
    ctx.font = `600 26px ${FUENTE}`;
    let x = MARGEN;
    let filaLeyenda = y + 10;
    for (const [color, texto, borde] of leyenda) {
        const ancho = 36 + 12 + ctx.measureText(texto).width + 30;
        if (x + ancho > ANCHO - MARGEN) {
            x = MARGEN;
            filaLeyenda += 46;
        }
        if (borde) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(x + 2, filaLeyenda + 2, 32, 32, 8);
            ctx.stroke();
        } else {
            caja(ctx, x, filaLeyenda, 36, 36, 8, color);
        }
        ctx.fillStyle = '#334155';
        ctx.fillText(texto, x + 48, filaLeyenda + 28);
        x += ancho;
    }
    y = filaLeyenda + 90;

    // Explicación
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 34px ${FUENTE}`;
    ctx.fillText('¿Cómo se cobra?', MARGEN, y);
    y += 30;
    ctx.font = `500 30px ${FUENTE}`;
    for (const parrafo of textoExplicacion) {
        y += 18;
        caja(ctx, MARGEN + 4, y + 16, 12, 12, 6, '#10b981');
        ctx.fillStyle = '#334155';
        for (const linea of parrafo) {
            y += 42;
            ctx.fillText(linea, MARGEN + 36, y - 6);
        }
    }

    // Pie
    y += 50;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(MARGEN, y, ANCHO - MARGEN * 2, 2);
    ctx.fillStyle = '#64748b';
    ctx.font = `600 26px ${FUENTE}`;
    const pie = [datos.empresa, datos.telefono, datos.pie].filter(Boolean).join(' · ');
    ctx.fillText(pie, MARGEN, y + 48);

    const recortada = document.createElement('canvas');
    recortada.width = ANCHO;
    recortada.height = Math.min(canvas.height, y + 90);
    recortada.getContext('2d')!.drawImage(canvas, 0, 0);
    return new Promise((resolve, reject) => {
        recortada.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
    });
}

/** Abre el menú de compartir (WhatsApp) o, si el celular no puede, la descarga. */
export async function compartirImagen(blob: Blob, nombre: string, texto: string) {
    const archivo = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare?.({ files: [archivo] })) {
        try {
            await navigator.share({ files: [archivo], text: texto });
            return 'compartida';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return 'cancelada';
        }
    }
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'descargada';
}
