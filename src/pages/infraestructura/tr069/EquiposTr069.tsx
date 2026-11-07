import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, CpuChipIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_ICONO, CAMPO_BUSQUEDA } from '@/components/ui/estilo';
import { EncabezadoPagina, FilaLista, Lista, Metrica, Vacio } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';
import { hace, type EquipoTr069 } from './tr069';

type Filtro = 'todos' | 'sin_cliente' | 'sin_reportar';
const UNA_HORA = 60 * 60 * 1000;

/** Todos los módems que se reportan al ACS (TR-069), con su cliente. */
export default function EquiposTr069() {
    const [equipos, setEquipos] = useState<EquipoTr069[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('todos');

    const leer = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const { data } = await client.get<EquipoTr069[]>('/tr069/equipos');
            setEquipos(data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer el ACS'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    const sinReportar = (e: EquipoTr069) => !e.ultimo_reporte || Date.now() - new Date(e.ultimo_reporte).getTime() > UNA_HORA;
    const conteo = {
        todos: equipos.length,
        sin_cliente: equipos.filter((e) => !e.cliente).length,
        sin_reportar: equipos.filter(sinReportar).length,
    };

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return equipos.filter((e) => {
            if (filtro === 'sin_cliente' && e.cliente) return false;
            if (filtro === 'sin_reportar' && !sinReportar(e)) return false;
            if (!texto) return true;
            return [e.modelo, e.serie, e.ip, e.cliente?.nombre, e.fabricante].some((v) => v?.toLowerCase().includes(texto));
        });
    }, [equipos, busqueda, filtro]);

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <EncabezadoPagina
                titulo="TR-069"
                descripcion="Los módems que se reportan al ACS. Entra a uno para ver y cambiar su configuración."
                acciones={(
                    <button type="button" onClick={() => void leer()} disabled={cargando} aria-label="Actualizar" className={BOTON_ICONO}>
                        <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                )}
            />
            <div className="grid grid-cols-3 gap-2">
                <Metrica etiqueta="Equipos" valor={conteo.todos} tono="azul" onClick={() => setFiltro('todos')} activo={filtro === 'todos'} />
                <Metrica etiqueta="Sin cliente" valor={conteo.sin_cliente} tono="ambar" onClick={() => setFiltro('sin_cliente')} activo={filtro === 'sin_cliente'} />
                <Metrica etiqueta="Sin reportar 1 h" valor={conteo.sin_reportar} tono="rojo" onClick={() => setFiltro('sin_reportar')} activo={filtro === 'sin_reportar'} />
            </div>
            <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5b6170]" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por cliente, serie, modelo o IP" className={CAMPO_BUSQUEDA} />
            </div>
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
            {!cargando && !error && visibles.length === 0 && <Vacio icono={CpuChipIcon} titulo="No hay equipos" detalle="Ningún equipo coincide con la búsqueda." />}
            {visibles.length > 0 && (
                <Lista>
                    {visibles.map((e) => (
                        <FilaLista
                            key={e.id}
                            a={`/admin/tr069/${encodeURIComponent(e.id)}`}
                            icono={CpuChipIcon}
                            tono={sinReportar(e) ? 'rojo' : e.cliente ? 'azul' : 'ambar'}
                            titulo={e.cliente?.nombre ?? 'Sin cliente'}
                            detalle={[e.modelo, e.serie, e.ip].filter(Boolean).join(' · ')}
                            valor={hace(e.ultimo_reporte)}
                            tonoValor={sinReportar(e) ? 'rojo' : 'neutro'}
                        />
                    ))}
                </Lista>
            )}
        </div>
    );
}
