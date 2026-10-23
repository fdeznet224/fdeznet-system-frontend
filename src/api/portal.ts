import axios from 'axios';

// Cliente aparte para el portal del cliente: su sesión va en otra cookie y un
// 401 lo regresa a la entrada del portal, no al login del personal.
const API_URL = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000';

const portalClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

portalClient.defaults.headers.get['Cache-Control'] = 'no-cache, no-store, must-revalidate';

portalClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const enEntrada = window.location.pathname === '/cliente';
        if (error.response?.status === 401 && !enEntrada) window.location.href = '/cliente';
        return Promise.reject(error);
    },
);

export default portalClient;
