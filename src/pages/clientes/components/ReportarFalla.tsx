import { useEffect, useState } from 'react';
import { ArrowPathIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { CATEGORIAS_FALLA } from '@/utils/categoriasFalla';

interface EstadoOnuData {
    disponible: boolean;
    error?: string;
    online?: boolean;
    rx?: number | null;
    ultima_caida?: string | null;
    causa_ultima_caida?: string | null;
}

interface ReporteAbierto {
    id: number;
    estado: string;
    categoria: string;
    tecnico: string | null;
}

interface Contexto {
    abierta: ReporteAbierto | null;
    potencia_habitual: number | null;
}

interface Tecnico {
    id: number;
    nombre_completo?: string;
    usuario: string;
}

// Igual que en el servidor: peor que -27 dBm la conexión empieza a fallar.
const UMBRAL_DEBIL = -27;
const CAIDA_ALERTA = 3;

const campo = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950';
const etiqueta = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400';

/** Lo que se vio a distancia, para que el técnico llegue sabiendo qué buscar. */
function textoRevision(estado: EstadoOnuData | null, habitual: number | null): string {
    if (!estado?.disponible) return '';
    const hora = new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const partes = [estado.online ? 'ONU en línea' : 'ONU caída'];
    if (estado.rx != null) {
        partes.push(`potencia ${estado.rx.toFixed(2)} dBm${habitual != null ? ` (normal ${habitual.toFixed(2)})` : ''}`);
    } else if (!estado.online) {
        partes.push('sin señal');
    }
    if (estado.ultima_caida || estado.causa_ultima_caida) {
        partes.push(`última caída ${[estado.ultima_caida, estado.causa_ultima_caida].filter(Boolean).join(', ')}`);
    }
    return `Revisión remota (${hora}): ${partes.join(' · ')}.`;
}

/** Categoría y prioridad que sugiere la revisión; el admin puede cambiarlas. */
function sugerencia(estado: EstadoOnuData | null, habitual: number | null) {
    if (!estado?.disponible) return null;
    const causa = (estado.causa_ultima_caida || '').toLowerCase();
    const rx = estado.rx;
    const debil = rx != null && (rx < UMBRAL_DEBIL || (habitual != null && habitual - rx >= CAIDA_ALERTA));
    if (!estado.online && /fibra|señal|los\b/.test(causa)) return { categoria: 'cable_roto', prioridad: 'alta', canal: 'monitoreo' };
    if (debil) return { categoria: 'potencia_baja', prioridad: rx != null && rx < UMBRAL_DEBIL ? 'alta' : 'normal', canal: 'monitoreo' };
    if (!estado.online) return { categoria: 'sin_internet', prioridad: 'alta', canal: 'telefono' };
    return null;
}

/** Reporte de falla para mandar a un técnico, con lo que se revisó a distancia. */
export default function ReportarFalla({ clienteId, servicioId, onListo }: {
    clienteId: number;
    servicioId: number | null;
    onListo: () => void;
}) {
    const [contexto, setContexto] = useState<Contexto | null>(null);
    const [estado, setEstado] = useState<EstadoOnuData | null>(null);
    const [revisando, setRevisando] = useState(true);
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [form, setForm] = useState({
        categoria: 'sin_internet',
        prioridad: 'normal',
        canal: 'telefono',
        tecnico_id: '',
        fecha_programada: '',
        instrucciones: '',
        revision: '',
    });

    useEffect(() => {
        let vigente = true;
        client.get<Tecnico[]>('/bajas/tecnicos/disponibles')
            .then(({ data }) => vigente && setTecnicos(data))
            .catch(() => undefined);
        // La OLT puede tardar; el formulario se puede llenar mientras tanto.
        Promise.all([
            client.get<Contexto>(`/soporte/clientes/${clienteId}/contexto`).then((r) => r.data).catch(() => ({ abierta: null, potencia_habitual: null })),
            client.get<EstadoOnuData>(`/ftth/clientes/${clienteId}/estado-onu`).then((r) => r.data)
                .catch((error) => ({ disponible: false, error: apiErrorMessage(error, 'No se pudo consultar la ONU') })),
        ]).then(([ctx, onu]) => {
            if (!vigente) return;
            setContexto(ctx);
            setEstado(onu);
            setRevisando(false);
            const sugerida = sugerencia(onu, ctx.potencia_habitual);
            setForm((actual) => ({
                ...actual,
                ...(sugerida ?? {}),
                revision: actual.revision || textoRevision(onu, ctx.potencia_habitual),
            }));
        });
        return () => { vigente = false; };
    }, [clienteId]);

    const enviar = async () => {
        if (form.instrucciones.trim().length < 5) {
            toast.error('Escribe qué debe hacer el técnico');
            return;
        }
        setEnviando(true);
        try {
            const descripcion = [form.instrucciones.trim(), form.revision.trim()].filter(Boolean).join('\n\n').slice(0, 2000);
            const { data } = await client.post<{ id: number }>('/soporte/incidencias', {
                cliente_id: clienteId,
                servicio_id: servicioId,
                categoria: form.categoria,
                prioridad: form.prioridad,
                canal_reporte: form.canal,
                tecnico_id: form.tecnico_id ? Number(form.tecnico_id) : null,
                fecha_programada: form.fecha_programada || null,
                descripcion,
            });
            toast.success(`Reporte #${data.id} creado${form.tecnico_id ? ' · se le avisó al técnico por WhatsApp' : ''}`, { duration: 6000 });
            onListo();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo crear el reporte'), { duration: 8000 });
        } finally {
            setEnviando(false);
        }
    };

    const abierta = contexto?.abierta;
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2 dark:bg-orange-500/10">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Reportar falla</h3>
                    <p className="text-xs text-slate-500">Se manda al técnico con lo que revisaste a distancia.</p>
                </div>
            </div>

            {abierta && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    Ya tiene el reporte #{abierta.id} ({CATEGORIAS_FALLA[abierta.categoria] || abierta.categoria}, {abierta.estado.replace('_', ' ')}
                    {abierta.tecnico ? `, con ${abierta.tecnico}` : ', sin técnico'}). Revísalo en Órdenes antes de levantar otro.
                </p>
            )}

            <div>
                <label className={etiqueta}>Revisión remota</label>
                {revisando ? (
                    <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" /> Consultando la ONU en la OLT…
                    </p>
                ) : (
                    <>
                        {!estado?.disponible && <p className="mb-1 text-xs text-rose-600 dark:text-rose-400">{estado?.error}</p>}
                        <textarea aria-label="Revisión remota" rows={3} value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="Lo que viste (potencia, si la ONU está caída…)" className={campo} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={etiqueta}>Falla</label>
                    <select aria-label="Falla" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={campo}>
                        {Object.entries(CATEGORIAS_FALLA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                    </select>
                </div>
                <div>
                    <label className={etiqueta}>Prioridad</label>
                    <select aria-label="Prioridad" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className={campo}>
                        <option value="baja">Baja</option>
                        <option value="normal">Normal</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                    </select>
                </div>
                <div>
                    <label className={etiqueta}>Técnico</label>
                    <select aria-label="Técnico" value={form.tecnico_id} onChange={(e) => setForm({ ...form, tecnico_id: e.target.value })} className={campo}>
                        <option value="">Sin asignar</option>
                        {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre_completo || t.usuario}</option>)}
                    </select>
                </div>
                <div>
                    <label className={etiqueta}>¿Cómo se supo?</label>
                    <select aria-label="Cómo se supo" value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className={campo}>
                        <option value="monitoreo">Lo detectamos</option>
                        <option value="telefono">Llamó</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="presencial">En oficina</option>
                    </select>
                </div>
            </div>

            <div>
                <label className={etiqueta}>Visita (opcional)</label>
                <input aria-label="Visita" type="datetime-local" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} className={campo} />
            </div>

            <div>
                <label className={etiqueta}>Qué debe hacer el técnico *</label>
                <textarea aria-label="Qué debe hacer el técnico" rows={3} value={form.instrucciones} onChange={(e) => setForm({ ...form, instrucciones: e.target.value })} placeholder="Ej.: revisar la fibra desde la caja hasta la casa y limpiar conectores" className={campo} />
            </div>

            <button
                type="button"
                disabled={enviando}
                onClick={() => void enviar()}
                className="w-full rounded-xl bg-orange-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-orange-500 active:scale-95 disabled:opacity-50"
            >
                {enviando ? 'Enviando…' : form.tecnico_id ? 'Crear y avisar al técnico' : 'Crear reporte'}
            </button>
        </div>
    );
}
