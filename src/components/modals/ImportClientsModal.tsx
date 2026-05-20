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
    
    const [redes, setRedes] = useState<any[]>([]);
    const [zonas, setZonas] = useState<any[]>([]);
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [planes, setPlanes] = useState<any[]>([]); 
    const [olts, setOlts] = useState<any[]>([]); 
    
    const [config, setConfig] = useState({
        red_id: '', zona_id: '', plantilla_id: '', plan_id: '', olt_id: ''
    });

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null); 

    useEffect(() => {
        if (isOpen && routerId) {
            const loadOptions = async () => {
                setIsLoadingData(true);
                try {
                    const [resRedes, resZonas, resPlantillas, resPlanes, resOlts] = await Promise.all([
                        client.get(`/network/redes/router/${routerId}`),
                        client.get('/config/zonas'), 
                        client.get('/plantillas-facturacion/'),
                        client.get('/planes/'), 
                        client.get('/olts/')
                    ]);
                    
                    setRedes(resRedes.data);
                    setZonas(resZonas.data);
                    setPlantillas(resPlantillas.data);
                    setPlanes(resPlanes.data); 
                    setOlts(resOlts.data);

                } catch (e) {
                    toast.error("Error al cargar las opciones");
                } finally {
                    setIsLoadingData(false);
                }
            };
            loadOptions();
            setStep(1); setFile(null); setResult(null);
            setConfig({ red_id: '', zona_id: '', plantilla_id: '', plan_id: '', olt_id: '' });
        }
    }, [isOpen, routerId]);

    const handleDownload = async () => {
        if (!config.red_id || !config.zona_id || !config.plantilla_id || !config.plan_id) {
            toast.error("Por favor selecciona todos los campos requeridos.");
            return;
        }

        const loadingToast = toast.loading("Generando Excel...");
        try {
            const oltParam = config.olt_id || 0;
            const url = `/network/importar/plantilla-inteligente?router_id=${routerId}&red_id=${config.red_id}&zona_id=${config.zona_id}&plantilla_id=${config.plantilla_id}&plan_id=${config.plan_id}&olt_id=${oltParam}`;
            
            const response = await client.get(url, { responseType: 'blob' });
            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `Plantilla_Importacion_Router_${routerId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.dismiss(loadingToast);
            toast.success("Plantilla generada");
            setStep(2); 
        } catch (e) {
            toast.dismiss(loadingToast);
            toast.error("Error al generar la plantilla");
        }
    };

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
            toast.error(e.response?.data?.detail || "Error al procesar archivo");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-colors">
            <div className="bg-white dark:bg-[#12131a] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#16171d] transition-colors">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white transition-colors">Importador de Clientes</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6">
                    {!result && (
                        <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className={step === 1 ? "text-blue-600 dark:text-blue-400" : (step > 1 ? "text-emerald-600 dark:text-emerald-500" : "")}>1. Configuración</span>
                            <span className="text-slate-300 dark:text-slate-700">→</span>
                            <span className={step === 2 ? "text-blue-600 dark:text-blue-400" : ""}>2. Carga</span>
                        </div>
                    )}

                    {result ? (
                        <div className="space-y-6 text-center animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto transition-colors">
                                <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">¡Importación Completada!</h4>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">
                                    Se han procesado <strong className="text-slate-900 dark:text-white">{result.importados}</strong> clientes exitosamente.
                                </p>
                            </div>

                            {result.errores && result.errores.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-left max-h-40 overflow-y-auto custom-scrollbar transition-colors">
                                    <p className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-4 h-4" /> Advertencias ({result.errores.length}):
                                    </p>
                                    <ul className="text-[11px] text-amber-800 dark:text-amber-200/70 space-y-1 list-disc pl-4 font-mono">
                                        {result.errores.map((err: string, i: number) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button onClick={() => { onClose(); window.location.reload(); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition shadow-md active:scale-95 uppercase tracking-widest text-xs">
                                Cerrar y Refrescar
                            </button>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 mb-2 transition-colors">
                                        <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                            Selecciona las reglas base para generar el Excel de carga.
                                        </p>
                                    </div>

                                    {isLoadingData ? (
                                        <div className="py-10 text-center text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Cargando módulos...</div>
                                    ) : (
                                        <>
                                            {[
                                                { label: '1. Red (Pool IP)', val: config.red_id, key: 'red_id', options: redes },
                                                { label: '2. Zona', val: config.zona_id, key: 'zona_id', options: zonas },
                                                { label: '3. Plantilla', val: config.plantilla_id, key: 'plantilla_id', options: plantillas },
                                                { label: '4. Plan Internet', val: config.plan_id, key: 'plan_id', options: planes }
                                            ].map((input, idx) => (
                                                <div key={idx}>
                                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block tracking-widest">{input.label} *</label>
                                                    <select className="w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                                        value={input.val} onChange={e => setConfig({...config, [input.key]: e.target.value})}>
                                                        <option value="">-- Selecciona --</option>
                                                        {input.options.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                                    </select>
                                                </div>
                                            ))}

                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-xl mt-4 transition-colors">
                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-500 uppercase mb-1 block tracking-widest">5. OLT (Opcional)</label>
                                                <select className="w-full bg-white dark:bg-[#0b0c10] border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                                                    value={config.olt_id} onChange={e => setConfig({...config, olt_id: e.target.value})}>
                                                    <option value="">-- Sin asignar --</option>
                                                    {olts.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                                                </select>
                                            </div>

                                            <button onClick={handleDownload} className="w-full mt-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm uppercase tracking-widest text-xs">
                                                <CloudArrowDownIcon className="w-5 h-5" /> Descargar Plantilla
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right text-center">
                                    <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-500/20 transition-colors">
                                        <DocumentTextIcon className="w-8 h-8" />
                                    </div>
                                    <label className={`block w-full border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500'}`}>
                                        <input type="file" accept=".xlsx, .xls" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} className="hidden" />
                                        <CloudArrowUpIcon className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <span className="font-black text-xs text-slate-600 dark:text-slate-300 uppercase tracking-widest">{file ? file.name : "Subir archivo lleno"}</span>
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => setStep(1)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest transition">Atrás</button>
                                        <button onClick={handleUpload} disabled={!file || uploading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-md uppercase tracking-widest text-xs transition active:scale-95 disabled:opacity-50">
                                            {uploading ? 'Procesando...' : 'Importar'}
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