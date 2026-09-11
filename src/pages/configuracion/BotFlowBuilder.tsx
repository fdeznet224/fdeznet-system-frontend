import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ChatBubbleBottomCenterTextIcon, CursorArrowRaysIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import client from '@/api/axios';

type Scope = 'cliente' | 'tecnico';
type NodeType = 'trigger' | 'message' | 'menu' | 'action' | 'end';
type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
interface FlowNode { id: string; type: NodeType; title: string; text: string; action?: string | null; x: number; y: number }
interface FlowEdge { id: string; source: string; target: string; label: string }
interface ScheduleDay { activo: boolean; inicio: string; fin: string }
interface OutOfHoursConfig { habilitado: boolean; zona_horaria: string; horario: Record<DayKey, ScheduleDay>; mensaje: string }
interface VisualFlow { alcance: Scope; nombre: string; activo: boolean; comando: string; nodos: FlowNode[]; conexiones: FlowEdge[]; fuera_horario?: OutOfHoursConfig }

const weekdays: Array<[DayKey, string]> = [
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];

const publicActions = [
  ['reportar_pago', 'Reportar y validar pago'], ['promesa_pago', 'Registrar promesa de pago'],
  ['estado_servicio', 'Consultar servicio y saldo'], ['datos_pago', 'Enviar datos bancarios'],
  ['diagnostico_tecnico', 'Diagnóstico del propio cliente'],
];
const techActions = [
  ['tecnico_diagnostico', 'PPPoE, ONU, potencia y ficha completa'],
  ['tecnico_pppoe', 'Verificar solamente sesión PPPoE'],
  ['tecnico_potencia', 'Verificar ONU y potencia óptica'],
  ['tecnico_red', 'NAP, puerto, OLT y datos de red'],
];
const nodeStyle: Record<NodeType, string> = {
  trigger: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
  message: 'border-blue-400 bg-blue-50 dark:bg-blue-950/60',
  menu: 'border-violet-400 bg-violet-50 dark:bg-violet-950/60',
  action: 'border-amber-400 bg-amber-50 dark:bg-amber-950/60',
  end: 'border-rose-400 bg-rose-50 dark:bg-rose-950/60',
};
const nodeIcon: Record<NodeType, string> = { trigger: '⚡', message: '💬', menu: '🔀', action: '⚙️', end: '🏁' };

function apiError(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || 'Dato inválido').join('. ');
  return 'No fue posible guardar el flujo';
}

