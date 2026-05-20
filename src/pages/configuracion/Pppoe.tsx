import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { KeyIcon, ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Pppoe() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');

    useEffect(() => {
        client.get('/configuracion/pppoe-default')
            .then(res => {
                setPassword(res.data.password || ''); 
            })
            .catch(() => {
                toast.error("No se pudo cargar la configuración actual");
            });
    }, []);

    const handleSave = async () => {
        try {
            await client.post('/configuracion/pppoe-default', { valor: password });
            toast.success("Contraseña guardada");
        } catch { 
            toast.error("Error al guardar"); 
        }
    };

    return (
        /* ✅ ADAPTADO: Fondo base dinámico */
        <div className="max-w-xl mx-auto mt-10 animate-in fade-in duration-500 p-4 transition-colors duration-300">
             <button 
                onClick={() => navigate('/admin/configuracion')} 
                className="mb-6 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Regresar
            </button>

            {/* ✅ ADAPTADO: Tarjeta blanca/oscura */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl p-8 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
                        <KeyIcon className="w-6 h-6 text-rose-600 dark:text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white transition-colors">Seguridad PPPoE</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Contraseña por defecto para nuevos clientes.</p>
                    </div>
                </div>

                <label className="block text-sm font-black text-slate-600 dark:text-slate-300 mb-2 transition-colors">Contraseña Default</label>
                <div className="relative mb-6">
                    <input 
                        type="text" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 pl-10 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                        placeholder="Cargando..."
                    />
                    <ShieldCheckIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5 transition-colors" />
                </div>

                <button 
                    onClick={handleSave} 
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl transition shadow-md hover:shadow-rose-500/20 active:scale-95"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}