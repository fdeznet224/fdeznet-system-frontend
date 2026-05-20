import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, BoltIcon, MagnifyingGlassIcon, 
    QrCodeIcon, VideoCameraSlashIcon 
} from '@heroicons/react/24/outline';
import client from '../../api/axios';

export default function QrScanner() {
    const navigate = useNavigate();
    
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const handleScan = async (result: any) => {
        if (paused || !result) return;
        
        const rawValue = result[0]?.rawValue;
        if (!rawValue) return;

        setPaused(true); 
        setLoading(true);
        
        const toastId = toast.loading(`Analizando: ${rawValue}...`);

        try {
            let codigoBusqueda = rawValue;
            // Limpieza de URL si es necesario
            if (rawValue.includes('/')) {
                const partes = rawValue.split('/');
                codigoBusqueda = partes[partes.length - 1];
            }

            const res = await client.get(`/clientes/?search=${codigoBusqueda}`);
            const clientesEncontrados = res.data;

            if (clientesEncontrados && clientesEncontrados.length > 0) {
                const cliente = clientesEncontrados[0];
                toast.dismiss(toastId);
                toast.success(`Equipo de: ${cliente.nombre}`, { duration: 4000 });
                navigate(`/tech/cliente/${cliente.cedula}`); 
            } else {
                toast.dismiss(toastId);
                toast.error(`Equipo no registrado: ${codigoBusqueda}`, { duration: 3000 });
                setTimeout(() => {
                    setPaused(false);
                    setLoading(false);
                }, 2500);
            }

        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error("Error de conexión");
            setTimeout(() => {
                setPaused(false);
                setLoading(false);
            }, 2000);
        }
    };

    const handleError = (error: any) => {
        console.error("Error cámara:", error);
        if (error?.name === 'NotAllowedError' || error?.name === 'NotFoundError') {
            setPermissionDenied(true);
        }
    };

    return (
        /* ✅ ADAPTADO: Fondo base adaptativo */
        <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-black flex flex-col font-sans transition-colors duration-300">
            
            {/* Header Superpuesto */}
            {/* ✅ ADAPTADO: Gradiente pasa de blanco humo a negro cristalino según el tema */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20 bg-gradient-to-b from-white/95 via-white/70 dark:from-black/90 dark:via-black/50 to-transparent pb-10 transition-colors duration-300">
                <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight transition-colors">
                        <MagnifyingGlassIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                        Escáner FDEZ
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-gray-300 uppercase tracking-widest mt-0.5">Apunta al código SN / MAC</p>
                </div>
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-3 bg-slate-200/60 dark:bg-white/10 rounded-full text-slate-700 dark:text-white backdrop-blur-md hover:bg-slate-300 dark:hover:bg-white/20 transition-all border border-slate-300/50 dark:border-white/5 active:scale-90"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Contenedor Principal (Cámara) */}
            <div className="flex-1 bg-slate-100 dark:bg-black relative flex flex-col justify-center overflow-hidden transition-colors duration-300">
                
                {permissionDenied ? (
                    // === ESTADO: PERMISO DENEGADO ADAPTATIVO ===
                    <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                        <div className="bg-rose-500/10 dark:bg-red-500/10 p-6 rounded-full mb-4 border border-rose-500/20 dark:border-red-500/20 shadow-inner">
                            <VideoCameraSlashIcon className="w-12 h-12 text-rose-500 dark:text-red-500" />
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2 tracking-tight">Cámara Bloqueada</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs font-medium">
                            Necesitamos acceso a la cámara para escanear. Por favor revisa los permisos en tu navegador.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-md active:scale-95"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                ) : (
                    // === ESTADO: ESCÁNER ACTIVO ===
                    <Scanner 
                        onScan={handleScan}
                        onError={handleError}
                        scanDelay={500}
                        allowMultiple={true}
                        components={{ 
                            finder: true,
                        }}
                        styles={{
                            container: { height: '100%', width: '100%' },
                            video: { objectFit: 'cover' }
                        }}
                    />
                )}
                
                {/* Overlay de Carga Adaptativo */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-black/80 z-30 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                            <BoltIcon className="w-16 h-16 text-emerald-600 dark:text-emerald-500 animate-bounce relative z-10" />
                        </div>
                        <p className="text-slate-900 dark:text-white font-black mt-6 text-xl tracking-tight transition-colors">Procesando...</p>
                        <p className="text-emerald-600 dark:text-emerald-400/80 text-xs font-mono font-bold mt-1.5 uppercase tracking-widest">Consultando base de datos</p>
                    </div>
                )}
            </div>

            {/* Footer Adaptativo */}
            {!loading && !permissionDenied && (
                <div className="absolute bottom-10 left-0 w-full text-center z-20 pointer-events-none">
                    <div className="inline-flex items-center gap-2 bg-white/90 dark:bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 dark:border-white/10 shadow-lg">
                        <QrCodeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest transition-colors">Encuadra el código</span>
                    </div>
                </div>
            )}
        </div>
    );
}