import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    CloudArrowDownIcon, 
    CloudArrowUpIcon, 
    XMarkIcon, 
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    routerId: number; 
}

export default function ImportClientsModal({ isOpen, onClose, routerId }: Props) {
    const [step, setStep] = useState(1); 
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // Listas para los selectores
    const [redes, setRedes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]); // <--- NUEVO: Estado para planes
    
    // Selección del usuario
    const [config, setConfig] = useState({
        red_id: '',
        zona_id: '',
        plantilla_id: '',
        plan_id: '' // <--- NUEVO: Plan por defecto
    });

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null); 

    // Cargar listas al abrir el modal
    useEffect(() => {
        if (isOpen && routerId) {
            const loadOptions = async () => {
                setIsLoadingData(true);
                try {
                    // Cargamos las 4 listas necesarias (Agregamos Planes)
                    const [resRedes, resZonas, resPlantillas, resPlanes] = await Promise.all([
                        client.get(`/network/redes/router/${routerId}`),
                        client.get('/config/zonas'), 
                        client.get('/plantillas-facturacion/'),
                        client.get('/planes/') // Asumiendo que este endpoint devuelve todos los planes
                    ]);
                    
                    setRedes(resRedes.data);
                    setZonas(resZonas.data);
                    setPlantillas(resPlantillas.data);
                    
                    // Opcional: Filtrar planes que pertenezcan a este router si tu backend lo soporta
                    // const planesRouter = resPlanes.data.filter((p:any) => p.router_id === routerId);
                    setPlanes(resPlanes.data); 

                } catch (e) {
                    toast.error("Error al cargar las opciones de configuración");
                } finally {
                    setIsLoadingData(false);
                }
            };
            loadOptions();
            setStep(1);
            setFile(null);
            setResult(null);
            // Reset config
            setConfig({ red_id: '', zona_id: '', plantilla_id: '', plan_id: '' });
        }
    }, [isOpen, routerId]);

    // PASO 1: Descargar Plantilla Inteligente
    const handleDownload = async () => {
        // Validamos que se haya seleccionado todo, incluido el PLAN
        if (!config.red_id || !config.zona_id || !config.plantilla_id || !config.plan_id) {
            toast.error("Por favor selecciona Red, Zona, Plantilla y Plan por defecto.");
            return;
        }

        const loadingToast = toast.loading("Conectando al MikroTik y generando Excel...");
        try {
            // Enviamos también el plan_id en la URL
            const url = `/network/importar/plantilla-inteligente?router_id=${routerId}&red_id=${config.red_id}&zona_id=${config.zona_id}&plantilla_id=${config.plantilla_id}&plan_id=${config.plan_id}`;
            
            const response = await client.get(url, { responseType: 'blob' });
            
            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `Plantilla_Importacion_Router_${routerId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.dismiss(loadingToast);
            toast.success("Plantilla generada correctamente");
            setStep(2); 
        } catch (e) {
            toast.dismiss(loadingToast);
            toast.error("Error al generar Excel");
        }
    };

    // PASO 2: Subir Excel Lleno
    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        
        const formData = new FormData();
        formData.append('archivo', file);
        
        try {
            const res = await client.post(`/network/importar/procesar-excel?router_id=${routerId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setResult(res.data); 
            toast.success("Procesamiento terminado");
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error al procesar el archivo");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="text-xl font-bold text-white">Importador de Clientes</h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                </div>

                <div className="p-6">
                    {/* Barra de Progreso */}
                    {!result && (
                        <div className="flex items-center gap-2 mb-8 text-sm font-bold text-slate-500">
                            <span className={step === 1 ? "text-blue-400" : (step > 1 ? "text-emerald-500" : "")}>1. Configuración</span>
                            <span className="text-slate-700">→</span>
                            <span className={step === 2 ? "text-blue-400" : ""}>2. Carga de Datos</span>
                        </div>
                    )}

                    {/* VISTA DE RESULTADOS (FINAL) */}
                    {result ? (
                        <div className="space-y-6 text-center animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-white">¡Importación Completada!</h4>
                                <p className="text-slate-400 mt-2">
                                    Se han procesado <strong className="text-white">{result.importados}</strong> clientes exitosamente.
                                </p>
                            </div>

                            {result.errores && result.errores.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left max-h-40 overflow-y-auto">
                                    <p className="text-amber-400 text-xs font-bold mb-2 flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-4 h-4" /> Advertencias ({result.errores.length}):
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                                        {result.errores.map((err: string, i: number) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-4">
                                <button onClick={() => { onClose(); window.location.reload(); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition">
                                    Cerrar y Refrescar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: CONFIGURAR Y DESCARGAR */}
                            {step === 1 && (
                                <div className="space-y-5 animate-in slide-in-from-right">
                                    <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 mb-6">
                                        <p className="text-xs text-blue-300 leading-relaxed">
                                            <strong>¿Cómo funciona?</strong> Selecciona las reglas de negocio abajo. 
                                            Generaremos un Excel leyendo tu MikroTik actual.
                                        </p>
                                    </div>

                                    {isLoadingData ? (
                                        <div className="py-10 text-center text-slate-500">Cargando opciones...</div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">1. Asignar a Red (Pool IP)</label>
                                                <select className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                                    value={config.red_id} onChange={e => setConfig({...config, red_id: e.target.value})}>
                                                    <option value="">-- Selecciona Red --</option>
                                                    {redes.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.cidr})</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">2. Asignar a Zona</label>
                                                <select className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                                    value={config.zona_id} onChange={e => setConfig({...config, zona_id: e.target.value})}>
                                                    <option value="">-- Selecciona Zona --</option>
                                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">3. Plantilla de Facturación</label>
                                                <select className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                                    value={config.plantilla_id} onChange={e => setConfig({...config, plantilla_id: e.target.value})}>
                                                    <option value="">-- Selecciona Plantilla --</option>
                                                    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre} (Corte: {p.dia_corte})</option>)}
                                                </select>
                                            </div>

                                            {/* --- NUEVO SELECTOR DE PLAN --- */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">4. Plan de Internet (Por defecto)</label>
                                                <select className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                                    value={config.plan_id} onChange={e => setConfig({...config, plan_id: e.target.value})}>
                                                    <option value="">-- Selecciona Plan --</option>
                                                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.precio})</option>)}
                                                </select>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Si no podemos detectar el plan del cliente, usaremos este.
                                                </p>
                                            </div>

                                            <button 
                                                onClick={handleDownload}
                                                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
                                            >
                                                <CloudArrowDownIcon className="w-5 h-5" /> Descargar Plantilla Inteligente
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* PASO 2: SUBIR EXCEL */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right text-center">
                                    <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                        <DocumentTextIcon className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-lg font-bold text-white">Plantilla Generada</h4>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Abre el Excel descargado, verifica los planes sugeridos, guarda los cambios y súbelo aquí.
                                        </p>
                                    </div>

                                    <label className={`
                                        block w-full border-2 border-dashed border-slate-600 rounded-xl p-8 cursor-pointer transition-all
                                        ${file ? 'border-emerald-500 bg-emerald-500/5' : 'hover:border-blue-500 hover:bg-slate-800/50'}
                                    `}>
                                        <input 
                                            type="file" 
                                            accept=".xlsx, .xls" 
                                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                            className="hidden" 
                                        />
                                        <CloudArrowUpIcon className={`w-10 h-10 mx-auto mb-2 ${file ? 'text-emerald-500' : 'text-slate-500'}`} />
                                        <span className="text-slate-300 font-medium block">
                                            {file ? file.name : "Click para seleccionar archivo"}
                                        </span>
                                    </label>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setStep(1)} 
                                            className="flex-1 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl font-bold transition"
                                        >
                                            Atrás
                                        </button>
                                        <button 
                                            onClick={handleUpload}
                                            disabled={!file || uploading}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploading ? 'Procesando...' : 'Iniciar Importación'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}