export default function BotFlowBuilder() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<Scope>('cliente');
  const [flow, setFlow] = useState<VisualFlow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFlow(null); setSelectedId(null);
    client.get<VisualFlow>(`/configuracion/bot-flujos/${scope}`).then(({ data }) => setFlow(data)).catch(() => toast.error('No se pudo cargar el flujo visual'));
  }, [scope]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(4760, event.clientX - rect.left + canvas.scrollLeft - drag.offsetX));
      const y = Math.max(0, Math.min(2860, event.clientY - rect.top + canvas.scrollTop - drag.offsetY));
      setFlow((current) => current ? { ...current, nodos: current.nodos.map((node) => node.id === drag.id ? { ...node, x, y } : node) } : current);
    };
    const stop = () => setDrag(null);
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
  }, [drag]);

  const selected = useMemo(() => flow?.nodos.find((node) => node.id === selectedId) || null, [flow, selectedId]);
  const actions = scope === 'cliente' ? publicActions : techActions;
  const updateNode = (changes: Partial<FlowNode>) => {
    if (!selectedId) return;
    setFlow((current) => current ? { ...current, nodos: current.nodos.map((node) => node.id === selectedId ? { ...node, ...changes } : node) } : current);
  };
  const updateOutOfHours = (changes: Partial<OutOfHoursConfig>) => {
    setFlow((current) => current?.fuera_horario ? {
      ...current,
      fuera_horario: { ...current.fuera_horario, ...changes },
    } : current);
  };
  const updateScheduleDay = (day: DayKey, changes: Partial<ScheduleDay>) => {
    setFlow((current) => current?.fuera_horario ? {
      ...current,
      fuera_horario: {
        ...current.fuera_horario,
        horario: {
          ...current.fuera_horario.horario,
          [day]: { ...current.fuera_horario.horario[day], ...changes },
        },
      },
    } : current);
  };
  const addNode = (type: Exclude<NodeType, 'trigger'>) => {
    if (!flow) return;
    const id = `${type}_${Date.now().toString(36)}`;
    const node: FlowNode = { id, type, title: type === 'message' ? 'Nuevo mensaje' : type === 'menu' ? 'Nuevo menú' : type === 'action' ? 'Acción del sistema' : 'Finalizar', text: type === 'message' || type === 'menu' ? 'Escribe aquí el mensaje…' : '', action: type === 'action' ? actions[0][0] : null, x: 320 + (flow.nodos.length % 4) * 250, y: 80 + (flow.nodos.length % 5) * 130 };
    setFlow({ ...flow, nodos: [...flow.nodos, node] }); setSelectedId(id);
  };
  const deleteNode = () => {
    if (!flow || !selected || selected.type === 'trigger') return;
    setFlow({ ...flow, nodos: flow.nodos.filter((node) => node.id !== selected.id), conexiones: flow.conexiones.filter((edge) => edge.source !== selected.id && edge.target !== selected.id) }); setSelectedId(null);
  };
  const addConnection = () => {
    if (!flow || !selected) return;
    const candidate = flow.nodos.find((node) => node.id !== selected.id); if (!candidate) return;
    setFlow({ ...flow, conexiones: [...flow.conexiones, { id: `edge_${Date.now().toString(36)}`, source: selected.id, target: candidate.id, label: selected.type === 'menu' ? 'Nueva opción' : '' }] });
  };
  const updateEdge = (id: string, changes: Partial<FlowEdge>) => setFlow((current) => current ? { ...current, conexiones: current.conexiones.map((edge) => edge.id === id ? { ...edge, ...changes } : edge) } : current);
  const removeEdge = (id: string) => setFlow((current) => current ? { ...current, conexiones: current.conexiones.filter((edge) => edge.id !== id) } : current);
  const save = async () => {
    if (!flow) return; setSaving(true);
    try {
      const { alcance: _scope, ...payload } = flow; void _scope;
      const { data } = await client.put<VisualFlow>(`/configuracion/bot-flujos/${scope}`, payload); setFlow(data); toast.success('Flujo visual guardado y activado');
    } catch (error) { toast.error(apiError(error)); } finally { setSaving(false); }
  };

  if (!flow) return <div className="p-8 text-center text-slate-500">Cargando constructor…</div>;
  const outgoing = selected ? flow.conexiones.filter((edge) => edge.source === selected.id) : [];
  return <div className="mx-auto max-w-[1700px] space-y-4 p-4 pb-10 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button onClick={() => navigate('/admin/configuracion')} className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><ArrowLeftIcon className="h-5 w-5" /></button><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Constructor visual del bot</h1><p className="text-sm text-slate-500">Crea conversaciones conectando bloques, como en n8n.</p></div></div>
      <div className="flex items-center gap-2"><button onClick={() => setScope('cliente')} className={`rounded-xl px-4 py-2 text-sm font-black ${scope === 'cliente' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>Bot clientes</button><button onClick={() => setScope('tecnico')} className={`rounded-xl px-4 py-2 text-sm font-black ${scope === 'tecnico' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>Bot técnicos</button><button disabled={saving} onClick={() => void save()} className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button></div>
    </div>
    {scope === 'cliente' && flow.fuera_horario && <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/70 dark:bg-[#111218]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-black text-slate-900 dark:text-white">🌙 Automatización fuera de horario</h2><p className="mt-1 text-sm text-slate-500">Define cuándo el bot debe contestar automáticamente y qué información mostrará.</p></div>
        <label className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"><input type="checkbox" checked={flow.fuera_horario.habilitado} onChange={(event) => updateOutOfHours({ habilitado: event.target.checked })} className="h-5 w-5 rounded" /> Responder automáticamente</label>
      </div>
      <div className={`mt-5 space-y-5 ${flow.fuera_horario.habilitado ? '' : 'pointer-events-none opacity-50'}`}>
        <div className="max-w-md"><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Zona horaria de la empresa</label><input list="bot-timezones" value={flow.fuera_horario.zona_horaria} onChange={(event) => updateOutOfHours({ zona_horaria: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /><datalist id="bot-timezones"><option value="America/Mexico_City" /><option value="America/Cancun" /><option value="America/Monterrey" /><option value="America/Chihuahua" /><option value="America/Hermosillo" /><option value="America/Tijuana" /><option value="America/Bogota" /><option value="America/Lima" /><option value="America/Guatemala" /></datalist></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{weekdays.map(([day, label]) => { const rule = flow.fuera_horario!.horario[day]; return <div key={day} className={`rounded-xl border p-3 ${rule.activo ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'}`}><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={rule.activo} onChange={(event) => updateScheduleDay(day, { activo: event.target.checked })} className="h-4 w-4 rounded" />{label}</label><div className={`mt-3 grid grid-cols-2 gap-2 ${rule.activo ? '' : 'pointer-events-none opacity-40'}`}><label className="text-[9px] font-black uppercase text-slate-500">Abre<input type="time" value={rule.inicio} onChange={(event) => updateScheduleDay(day, { inicio: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-[9px] font-black uppercase text-slate-500">Cierra<input type="time" value={rule.fin} onChange={(event) => updateScheduleDay(day, { fin: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-950" /></label></div>{!rule.activo && <p className="mt-3 text-center text-[10px] font-bold text-slate-500">Cerrado</p>}</div>; })}</div>
        <div><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mensaje que recibirá el cliente</label><textarea rows={5} maxLength={1000} value={flow.fuera_horario.mensaje} onChange={(event) => updateOutOfHours({ mensaje: event.target.value })} className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900" /><p className="mt-2 text-xs text-slate-500">Variables disponibles: <code className="font-bold text-indigo-600">{'{empresa}'}</code>, <code className="font-bold text-indigo-600">{'{asistente}'}</code> y <code className="font-bold text-indigo-600">{'{horario}'}</code>.</p></div>
      </div>
    </section>}
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(600px,1fr)_330px]">
      <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111218]">
        <div><label className="text-[10px] font-black uppercase text-slate-500">Nombre del flujo</label><input value={flow.nombre} onChange={(e) => setFlow({ ...flow, nombre: e.target.value })} className="mt-1 w-full rounded-lg border bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></div>
        <div><label className="text-[10px] font-black uppercase text-slate-500">Comando de inicio</label><input value={flow.comando} onChange={(e) => setFlow({ ...flow, comando: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className="mt-1 w-full rounded-lg border bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></div>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={flow.activo} onChange={(e) => setFlow({ ...flow, activo: e.target.checked })} className="h-5 w-5 rounded" /> Flujo activo</label><hr className="border-slate-200 dark:border-slate-800" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Agregar bloque</p>
        {(['message', 'menu', 'action', 'end'] as const).map((type) => <button key={type} onClick={() => addNode(type)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left text-sm font-bold hover:border-blue-400 dark:border-slate-700"><span>{nodeIcon[type]}</span>{type === 'message' ? 'Mensaje' : type === 'menu' ? 'Menú / opciones' : type === 'action' ? 'Acción del sistema' : 'Finalizar'}</button>)}
        {scope === 'tecnico' && <div className="rounded-xl bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">Autoriza cada número en <button onClick={() => navigate('/admin/configuracion/usuarios')} className="font-black underline">Usuarios del sistema</button>. Comando inicial: <strong>tecnico</strong>.</div>}
      </aside>
      <div ref={canvasRef} className="relative h-[720px] overflow-auto rounded-2xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-[#090b10]" style={{ backgroundImage: 'radial-gradient(circle, rgba(100,116,139,.35) 1px, transparent 1px)', backgroundSize: '22px 22px' }}><div className="relative h-[3000px] w-[5000px]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#64748b" /></marker></defs>{flow.conexiones.map((edge) => { const source = flow.nodos.find((node) => node.id === edge.source); const target = flow.nodos.find((node) => node.id === edge.target); if (!source || !target) return null; const x1 = source.x + 210, y1 = source.y + 48, x2 = target.x, y2 = target.y + 48, bend = Math.max(50, Math.abs(x2 - x1) / 2); return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} fill="none" stroke="#64748b" strokeWidth="2.5" markerEnd="url(#arrow)" />; })}</svg>
        {flow.nodos.map((node) => <button key={node.id} onPointerDown={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setDrag({ id: node.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }); setSelectedId(node.id); }} onClick={() => setSelectedId(node.id)} style={{ left: node.x, top: node.y }} className={`absolute w-[210px] cursor-grab select-none rounded-2xl border-2 p-3 text-left shadow-lg active:cursor-grabbing ${nodeStyle[node.type]} ${selectedId === node.id ? 'ring-4 ring-blue-500/30' : ''}`}><div className="flex items-center justify-between"><span className="text-lg">{nodeIcon[node.type]}</span><CursorArrowRaysIcon className="h-4 w-4 text-slate-400" /></div><div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{node.title}</div><div className="mt-1 line-clamp-2 text-[10px] text-slate-500">{node.type === 'action' ? actions.find(([id]) => id === node.action)?.[1] : node.text || node.type}</div><span className="absolute -right-2 top-10 h-4 w-4 rounded-full border-2 border-white bg-slate-500" /></button>)}
      </div></div>
      <aside className="h-fit max-h-[720px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111218]">{!selected ? <div className="py-12 text-center text-sm text-slate-500"><ChatBubbleBottomCenterTextIcon className="mx-auto mb-3 h-10 w-10" />Selecciona un bloque para editarlo.</div> : <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-black text-slate-900 dark:text-white">{nodeIcon[selected.type]} Configurar bloque</h2>{selected.type !== 'trigger' && <button onClick={deleteNode} className="rounded-lg bg-rose-500/10 p-2 text-rose-600"><TrashIcon className="h-4 w-4" /></button>}</div>
        <div><label className="text-[10px] font-black uppercase text-slate-500">Título interno</label><input value={selected.title} onChange={(e) => updateNode({ title: e.target.value })} className="mt-1 w-full rounded-lg border bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900" /></div>
        {(selected.type === 'message' || selected.type === 'menu') && <div><label className="text-[10px] font-black uppercase text-slate-500">Mensaje para WhatsApp</label><textarea rows={5} maxLength={1000} value={selected.text} onChange={(e) => updateNode({ text: e.target.value })} className="mt-1 w-full resize-none rounded-lg border bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></div>}
        {selected.type === 'action' && <div><label className="text-[10px] font-black uppercase text-slate-500">Herramienta del sistema</label><select value={selected.action || ''} onChange={(e) => updateNode({ action: e.target.value })} className="mt-1 w-full rounded-lg border bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-900">{actions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>}
        {selected.type !== 'action' && selected.type !== 'end' && <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase text-slate-500">Conexiones de salida</h3><button onClick={addConnection} className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600"><PlusIcon className="h-4 w-4" /></button></div>{outgoing.map((edge) => <div key={edge.id} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">{selected.type === 'menu' && <input value={edge.label} maxLength={80} onChange={(e) => updateEdge(edge.id, { label: e.target.value })} placeholder="Texto de la opción" className="w-full rounded-lg border bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900" />}<div className="flex gap-2"><select value={edge.target} onChange={(e) => updateEdge(edge.id, { target: e.target.value })} className="min-w-0 flex-1 rounded-lg border bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900">{flow.nodos.filter((node) => node.id !== selected.id).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select><button onClick={() => removeEdge(edge.id)} className="text-rose-500"><TrashIcon className="h-4 w-4" /></button></div></div>)}</div>}
        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900">Arrastra los bloques. Inicio o mensaje requiere una salida; un menú admite varias; una acción ejecuta una herramienta segura y termina esa ruta.</div>
      </div>}</aside>
    </div>
  </div>;
}
