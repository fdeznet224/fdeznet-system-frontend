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
                // CORRECCIÓN AQUÍ: 
                // Tu backend devuelve { "password": "..." }, así que leemos .password
                // Si alguna vez devuelve null, ponemos string vacío ''
                setPassword(res.data.password || ''); 
            })
            .catch(() => {
                toast.error("No se pudo cargar la configuración actual");
            });
    }, []);

    const handleSave = async () => {
        try {
            // NOTA: Verifica si tu backend espera "valor" o "password" al guardar.
            // Según tu Swagger anterior era "valor", pero si cambiaste el GET, 
            // quizás el POST ahora espera "password".
            // Lo dejo como 'valor' por seguridad, si falla cámbialo a 'password'.
            await client.post('/configuracion/pppoe-default', { valor: password });
            toast.success("Contraseña guardada");
        } catch { 
            toast.error("Error al guardar"); 
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 animate-in fade-in duration-500">
             <button onClick={() => navigate('/admin/configuracion')} className="mb-6 flex items-center text-slate-400 hover:text-white transition">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Regresar
            </button>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center">
                        <KeyIcon className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Seguridad PPPoE</h2>
                        <p className="text-slate-400 text-xs">Contraseña por defecto para nuevos clientes.</p>
                    </div>
                </div>

                <label className="block text-sm font-bold text-slate-300 mb-2">Contraseña Default</label>
                <div className="relative mb-6">
                    <input 
                        type="text" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 pl-10 outline-none focus:border-rose-500 transition-colors"
                        placeholder="Cargando..."
                    />
                    <ShieldCheckIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                </div>

                <button onClick={handleSave} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-rose-500/20">
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}