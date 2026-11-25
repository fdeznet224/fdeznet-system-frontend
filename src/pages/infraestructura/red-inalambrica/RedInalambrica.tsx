import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, SignalIcon, UsersIcon, WifiIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { EncabezadoPagina, Metrica, Vacio } from '@/components/ui/Pagina';
import { BOTON_ACCION_PRIMARIO } from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';
import EquipoRedModal from './EquipoRedModal';
import MapaRed from './MapaRed';
import type { Arbol, EquipoRed, RouterArbol } from './tipos';

/** Todos los equipos, incluidos los de los MikroTik que cuelgan de la troncal. */
function todos(equipos: EquipoRed[]): EquipoRed[] {
    return equipos.flatMap((e) => [e, ...todos(e.hijos), ...(e.router ? todos(e.router.equipos) : [])]);
}

/** Todos los MikroTik: los sueltos y los que cuelgan de algún enlace. */
function todosRouters(arbol: Arbol): RouterArbol[] {
    const colgados = todos([...arbol.troncal, ...arbol.routers.flatMap((r) => r.equipos)]).flatMap((e) => (e.router ? [e.router] : []));
    return [...arbol.routers, ...colgados];
}

/**
 * Mapa de toda la red: nodo principal → troncal → enlaces → MikroTik de cada
 * zona → AP y OLT → clientes. Se revisa solo cada 10 minutos.
 */
export default function RedInalambrica() {
    const [arbol, setArbol] = useState<Arbol | null>(null);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState<EquipoRed | 'nuevo' | null>(null);
    const [revisando, setRevisando] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<Arbol>('/red-inalambrica/arbol');
            setArbol(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar la red'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        const primera = window.setTimeout(() => void cargar(), 0);
        return () => window.clearTimeout(primera);
    }, [cargar]);

    const revisar = async (equipo: EquipoRed) => {
        setRevisando(equipo.id);
        try {
            const { data } = await client.post<EquipoRed>(`/red-inalambrica/equipos/${equipo.id}/revisar`);
            toast[data.responde ? 'success' : 'error'](`${equipo.nombre}: ${data.responde ? `responde (${data.latencia_ms} ms)` : 'no responde'}`);
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo revisar'));
        } finally {
            setRevisando(null);
        }
    };

    const equipos = useMemo(() => (arbol ? todos([...arbol.troncal, ...arbol.routers.flatMap((r) => r.equipos)]) : []), [arbol]);
    const routers = useMemo(() => (arbol ? todosRouters(arbol) : []), [arbol]);
    const caidos = equipos.filter((e) => e.activo && e.responde === false).length;
    const clientes = [
        ...routers.flatMap((r) => r.clientes_sin_ap),
        ...equipos.flatMap((e) => e.clientes),
        ...routers.flatMap((r) => (r.olts ?? []).flatMap((o) => o.pons.flatMap((p) => p.clientes))),
    ];
    const sinConexion = clientes.filter((c) => c.responde === false).length;
    const vacio = !arbol || (arbol.routers.length === 0 && arbol.troncal.length === 0);

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <EncabezadoPagina
                titulo="Red inalámbrica"
                descripcion="Mapa de la red hasta cada cliente. Se revisa solo cada 10 minutos."
                acciones={<button type="button" onClick={() => setEditando('nuevo')} className={BOTON_ACCION_PRIMARIO}><PlusIcon className="h-5 w-5" /> Agregar equipo</button>}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metrica etiqueta="Equipos" valor={equipos.length} icono={WifiIcon} />
                <Metrica etiqueta="Equipos sin responder" valor={caidos} tono={caidos ? 'rojo' : 'verde'} icono={SignalIcon} />
                <Metrica etiqueta="Clientes" valor={clientes.length} icono={UsersIcon} />
                <Metrica etiqueta="Clientes sin conexión" valor={sinConexion} tono={sinConexion ? 'ambar' : 'verde'} />
            </div>

            {cargando ? (
                <p className="py-16 text-center text-sm text-slate-500">Cargando la red…</p>
            ) : vacio || !arbol ? (
                <Vacio icono={WifiIcon} titulo="Aún no hay equipos de red" detalle="Agrega tus enlaces y AP; los clientes se acomodan solos en su AP al leer los Ubiquiti." />
            ) : (
                <MapaRed arbol={arbol} onEditar={setEditando} onRevisar={(e) => void revisar(e)} revisando={revisando} />
            )}

            {editando && arbol && (
                <EquipoRedModal
                    equipo={editando === 'nuevo' ? null : editando}
                    equipos={equipos}
                    tipos={arbol.tipos}
                    marcas={arbol.marcas}
                    onCerrar={() => setEditando(null)}
                    onGuardado={() => { setEditando(null); void cargar(); }}
                />
            )}
        </div>
    );
}
