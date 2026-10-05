import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

export interface SolicitudEditable {
    id: number;
    nombre: string;
    telefono: string;
    direccion?: string | null;
    esProspecto: boolean;
    zona_id?: number | null;
    plan_id?: number | null;
    tecnico?: { id?: number } | null;
    fecha_programada?: string | null;
}

interface Zona { id: number; nombre: string; router_id?: number | null }
interface Plan { id: number; nombre: string; precio?: number }
interface Tecnico { id: number; nombre_completo?: string | null; usuario: string }

interface Props {
    solicitud: SolicitudEditable | null;
    zonas: Zona[];
    tecnicos: Tecnico[];
    onClose: () => void;
    onSaved: () => void;
}

// Horario de visitas cada media hora, de 8:00 a 19:30.
const HORAS = Array.from({ length: 24 }, (_, i) => {
    const h = 8 + Math.floor(i / 2);
    return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

const fechaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function diasRapidos() {
    const hoy = new Date();
    return ['Hoy', 'Mañana', 'Pasado mañana'].map((texto, i) => {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() + i);
        return { texto, valor: fechaLocal(d) };
    });
}

const etiqueta = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';
const campo = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export default function EditarSolicitudModal({ solicitud, zonas, tecnicos, onClose, onSaved }: Props) {
    const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', zona_id: '', plan_id: '', tecnico_id: '', dia: '', hora: '' });
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [guardando, setGuardando] = useState(false);
    const rapidos = useMemo(diasRapidos, []);

    useEffect(() => {
        if (!solicitud) return;
        const fecha = solicitud.fecha_programada || '';
        setForm({
            nombre: solicitud.nombre,
            telefono: solicitud.telefono,
            direccion: solicitud.direccion || '',
            zona_id: solicitud.zona_id ? String(solicitud.zona_id) : '',
            plan_id: solicitud.plan_id ? String(solicitud.plan_id) : '',
            tecnico_id: solicitud.tecnico?.id ? String(solicitud.tecnico.id) : '',
            dia: fecha.slice(0, 10),
            hora: fecha.slice(11, 16),
        });
    }, [solicitud]);

    // Los planes son los del MikroTik de la zona.
    const routerZona = zonas.find((z) => String(z.id) === form.zona_id)?.router_id;
    useEffect(() => {
        if (!routerZona) {
            setPlanes([]);
            return;
        }
        client.get<Plan[]>(`/planes/router/${routerZona}`).then((r) => setPlanes(r.data)).catch(() => setPlanes([]));
    }, [routerZona]);

    if (!solicitud) return null;
    const cambiar = (cambios: Partial<typeof form>) => setForm((f) => ({ ...f, ...cambios }));

    const guardar = async (e: FormEvent) => {
        e.preventDefault();
        if (form.hora && !form.dia) return toast.error('Elige el día de la visita');
        setGuardando(true);
        try {
            await client.patch(`/ordenes/${solicitud.id}`, {
                ...(solicitud.esProspecto ? {
                    prospecto_nombre: form.nombre.trim(),
                    prospecto_telefono: form.telefono.trim() || null,
                    prospecto_direccion: form.direccion.trim() || null,
                } : {}),
                zona_id: form.zona_id ? Number(form.zona_id) : null,
                plan_id: form.plan_id ? Number(form.plan_id) : null,
                tecnico_id: form.tecnico_id ? Number(form.tecnico_id) : null,
                fecha_programada: form.dia ? `${form.dia}T${form.hora || '09:00'}:00` : null,
            });
            toast.success('Solicitud actualizada');
            onSaved();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={`Editar solicitud de ${solicitud.nombre}`} className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
            <form onSubmit={guardar} className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Solicitud #{solicitud.id}</p>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Editar y agendar</h2>
                    </div>
                    <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto px-5 py-4">
                    <section className="space-y-3">
                        {solicitud.esProspecto ? (
                            <>
                                <label className="block"><span className={etiqueta}>Nombre</span>
                                    <input required minLength={2} value={form.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={campo} /></label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="block"><span className={etiqueta}>Teléfono</span>
                                        <input inputMode="tel" value={form.telefono} onChange={(e) => cambiar({ telefono: e.target.value })} className={campo} /></label>
                                    <label className="block"><span className={etiqueta}>Zona</span>
                                        <select value={form.zona_id} onChange={(e) => cambiar({ zona_id: e.target.value, plan_id: '' })} className={campo}>
                                            <option value="">Sin zona</option>
                                            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                        </select></label>
                                </div>
                                <label className="block"><span className={etiqueta}>Dirección y referencias</span>
                                    <textarea rows={2} value={form.direccion} onChange={(e) => cambiar({ direccion: e.target.value })} className={`${campo} py-2`} /></label>
                            </>
                        ) : (
                            <label className="block"><span className={etiqueta}>Zona</span>
                                <select value={form.zona_id} onChange={(e) => cambiar({ zona_id: e.target.value, plan_id: '' })} className={campo}>
                                    <option value="">Sin zona</option>
                                    {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                </select></label>
                        )}
                        <label className="block"><span className={etiqueta}>Plan que pidió</span>
                            <select value={form.plan_id} disabled={!form.zona_id} onChange={(e) => cambiar({ plan_id: e.target.value })} className={campo}>
                                <option value="">{form.zona_id ? 'Por definir' : 'Elige primero la zona'}</option>
                                {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.precio ? ` · $${p.precio}` : ''}</option>)}
                            </select></label>
                    </section>

                    <section className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
                        <label className="block"><span className={etiqueta}>Técnico</span>
                            <select value={form.tecnico_id} onChange={(e) => cambiar({ tecnico_id: e.target.value })} className={campo}>
                                <option value="">Sin asignar</option>
                                {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre_completo || t.usuario}</option>)}
                            </select></label>
                        <div>
                            <span className={etiqueta}>Día de la visita</span>
                            <div className="flex flex-wrap gap-2">
                                {rapidos.map((d) => (
                                    <button key={d.valor} type="button" aria-pressed={form.dia === d.valor} onClick={() => cambiar({ dia: d.valor, hora: form.hora || '09:00' })}
                                        className={`rounded-xl border px-3 py-2 text-xs font-black transition ${form.dia === d.valor ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                                        {d.texto}
                                    </button>
                                ))}
                                <input type="date" aria-label="Otro día" value={form.dia} onChange={(e) => cambiar({ dia: e.target.value, hora: form.hora || '09:00' })}
                                    className="min-h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block"><span className={etiqueta}>Hora</span>
                                <select value={form.hora} disabled={!form.dia} onChange={(e) => cambiar({ hora: e.target.value })} className={campo}>
                                    <option value="">—</option>
                                    {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                                </select></label>
                            <div className="flex items-end">
                                {form.dia && (
                                    <button type="button" onClick={() => cambiar({ dia: '', hora: '' })} className="min-h-11 w-full rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                        Quitar visita
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500">El técnico ve la visita en su agenda, ordenada por hora, y aquí aparece en "Visitas hoy".</p>
                    </section>
                </div>

                <div className="flex gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-800">
                    <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                    <button disabled={guardando} className="h-11 flex-[2] rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-60">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>,
        document.body,
    );
}
