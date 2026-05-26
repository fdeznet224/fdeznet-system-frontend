import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'react-hot-toast';
import {
    XMarkIcon, BoltIcon, QrCodeIcon,
    VideoCameraSlashIcon, UserIcon
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

        const toastId = toast.loading(`Buscando cliente...`, {
            style: { background: '#1e293b', color: '#fff', fontWeight: 'bold' }
        });

        try {
            let codigoBusqueda = rawValue;
            // Limpiamos la URL por si el QR trae un enlace completo
            if (rawValue.includes('/')) {
                const partes = rawValue.split('/');
                codigoBusqueda = partes[partes.length - 1];
            }

            const res = await client.get(`/clientes/?search=${codigoBusqueda}`);
            const clientesEncontrados = res.data;

            if (clientesEncontrados && clientesEncontrados.length > 0) {
                const cliente = clientesEncontrados[0];
                toast.dismiss(toastId);
                toast.success(`Cliente: ${cliente.nombre}`, { duration: 4000 });
                navigate(`/tech/cliente/${cliente.cedula}`);
            } else {
                toast.dismiss(toastId);
                toast.error(`QR no registrado: ${codigoBusqueda}`, { duration: 3000 });
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
        <div className="fixed inset-0 z-[150] bg-black flex flex-col font-sans overflow-hidden">

            {/* === Header Flotante === */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-12">
                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/5 shadow-lg">
                    <UserIcon className="w-6 h-6 text-emerald-400" />
                    <div>
                        <h2 className="text-base md:text-lg font-black text-white tracking-tight">Buscar Cliente</h2>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest -mt-0.5">FdezNet Tech</p>
                    </div>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className="p-3.5 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-rose-500/20 transition-all border border-white/10 active:scale-90 shadow-2xl"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* === Contenedor de Cámara === */}
            <div className="flex-1 relative flex flex-col justify-center overflow-hidden z-10 bg-black">

                {permissionDenied ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-black/60 backdrop-blur-lg rounded-3xl mx-6 border border-white/10 shadow-2xl animate-in fade-in">
                        <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20 shadow-inner">
                            <VideoCameraSlashIcon className="w-14 h-14 text-red-500" />
                        </div>
                        <h3 className="text-white font-black text-2xl mb-2.5 tracking-tight">Cámara Bloqueada</h3>
                        <p className="text-gray-400 text-sm max-w-xs font-medium leading-relaxed">
                            No podemos acceder a la cámara. Revisa los permisos de tu navegador.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-8 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest"
                        >
                            Reintentar Permisos
                        </button>
                    </div>
                ) : (
                    <>
                        <Scanner
                            onScan={handleScan}
                            onError={handleError}
                            scanDelay={500}
                            formats={['qr_code']} // 🔥 SOLO BUSCA CÓDIGOS QR
                            components={{
                                finder: true, // 🔥 REGRESAMOS EL ENCUADRE CUADRADO ORIGINAL
                            }}
                            styles={{
                                container: { height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 },
                                video: { objectFit: 'cover', height: '100%', width: '100%' }
                            }}
                        />

                        {/* === Instrucción Visual debajo del cuadro de enfoque === */}
                        {/* 🔥 CAMBIO AQUÍ: Usamos 'bottom-20' para anclarlo abajo sin importar el tamaño del celular 🔥 */}
                        <div className="absolute bottom-5 md:bottom-32 left-0 w-full flex justify-center z-30 pointer-events-none px-6">
                            <div className="flex flex-col items-center gap-2 bg-black/70 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl max-w-[280px] text-center animate-pulse">
                                <QrCodeIcon className="w-8 h-8 text-emerald-400 shrink-0" />
                                <p className="text-sm font-black text-white leading-tight">
                                    Escanea el código QR del cliente
                                </p>
                                <p className="text-[10px] text-emerald-300/80 uppercase tracking-widest font-bold">
                                    Ubícalo en el centro
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* === Overlay de Carga === */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-40 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                            <BoltIcon className="w-16 h-16 text-emerald-400 animate-bounce relative z-10" />
                        </div>
                        <p className="text-white font-black mt-8 text-2xl tracking-tight transition-colors">Abriendo perfil...</p>
                    </div>
                )}
            </div>
        </div>
    );
}