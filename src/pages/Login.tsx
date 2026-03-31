import { useState } from 'react';
import type { FormEvent } from 'react'; 
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
    SignalIcon, 
    UserIcon, 
    LockClosedIcon, 
    ArrowPathIcon 
} from '@heroicons/react/24/outline';

export default function Login() {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            // Usa 'any' si no tienes LoginResponse exportado a mano, 
            // o ajusta según tu archivo de types
            const response = await client.post<any>('/auth/login', formData);
            
            // 1. Guardamos Token y Usuario
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            toast.success(`¡Bienvenido de nuevo, ${response.data.user.usuario}!`, {
                icon: '👋',
                style: { background: '#1e293b', color: '#fff', border: '1px solid #3b82f6' }
            });

            // 2. LÓGICA DE REDIRECCIÓN
            const userRole = response.data.user.rol; 
            const role = userRole.toLowerCase();

            if (role === 'admin') {
                navigate('/admin/dashboard');
            } 
            else if (role === 'tecnico') {
                navigate('/tech/dashboard');
            } 
            else {
                navigate('/admin/cobranza');
            }
            
        } catch (error) {
            console.error(error);
            toast.error("Usuario o contraseña incorrectos", {
                style: { background: '#1e293b', color: '#fff', border: '1px solid #ef4444' }
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans">
            
            {/* EFECTOS DE FONDO AMBIENTALES */}
            <div className="absolute top-0 left-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 opacity-30">
                <div className="aspect-[2/1] bg-gradient-to-b from-blue-600 to-transparent blur-3xl rounded-full"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full"></div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                
                {/* LOGO Y TÍTULO */}
                <div className="text-center mb-8">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <SignalIcon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                        FDEZ<span className="text-blue-500">NET</span>
                    </h2>
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                        Portal de Administración
                    </p>
                </div>
                
                {/* TARJETA DE FORMULARIO */}
                <div className="bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-700/50">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        
                        <div className="space-y-4">
                            {/* INPUT USUARIO */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                    Usuario
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <UserIcon className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="username"
                                        className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3.5 pl-11 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all outline-none"
                                        placeholder="admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* INPUT CONTRASEÑA */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <LockClosedIcon className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3.5 pl-11 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all outline-none"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BOTÓN SUBMIT */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        <span>Autenticando...</span>
                                    </>
                                ) : (
                                    <span>Iniciar Sesión</span>
                                )}
                            </button>
                        </div>
                        
                    </form>

                    {/* FOOTER OPCIONAL */}
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            ISP Management System v2.2
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}