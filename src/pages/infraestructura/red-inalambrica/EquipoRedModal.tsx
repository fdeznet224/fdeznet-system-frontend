import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO } from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';
import type { EquipoRed } from './tipos';

interface RouterCatalogo { id: number; nombre: string }

/** Alta y edición de un AP, PtP o switch. La clave de airOS se guarda cifrada. */
export default function EquipoRedModal({ equipo, equipos, tipos, marcas, onCerrar, onGuardado }: {
    equipo: EquipoRed | null;
    equipos: EquipoRed[];
    tipos: Record<string, string>;
    marcas: Record<string, string>;
    onCerrar: () => void;
    onGuardado: () => void;
}) {
    const [routers, setRouters] = useState<RouterCatalogo[]>([]);
    const [guardando, setGuardando] = useState(false);
    const [datos, setDatos] = useState({
        nombre: equipo?.nombre ?? '',
        tipo: equipo?.tipo ?? 'ap',
        marca: equipo?.marca ?? 'ubiquiti',
        modelo: equipo?.modelo ?? '',
        ip: equipo?.ip ?? '',
        router_id: equipo?.router_id ? String(equipo.router_id) : '',
        padre_id: equipo?.padre_id ? String(equipo.padre_id) : '',
        ubicacion: equipo?.ubicacion ?? '',
        usuario: equipo?.usuario ?? '',
        clave: '',
        puerto_web: equipo?.puerto_web ?? '443',
        activo: equipo?.activo ?? true,
    });

    useEffect(() => {
        client.get<RouterCatalogo[]>('/network/routers/').then(({ data }) => setRouters(data)).catch(() => setRouters([]));
    }, []);

    const cambiar = (campo: keyof typeof datos, valor: string | boolean) => setDatos((d) => ({ ...d, [campo]: valor }));

    const guardar = async (evento: FormEvent) => {
        evento.preventDefault();
        setGuardando(true);
        const cuerpo = {
            ...datos,
            modelo: datos.modelo || null,
            ubicacion: datos.ubicacion || null,
            usuario: datos.usuario || null,
            clave: datos.clave || null,
            router_id: datos.router_id ? Number(datos.router_id) : null,
            padre_id: datos.padre_id ? Number(datos.padre_id) : null,
        };
        try {
            if (equipo) await client.put(`/red-inalambrica/equipos/${equipo.id}`, cuerpo);
            else await client.post('/red-inalambrica/equipos', cuerpo);
            toast.success(equipo ? 'Equipo guardado' : 'Equipo agregado; se revisa en el siguiente ciclo o con ↻');
            onGuardado();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const borrar = async () => {
        if (!equipo || !window.confirm(`¿Quitar ${equipo.nombre}? Lo que cuelga de él pasa al equipo de arriba.`)) return;
        try {
            await client.delete(`/red-inalambrica/equipos/${equipo.id}`);
            toast.success('Equipo quitado');
            onGuardado();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo quitar'));
        }
    };

    // Un equipo no puede colgar de sí mismo ni de lo que cuelga de él.
    const descendientes = (id: number): number[] => equipos.filter((e) => e.padre_id === id).flatMap((e) => [e.id, ...descendientes(e.id)]);
    const prohibidos = equipo ? new Set([equipo.id, ...descendientes(equipo.id)]) : new Set<number>();
    const padres = equipos.filter((e) => !prohibidos.has(e.id) && (!datos.router_id || String(e.router_id) === datos.router_id));

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={equipo ? 'Editar equipo' : 'Agregar equipo'}>
            <form onSubmit={(e) => void guardar(e)} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{equipo ? `Editar ${equipo.nombre}` : 'Agregar equipo de red'}</h2>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2"><span className={ETIQUETA_CAMPO}>Nombre</span>
                        <input required value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="AP Sagrado Norte" className={CAMPO} />
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>Tipo</span>
                        <select value={datos.tipo} onChange={(e) => cambiar('tipo', e.target.value)} className={CAMPO}>
                            {Object.entries(tipos).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
                        </select>
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>Marca</span>
                        <select value={datos.marca} onChange={(e) => cambiar('marca', e.target.value)} className={CAMPO}>
                            {Object.entries(marcas).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
                        </select>
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>IP de administración</span>
                        <input required value={datos.ip} onChange={(e) => cambiar('ip', e.target.value)} placeholder="10.20.30.2" inputMode="decimal" className={`${CAMPO} font-mono`} />
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>Modelo (opcional)</span>
                        <input value={datos.modelo} onChange={(e) => cambiar('modelo', e.target.value)} placeholder="LiteAP AC" className={CAMPO} />
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>MikroTik por el que se llega</span>
                        <select required value={datos.router_id} onChange={(e) => cambiar('router_id', e.target.value)} className={CAMPO}>
                            <option value="">Elegir…</option>
                            {routers.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </label>
                    <label><span className={ETIQUETA_CAMPO}>Cuelga de</span>
                        <select value={datos.padre_id} onChange={(e) => cambiar('padre_id', e.target.value)} className={CAMPO}>
                            <option value="">Directo del MikroTik</option>
                            {padres.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.tipo_nombre})</option>)}
                        </select>
                    </label>
                    <label className="col-span-2"><span className={ETIQUETA_CAMPO}>Ubicación (opcional)</span>
                        <input value={datos.ubicacion} onChange={(e) => cambiar('ubicacion', e.target.value)} placeholder="Torre del tanque, Sagrado Corazón" className={CAMPO} />
                    </label>
                </div>

                {datos.marca === 'ubiquiti' && (
                    <fieldset className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <legend className="px-1 text-xs font-semibold text-slate-500">Acceso a airOS (para leer señal y estaciones)</legend>
                        <div className="grid grid-cols-3 gap-3">
                            <label><span className={ETIQUETA_CAMPO}>Usuario</span>
                                <input value={datos.usuario} onChange={(e) => cambiar('usuario', e.target.value)} placeholder="ubnt" autoComplete="off" className={CAMPO} />
                            </label>
                            <label><span className={ETIQUETA_CAMPO}>Clave</span>
                                <input type="password" value={datos.clave} onChange={(e) => cambiar('clave', e.target.value)} autoComplete="new-password"
                                    placeholder={equipo?.tiene_clave ? 'Guardada' : ''} className={CAMPO} />
                            </label>
                            <label><span className={ETIQUETA_CAMPO}>Puerto web</span>
                                <input value={datos.puerto_web} onChange={(e) => cambiar('puerto_web', e.target.value)} inputMode="numeric" className={CAMPO} />
                            </label>
                        </div>
                    </fieldset>
                )}

                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={datos.activo} onChange={(e) => cambiar('activo', e.target.checked)} /> Monitorear este equipo
                </label>

                <div className="mt-5 flex gap-2">
                    {equipo && <button type="button" onClick={() => void borrar()} className={`${BOTON_SECUNDARIO} text-rose-600`}>Quitar</button>}
                    <button type="button" onClick={onCerrar} className={`${BOTON_SECUNDARIO} flex-1`}>Cancelar</button>
                    <button type="submit" disabled={guardando} className={`${BOTON_PRIMARIO} flex-1`}>{guardando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </div>
    );
}
