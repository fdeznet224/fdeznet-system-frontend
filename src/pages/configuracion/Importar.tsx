import { useState, useEffect } from 'react';
import axios from 'axios';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    CloudArrowUpIcon, 
    DocumentTextIcon, 
    ArrowLeftIcon, 
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface CatalogOption {
    id: number;
    nombre: string;
    cidr?: string;
}

interface ImportResult {
    importados: number;
    errores?: unknown | unknown[];
}

interface CatalogInput {
    label: string;
    value: string;
    setValue: (value: string) => void;
    options: CatalogOption[];
    disabled?: boolean;
}

function apiErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

export default function Importar() {
    const navigate = useNavigate();
    
    const [routerId, setRouterId] = useState('');
    const [redId, setRedId] = useState('');
    const [zonaId, setZonaId] = useState('');
    const [plantillaId, setPlantillaId] = useState('');
    const [planId, setPlanId] = useState(''); 
    
    const [routers, setRouters] = useState<CatalogOption[]>([]);
    const [redes, setRedes] = useState<CatalogOption[]>([]);
    const [zonas, setZonas] = useState<CatalogOption[]>([]);
    const [plantillas, setPlantillas] = useState<CatalogOption[]>([]);
    const [planes, setPlanes] = useState<CatalogOption[]>([]);

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<ImportResult | null>(null);

    useEffect(() => {
        const loadCatalogos = async () => {
            try {
                const [r, z, p, pl] = await Promise.all([
                    client.get<CatalogOption[]>('/network/routers/'),
                    client.get<CatalogOption[]>('zonas'),
                    client.get<CatalogOption[]>('/configuracion/plantillas-facturacion'),
                    client.get<CatalogOption[]>('/planes/')
                ]);
                setRouters(Array.isArray(r.data) ? r.data : []);
                setZonas(Array.isArray(z.data) ? z.data : []);
                setPlantillas(Array.isArray(p.data) ? p.data : []);
                setPlanes(Array.isArray(pl.data) ? pl.data : []);
            } catch (error) {
                console.error(error);
                toast.error("Error cargando catálogos");
            }
        };
        loadCatalogos();
    }, []);

    useEffect(() => {
        setRedId(''); 
        setRedes([]);
        
        if (routerId) {
            const fetchRedes = async () => {
                try {
                    const res = await client.get<CatalogOption[]>(`/network/redes/router/${routerId}`);
                    setRedes(Array.isArray(res.data) ? res.data : []);
                } catch {
                    toast.error("Error cargando redes del router");
                }
            };
            fetchRedes();
        }
    }, [routerId]);

    const handleDescargarPlantilla = async () => {
        if (!routerId) return toast.error("Selecciona un Router");
        if (!redId) return toast.error("Selecciona una Red IP");
        if (!zonaId) return toast.error("Selecciona una Zona");
        if (!plantillaId) return toast.error("Selecciona una Plantilla");
        if (!planId) return toast.error("Selecciona un Plan por defecto");

        const loadingToast = toast.loading("Generando plantilla inteligente...");

        try {
            const params = new URLSearchParams({
                router_id: routerId,
                red_id: redId,
                zona_id: zonaId,
                plantilla_id: plantillaId,
                plan_id: planId 
            }).toString();

            const response = await client.get<Blob>(`/network/importar/plantilla-inteligente?${params}`, {
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
            toast.success("Plantilla descargada.");
        } catch {
            toast.dismiss(loadingToast);
            toast.error("Error al generar la plantilla");
        }
    };

    const handleUpload = async () => {
        if (!file) return toast.error("Selecciona el archivo Excel");
        if (!routerId) return toast.error("Selecciona el Router destino");

        setLoading(true);
        setResultado(null);

        const formData = new FormData();
        formData.append("archivo", file);

        try {
            const res = await client.post<ImportResult>(`/network/importar/procesar-excel?router_id=${routerId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setResultado(res.data);
            
            if (res.data.importados > 0) {
                toast.success(`¡Éxito! ${res.data.importados} clientes importados.`);
            } else {
                toast.error("No se importaron clientes. Revisa los errores.");
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error(apiErrorMessage(error, "Error al procesar archivo"));
        } finally {
            setLoading(false);
        }
    };

    const catalogInputs: CatalogInput[] = [
        { label: 'Router MikroTik', value: routerId, setValue: setRouterId, options: routers },
        { label: 'Red / Pool IP', value: redId, setValue: setRedId, options: redes, disabled: !routerId },
        { label: 'Zona Geográfica', value: zonaId, setValue: setZonaId, options: zonas },
        { label: 'Plantilla Facturación', value: plantillaId, setValue: setPlantillaId, options: plantillas },
        { label: 'Plan de Internet', value: planId, setValue: setPlanId, options: planes },
    ];

    return (
        /* ✅ ADAPTADO: Fondo dinámico */
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 p-4 transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/admin/configuracion')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white transition-colors">Importación Masiva</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sincroniza tu MikroTik con la Base de Datos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-0"></div>

                        <h3 className="text-slate-900 dark:text-white font-black mb-6 flex items-center gap-2 relative z-10 transition-colors">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Configuración del Lote
                        </h3>
                        
                        <div className="space-y-5 relative z-10">
                            {/* Inputs */}
                            {catalogInputs.map((input) => (
                                <div key={input.label} className={`transition-all duration-300 ${input.disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider">{input.label}</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-sm outline-none focus:border-blue-500 transition-colors" 
                                        value={input.value} onChange={event => input.setValue(event.target.value)}>
                                        <option value="">-- Seleccionar --</option>
                                        {input.options.map((option) => (
                                            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-950">{option.nombre} {option.cidr ? `(${option.cidr})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            <button onClick={handleDescargarPlantilla} className="w-full mt-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                                <ArrowDownTrayIcon className="w-5 h-5"/> Descargar Plantilla
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: SUBIDA */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl text-center relative h-full flex flex-col justify-center min-h-[400px] transition-colors">
                        <div className="absolute top-4 left-4 flex items-center gap-2 font-black text-slate-900 dark:text-white transition-colors">
                             <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                             Carga de Datos
                        </div>

                        <div className="max-w-md mx-auto w-full">
                            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-500/20">
                                <CloudArrowUpIcon className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 transition-colors">Sube el Excel</h3>
                            <label className={`block w-full border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all mb-6 ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                                <input type="file" accept=".xlsx, .xls" onChange={e => { if (e.target.files) setFile(e.target.files[0]); setResultado(null); }} className="hidden" />
                                <span className="block text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors">
                                    {file ? <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-2"><DocumentTextIcon className="w-5 h-5"/> {file.name}</span> : "Seleccionar Excel"}
                                </span>
                            </label>

                            <button onClick={handleUpload} disabled={loading || !file} className={`w-full py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                                {loading ? 'Procesando...' : 'Iniciar Importación'}
                            </button>
                        </div>
                    </div>

                    {/* RESULTADOS */}
                    {resultado && (
                        <div className={`p-6 rounded-2xl border animate-in slide-in-from-bottom-4 shadow-sm dark:shadow-xl transition-colors ${resultado.importados > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-500/30'}`}>
                            <h4 className="text-slate-900 dark:text-white font-black mb-4 flex items-center gap-2 transition-colors">
                                {resultado.importados > 0 ? <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/> : <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400"/>}
                                Resultado
                            </h4>
                            
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-800 transition-colors">
                                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{resultado.importados || 0}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest transition-colors">Éxito</div>
                                </div>
                                <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-800 transition-colors">
                                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{Array.isArray(resultado.errores) ? resultado.errores.length : (resultado.errores ? 1 : 0)}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest transition-colors">Errores</div>
                                </div>
                            </div>

                            {resultado.errores && (
                                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 transition-colors">
                                    <p className="text-xs font-black text-rose-600 dark:text-rose-400 mb-3 uppercase tracking-widest">Detalles:</p>
                                    <ul className="space-y-2">
                                        {Array.isArray(resultado.errores) ? (
                                            resultado.errores.map((error, index) => (
                                                <li key={index} className="text-xs text-slate-700 dark:text-slate-300 border-l-2 border-rose-500/50 pl-3 transition-colors">
                                                    {typeof error === 'object' ? JSON.stringify(error) : String(error)}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-xs text-slate-700 dark:text-slate-300 border-l-2 border-rose-500/50 pl-3 transition-colors">
                                                {String(resultado.errores)}
                                            </li>
                                        )}
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
