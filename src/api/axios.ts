import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { notifySessionChanged } from '../offline/db';

// 👇 AQUÍ ESTÁ LA MAGIA 👇
// import.meta.env.PROD es 'true' cuando compilas el sistema para la VPS.
// Es 'false' cuando estás programando en tu PC (npm run dev).
const API_URL = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000';

const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// 🔥 ESTA ES LA MAGIA GLOBAL ANTI-CACHÉ 🔥
// Obliga al navegador a siempre pedir los datos frescos al servidor en las peticiones GET
client.defaults.headers.get['Cache-Control'] = 'no-cache, no-store, must-revalidate';
client.defaults.headers.get['Pragma'] = 'no-cache';
client.defaults.headers.get['Expires'] = '0';

// Al volver de otra app, el celular reanuda las consultas antes de que su
// red esté lista y fallan sin respuesta ("Network Error"). Las lecturas se
// reintentan cuando la página está visible y hay red; las escrituras nunca,
// para no duplicar un cobro o una acción.
const ESPERAS_REINTENTO_MS = [800, 2000, 4000];
// Al volver de otra app la red regresa en menos de un segundo; si tras esto
// sigue sin red (por ejemplo, en una caja NAP sin señal) no se reintenta y
// cada pantalla usa lo que tenga guardado.
const ESPERA_MAXIMA_RED_MS = 3000;

type ConfigConReintento = InternalAxiosRequestConfig & { _reintentosRed?: number };

function esperar(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Espera a que la página esté visible y con red (o a que pase el tiempo máximo). */
function esperarPaginaLista(): Promise<void> {
    const lista = () => document.visibilityState === 'visible' && navigator.onLine;
    if (lista()) return Promise.resolve();
    return new Promise((resolve) => {
        const terminar = () => {
            if (!lista()) return;
            limpiar();
            resolve();
        };
        const limite = window.setTimeout(() => { limpiar(); resolve(); }, ESPERA_MAXIMA_RED_MS);
        const limpiar = () => {
            window.clearTimeout(limite);
            document.removeEventListener('visibilitychange', terminar);
            window.removeEventListener('online', terminar);
        };
        document.addEventListener('visibilitychange', terminar);
        window.addEventListener('online', terminar);
    });
}

function esErrorDeRed(error: AxiosError) {
    return !error.response && !axios.isCancel(error) && error.code !== 'ERR_CANCELED';
}

client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as ConfigConReintento | undefined;
        const metodo = (config?.method || 'get').toLowerCase();
        if (config && metodo === 'get' && esErrorDeRed(error)) {
            const intento = config._reintentosRed ?? 0;
            if (intento < ESPERAS_REINTENTO_MS.length) {
                await esperarPaginaLista();
                if (navigator.onLine) {
                    config._reintentosRed = intento + 1;
                    await esperar(ESPERAS_REINTENTO_MS[intento]);
                    return client.request(config);
                }
            }
        }
        // Errores 401 (sesión vencida): volver al inicio de sesión.
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            notifySessionChanged();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;
