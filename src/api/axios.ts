import axios from 'axios';

// 👇 AQUÍ ESTÁ LA MAGIA 👇
// import.meta.env.PROD es 'true' cuando compilas el sistema para la VPS.
// Es 'false' cuando estás programando en tu PC (npm run dev).
const API_URL = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000';

const client = axios.create({
    baseURL: API_URL, 
});

// Interceptor para inyectar el Token en cada petición
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor para manejar errores 401 (Token expirado)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;