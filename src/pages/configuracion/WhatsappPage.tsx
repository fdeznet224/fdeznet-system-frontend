import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import WhatsappConfig from '../configuracion/WhatsappConfig'; // 👈 Tu componente del QR

export default function WhatsappPage() {
    const navigate = useNavigate();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            
            {/* Cabecera con botón de regreso */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white">Conexión WhatsApp</h2>
                    <p className="text-slate-400 text-sm">Escanea el código QR para activar el bot.</p>
                </div>
            </div>

            {/* Contenedor del Escáner (Centrado y Grande) */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[600px]"> 
                    {/* Reutilizamos tu componente tal cual */}
                    <WhatsappConfig />
                </div>
            </div>
        </div>
    );
}