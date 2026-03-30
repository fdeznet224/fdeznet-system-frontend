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

    // Manejador de Errores de la Cámara
    const handleError = (error: any) => {
        console.error("Error cámara:", error);
        // Si el error es por permisos denegados o dispositivo no encontrado
        if (error?.name === 'NotAllowedError' || error?.name === 'NotFoundError') {
            setPermissionDenied(true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
            
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent pb-10">
                <div className="text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <MagnifyingGlassIcon className="w-5 h-5 text-emerald-500"/>
                        Escáner FDEZ
                    </h2>
                    <p className="text-xs text-gray-300 opacity-80">Apunta al código SN / MAC</p>
                </div>
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md active:bg-white/20 transition border border-white/5"
                >
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>

            {/* Contenedor Principal */}
            <div className="flex-1 bg-black relative flex flex-col justify-center overflow-hidden">
                
                {permissionDenied ? (
                    // === ESTADO: PERMISO DENEGADO ===
                    <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                        <div className="bg-red-500/10 p-6 rounded-full mb-4 border border-red-500/20">
                            <VideoCameraSlashIcon className="w-12 h-12 text-red-500"/>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Cámara Bloqueada</h3>
                        <p className="text-slate-400 text-sm max-w-xs">
                            Necesitamos acceso a la cámara para escanear. Por favor revisa los permisos en tu navegador.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition border border-slate-700"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                ) : (
                    // === ESTADO: ESCÁNER ACTIVO ===
                    <Scanner 
                        onScan={handleScan}
                        onError={handleError} // 👈 Importante: Captura el error de permisos
                        scanDelay={500}
                        allowMultiple={true}
                        components={{ 
                            finder: true, // ✅ Correcto: Solo finder, quitamos audio
                        }}
                        styles={{
                            container: { height: '100%', width: '100%' },
                            video: { objectFit: 'cover' }
                        }}
                    />
                )}
                
                {/* Overlay de Carga */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                            <BoltIcon className="w-16 h-16 text-emerald-500 animate-bounce relative z-10"/>
                        </div>
                        <p className="text-white font-bold mt-6 text-xl tracking-tight">Procesando...</p>
                        <p className="text-emerald-400/60 text-sm font-mono mt-1">Consultando base de datos</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!loading && !permissionDenied && (
                <div className="absolute bottom-10 left-0 w-full text-center z-20 pointer-events-none">
                    <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <QrCodeIcon className="w-4 h-4 text-emerald-400"/>
                        <span className="text-xs text-slate-200">Encuadra el código</span>
                    </div>
                </div>
            )}
        </div>
    );
}