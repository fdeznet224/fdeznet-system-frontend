import { useState } from 'react';
import type { FormEvent } from 'react'; 
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
// Asegúrate de tener definida esta interfaz en tus types, o usa any si prefieres rápido
import type { LoginResponse } from '../types'; 

export default function Login() {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        
        // Creamos form-data porque así lo suele pedir OAuth2 (FastAPI standard)
        // Si tu backend espera JSON, cambia esto por un objeto { username, password }
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await client.post<LoginResponse>('/auth/login', formData);
            
            // 1. Guardamos Token y Usuario
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            toast.success(`Bienvenido, ${response.data.user.usuario}!`);

            // 2. 👇 LÓGICA DE REDIRECCIÓN CORREGIDA SEGÚN App.tsx 👇
            const userRole = response.data.user.rol; 
            const role = userRole.toLowerCase();

            if (role === 'admin') {
                // Ruta definida en App.tsx: /admin/dashboard
                navigate('/admin/dashboard');
            } 
            else if (role === 'tecnico') {
                // Ruta definida en App.tsx: /tech/dashboard
                navigate('/tech/dashboard');
            } 
            else {
                // Asumimos que es 'cajero' o 'cobrador'
                // ⚠️ CORRECCIÓN: En tu App.tsx la ruta es /admin/cobranza
                navigate('/admin/cobranza');
            }
            
        } catch (error) {
            console.error(error);
            toast.error("Usuario o contraseña incorrectos");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        FdezNet System 📡
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Acceso Seguro
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <input
                                type="text"
                                required
                                className="relative block w-full rounded-t-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4"
                                placeholder="Usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="relative block w-full rounded-b-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-4"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold leading-6 text-white hover:bg-blue-500 transition-all duration-200"
                        >
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}