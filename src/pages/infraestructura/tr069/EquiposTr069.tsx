import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CpuChipIcon, DocumentDuplicateIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_ACCION_SECUNDARIO, BOTON_ICONO, CAMPO_BUSQUEDA } from '@/components/ui/estilo';
import { EncabezadoPagina, FilaLista, Lista, Metrica, Vacio } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';
import AcsDelIsp, { type DatosAcs } from './AcsDelIsp';
import { hace, type EquipoTr069 } from './tr069';

type Filtro = 'todos' | 'sin_cliente' | 'sin_reportar' | 'no_conformes';
const UNA_HORA = 60 * 60 * 1000;

/** Todos los módems que se reportan al ACS (TR-069), con su cliente. */
export default function EquiposTr069() {
    const [equipos, setEquipos] = useState<EquipoTr069[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('todos');
    // En la nube, sin ACS activado no hay equipos que leer (no es un error).
    const [sinAcs, setSinAcs] = useState(false);
    const sinAcsAntes = useRef(false);

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

    const cambioAcs = useCallback((acs: DatosAcs) => {
        const falta = acs.en_la_nube && !acs.activo;
        if (sinAcsAntes.current && !falta) void leer(); // Recién activado: ya hay a quién preguntar.
        sinAcsAntes.current = falta;
        setSinAcs(falta);
    }, [leer]);

    const sinReportar = (e: EquipoTr069) => !e.ultimo_reporte || Date.now() - new Date(e.ultimo_reporte).getTime() > UNA_HORA;
    const conteo = {
        todos: equipos.length,
        sin_cliente: equipos.filter((e) => !e.cliente).length,
        sin_reportar: equipos.filter(sinReportar).length,
        no_conformes: equipos.filter((e) => e.plantilla.conforme === false).length,
    };

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return equipos.filter((e) => {
            if (filtro === 'sin_cliente' && e.cliente) return false;
            if (filtro === 'sin_reportar' && !sinReportar(e)) return false;
            if (filtro === 'no_conformes' && e.plantilla.conforme !== false) return false;
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
                    <>
                        <Link to="/admin/tr069/plantillas" className={BOTON_ACCION_SECUNDARIO}>
                            <DocumentDuplicateIcon className="h-4 w-4" /> Plantillas
                        </Link>
                        <button type="button" onClick={() => void leer()} disabled={cargando} aria-label="Actualizar" className={BOTON_ICONO}>
                            <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                        </button>
                    </>
                )}
            />
            <AcsDelIsp onCambio={cambioAcs} />
            {!sinAcs && (<>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metrica etiqueta="Equipos" valor={conteo.todos} tono="azul" onClick={() => setFiltro('todos')} activo={filtro === 'todos'} />
                <Metrica etiqueta="Sin cliente" valor={conteo.sin_cliente} tono="ambar" onClick={() => setFiltro('sin_cliente')} activo={filtro === 'sin_cliente'} />
                <Metrica etiqueta="Sin reportar 1 h" valor={conteo.sin_reportar} tono="rojo" onClick={() => setFiltro('sin_reportar')} activo={filtro === 'sin_reportar'} />
                <Metrica etiqueta="No conformes" valor={conteo.no_conformes} tono="violeta" onClick={() => setFiltro('no_conformes')} activo={filtro === 'no_conformes'} />
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
                            detalle={[e.modelo.replace('%2D', '-'), e.serie, e.ip,
                                e.plantilla.conforme === true ? 'conforme' : e.plantilla.conforme === false ? `le falta: ${e.plantilla.faltan[0] ?? e.plantilla.error ?? '?'}` : null,
                            ].filter(Boolean).join(' · ')}
                            valor={hace(e.ultimo_reporte)}
                            tonoValor={sinReportar(e) ? 'rojo' : 'neutro'}
                        />
                    ))}
                </Lista>
            )}
            </>)}
        </div>
    );
}
