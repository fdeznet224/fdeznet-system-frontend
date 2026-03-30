import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    CloudArrowUpIcon, 
    DocumentTextIcon, 
    ArrowLeftIcon, 
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon 
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Importar() {
    const navigate = useNavigate();
    
    // --- ESTADOS DE SELECCIÓN ---
    const [routerId, setRouterId] = useState('');
    const [redId, setRedId] = useState('');
    const [zonaId, setZonaId] = useState('');
    const [plantillaId, setPlantillaId] = useState('');
    const [planId, setPlanId] = useState(''); // <--- NUEVO: Estado para el Plan
    
    // --- LISTAS PARA DROPDOWNS ---
    const [routers, setRouters] = useState<any[]>([]);
    const [redes, setRedes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]); // <--- NUEVO: Lista de Planes

    // --- ARCHIVO Y ESTADO ---
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<any>(null);

    // 1. CARGAR LISTAS GENERALES
    useEffect(() => {
        const loadCatalogos = async () => {
            try {
                // Agregamos la carga de planes (/planes/)
                const [r, z, p, pl] = await Promise.all([
                    client.get('/network/routers/'),
                    client.get('/zonas'),
                    client.get('/configuracion/plantillas-facturacion'),
                    client.get('/planes/') 
                ]);
                setRouters(r.data);
                setZonas(z.data);
                setPlantillas(p.data);
                setPlanes(pl.data);
            } catch (error) {
                console.error(error);
                toast.error("Error cargando catálogos");
            }
        };
        loadCatalogos();
    }, []);

    // 2. EFECTO: CARGAR REDES CUANDO CAMBIA EL ROUTER
    useEffect(() => {
        setRedId(''); 
        setRedes([]);
        
        if (routerId) {
            const fetchRedes = async () => {
                try {
                    const res = await client.get(`/network/redes/router/${routerId}`);
                    setRedes(res.data);
                } catch (error) {
                    toast.error("Error cargando redes del router");
                }
            };
            fetchRedes();
        }
    }, [routerId]);

    // 3. DESCARGAR PLANTILLA INTELIGENTE
    const handleDescargarPlantilla = async () => {
        // Validaciones completas
        if (!routerId) return toast.error("Selecciona un Router");
        if (!redId) return toast.error("Selecciona una Red IP");
        if (!zonaId) return toast.error("Selecciona una Zona");
        if (!plantillaId) return toast.error("Selecciona una Plantilla");
        if (!planId) return toast.error("Selecciona un Plan por defecto"); // <--- Validación nueva

        const loadingToast = toast.loading("Generando plantilla inteligente...");

        try {
            // Enviamos TODOS los IDs, incluido el plan_id
            const params = new URLSearchParams({
                router_id: routerId,
                red_id: redId,
                zona_id: zonaId,
                plantilla_id: plantillaId,
                plan_id: planId // <--- Enviamos el plan
            }).toString();

            const response = await client.get(`/network/importar/plantilla-inteligente?${params}`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Plantilla_FdezNet_R${routerId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.dismiss(loadingToast);
            toast.success("Plantilla descargada. Revisa los datos y súbela.");
        } catch {
            toast.dismiss(loadingToast);
            toast.error("Error al generar la plantilla");
        }
    };

    // 4. SUBIR ARCHIVO
    const handleUpload = async () => {
        if (!file) return toast.error("Selecciona el archivo Excel");
        if (!routerId) return toast.error("Selecciona el Router destino");

        setLoading(true);
        setResultado(null);

        const formData = new FormData();
        formData.append("archivo", file);

        try {
            const res = await client.post(`/network/importar/procesar-excel?router_id=${routerId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setResultado(res.data);
            
            if (res.data.importados > 0) {
                toast.success(`¡Éxito! ${res.data.importados} clientes importados.`);
            } else {
                toast.error("No se importaron clientes. Revisa los errores.");
            }
            
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Error al procesar archivo";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/admin/configuracion')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white">Importación Masiva</h2>
                    <p className="text-slate-400 text-sm">Sincroniza tu MikroTik con la Base de Datos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN (PASO 1) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-0"></div>

                        <h3 className="text-white font-bold mb-6 flex items-center gap-2 relative z-10">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Configuración del Lote
                        </h3>
                        
                        <div className="space-y-5 relative z-10">
                            {/* Router */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">Router MikroTik</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition" 
                                    value={routerId} onChange={e => setRouterId(e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>

                            {/* Red (Pool IP) */}
                            <div className={`transition-all duration-300 ${!routerId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase flex items-center gap-2">
                                    <GlobeAltIcon className="w-3 h-3" /> Red / Pool IP
                                </label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition" 
                                    value={redId} onChange={e => setRedId(e.target.value)}>
                                    <option value="">-- Seleccionar Red --</option>
                                    {redes.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.cidr})</option>)}
                                </select>
                                {routerId && redes.length === 0 && (
                                    <p className="text-[10px] text-rose-400 mt-1">⚠️ Este router no tiene Redes creadas.</p>
                                )}
                            </div>

                            {/* Zona */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">Zona Geográfica</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition" 
                                    value={zonaId} onChange={e => setZonaId(e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                </select>
                            </div>

                            {/* Plantilla */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">Plantilla Facturación</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition" 
                                    value={plantillaId} onChange={e => setPlantillaId(e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>

                            {/* --- SELECCIÓN DE PLAN (NUEVO) --- */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">Plan de Internet (Por Defecto)</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition" 
                                    value={planId} onChange={e => setPlanId(e.target.value)}>
                                    <option value="">-- Seleccionar Plan --</option>
                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.precio})</option>)}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1 px-1">
                                    Usado si no detectamos el plan automáticamente en el MikroTik.
                                </p>
                            </div>

                            <button 
                                onClick={handleDescargarPlantilla}
                                className="w-full mt-4 bg-slate-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5"/> Descargar Plantilla
                            </button>
                            <p className="text-[10px] text-slate-500 text-center px-4">
                                Esto generará un Excel con los datos actuales del MikroTik + la configuración seleccionada.
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: SUBIDA (PASO 2) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center relative h-full flex flex-col justify-center">
                        <div className="absolute top-4 left-4 flex items-center gap-2 font-bold text-white">
                             <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                             Carga de Datos
                        </div>

                        <div className="max-w-md mx-auto w-full">
                            <div className="mx-auto w-20 h-20 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                                <CloudArrowUpIcon className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">Sube el Excel completado</h3>
                            <p className="text-slate-400 text-sm mb-8">
                                El sistema leerá el archivo, validará las IPs con la Red seleccionada y creará los clientes automáticamente.
                            </p>

                            <label className={`
                                block w-full border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all mb-6
                                ${file ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/30'}
                            `}>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls"
                                    onChange={e => {
                                        if (e.target.files) setFile(e.target.files[0]);
                                        setResultado(null);
                                    }}
                                    className="hidden"
                                />
                                <span className="block text-sm font-medium text-slate-300">
                                    {file ? (
                                        <span className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                                            <DocumentTextIcon className="w-5 h-5"/> {file.name}
                                        </span>
                                    ) : "Click para seleccionar archivo Excel"}
                                </span>
                            </label>

                            <button 
                                onClick={handleUpload} 
                                disabled={loading || !file}
                                className={`w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                    loading 
                                    ? 'bg-blue-900/50 text-blue-200 cursor-wait' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
                                }`}
                            >
                                {loading ? 'Procesando...' : 'Iniciar Importación Masiva'}
                            </button>
                        </div>
                    </div>

                    {/* RESULTADOS */}
                    {resultado && (
                        <div className={`p-6 rounded-2xl border animate-in slide-in-from-bottom-4 shadow-xl ${
                            resultado.importados > 0 ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-rose-900/10 border-rose-500/30'
                        }`}>
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                {resultado.importados > 0 ? <GlobeAltIcon className="w-5 h-5 text-emerald-400"/> : <ExclamationTriangleIcon className="w-5 h-5 text-rose-400"/>}
                                Resultado de la Importación
                            </h4>
                            
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-slate-900/60 p-4 rounded-xl text-center border border-slate-700">
                                    <div className="text-3xl font-bold text-emerald-400">{resultado.importados || 0}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Clientes Importados</div>
                                </div>
                                <div className="flex-1 bg-slate-900/60 p-4 rounded-xl text-center border border-slate-700">
                                    <div className="text-3xl font-bold text-rose-400">{resultado.errores ? resultado.errores.length : 0}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Errores Detectados</div>
                                </div>
                            </div>

                            {resultado.errores && resultado.errores.length > 0 && (
                                <div className="bg-slate-950 p-4 rounded-xl max-h-60 overflow-y-auto border border-slate-800 custom-scrollbar">
                                    <p className="text-xs font-bold text-rose-400 mb-3 flex items-center gap-1 sticky top-0 bg-slate-950 py-1">
                                        <ExclamationTriangleIcon className="w-3.5 h-3.5"/> Detalles de Errores:
                                    </p>
                                    <ul className="space-y-2">
                                        {resultado.errores.map((err: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-300 border-l-2 border-rose-500/50 pl-3 py-1">
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}