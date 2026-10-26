import { useRef, type TouchEvent } from 'react';

// Lo que hay que bajar la hoja (o la rapidez del gesto) para que se cierre.
const DISTANCIA_CIERRE = 120;
const DISTANCIA_RAPIDA = 60;
const VELOCIDAD_RAPIDA = 0.5; // px por ms
const SALIDA_MS = 180;

const enCelular = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

/** Si el dedo empezó dentro de algo que ya bajó con scroll, el gesto es scroll y no cierra. */
function dentroDeScroll(objetivo: EventTarget | null, panel: HTMLElement): boolean {
    for (let nodo = objetivo as HTMLElement | null; nodo && nodo !== panel; nodo = nodo.parentElement) {
        if (nodo.scrollTop > 0) return true;
    }
    return false;
}

/**
 * Hoja que sube desde abajo en el celular: se cierra deslizándola hacia abajo,
 * desde el encabezado o desde el contenido cuando está hasta arriba. En PC no hace nada.
 */
export function useDeslizarParaCerrar<T extends HTMLElement>(onClose: () => void) {
    const panelRef = useRef<T>(null);
    const gesto = useRef<{ x: number; y: number; t: number; dy: number; activo: boolean | null } | null>(null);

    const mover = (dy: number, transicion: string) => {
        const panel = panelRef.current;
        if (!panel) return;
        panel.style.transition = transicion;
        panel.style.transform = dy ? `translateY(${dy}px)` : '';
    };

    const onTouchStart = (e: TouchEvent) => {
        const panel = panelRef.current;
        if (!panel || !enCelular() || e.touches.length !== 1 || dentroDeScroll(e.target, panel)) {
            gesto.current = null;
            return;
        }
        const toque = e.touches[0];
        gesto.current = { x: toque.clientX, y: toque.clientY, t: Date.now(), dy: 0, activo: null };
    };

    const onTouchMove = (e: TouchEvent) => {
        const actual = gesto.current;
        if (!actual) return;
        const toque = e.touches[0];
        const dx = toque.clientX - actual.x;
        const dy = toque.clientY - actual.y;
        if (actual.activo === null) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            // Hacia los lados (pestañas) o hacia arriba (scroll) no es cerrar.
            actual.activo = dy > 0 && Math.abs(dy) > Math.abs(dx);
            if (!actual.activo) {
                gesto.current = null;
                return;
            }
        }
        actual.dy = Math.max(0, dy);
        mover(actual.dy, 'none');
    };

    const onTouchEnd = () => {
        const actual = gesto.current;
        gesto.current = null;
        if (!actual?.activo) return;
        const velocidad = actual.dy / Math.max(1, Date.now() - actual.t);
        if (actual.dy > DISTANCIA_CIERRE || (actual.dy > DISTANCIA_RAPIDA && velocidad > VELOCIDAD_RAPIDA)) {
            mover(window.innerHeight, `transform ${SALIDA_MS}ms ease-in`);
            window.setTimeout(() => {
                onClose();
                mover(0, '');
            }, SALIDA_MS);
        } else {
            mover(0, 'transform 200ms ease-out');
        }
    };

    return { panelRef, deslizar: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}
