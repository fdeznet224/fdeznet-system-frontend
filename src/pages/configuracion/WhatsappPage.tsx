import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import WhatsappConfig from '../configuracion/WhatsappConfig'; 

export default function WhatsappPage() {
    const navigate = useNavigate();

    return (
        /* ✅ ADAPTADO: Fondo principal dinámico */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            
            {/* Cabecera con botón de regreso */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">Conexión WhatsApp</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Escanea el código QR para activar el bot.</p>
                </div>
            </div>

            {/* Contenedor del Escáner */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl p-4 transition-colors"> 
                    <WhatsappConfig />
                </div>
            </div>
        </div>
    );
}