import { useEffect, useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';

type Marca = 'huawei' | 'zte';
type Config = Record<Marca, { url: string; cuentas: string; puerto: string }> & { radio: { puerto: string }; antena: { puerto: string } };

const MARCAS: { id: Marca; nombre: string; puerto: string }[] = [
  { id: 'huawei', nombre: 'Huawei', puerto: '80' },
  { id: 'zte', nombre: 'ZTE', puerto: '8090' },
];
const soloNumeros = (valor: string) => valor.replace(/\D/g, '');
const CAMPO = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** Dirección y cuentas de la ONU que ve el técnico en una reparación (conectado al WiFi del cliente). */
export default function AccesoOnu() {
  const [config, setConfig] = useState<Config>({ huawei: { url: '', cuentas: '', puerto: '80' }, zte: { url: '', cuentas: '', puerto: '8090' }, radio: { puerto: '8080' }, antena: { puerto: '443' } });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    client.get<Config>('/configuracion/acceso-onu')
      .then(({ data }) => setConfig((actual) => ({
        huawei: { ...actual.huawei, ...data?.huawei },
        zte: { ...actual.zte, ...data?.zte },
        radio: { ...actual.radio, ...data?.radio },
        antena: { ...actual.antena, ...data?.antena },
      })))
      .catch(() => toast.error('No se pudo cargar el acceso a la ONU'));
  }, []);

  const cambiar = (marca: Marca, campo: 'url' | 'cuentas' | 'puerto', valor: string) => {
    setConfig((actual) => ({ ...actual, [marca]: { ...actual[marca], [campo]: valor } }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const { data } = await client.post<Config>('/configuracion/acceso-onu', config);
      setConfig(data);
      toast.success('Acceso a la ONU guardado');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo guardar el acceso a la ONU'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
          <GlobeAltIcon className="h-6 w-6 text-blue-600 dark:text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Acceso a la ONU del cliente</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Lo ve el técnico en las reparaciones para entrar a la ONU conectado al WiFi del cliente.
          </p>
        </div>
      </div>

      {MARCAS.map(({ id, nombre, puerto }) => (
        <fieldset key={id} className="mb-5 space-y-2">
          <legend className="mb-2 text-sm font-black text-slate-600 dark:text-slate-300">{nombre}</legend>
          <input aria-label={`Dirección de la ONU ${nombre}`} value={config[id].url} onChange={(e) => cambiar(id, 'url', e.target.value)} placeholder="http://192.168.100.1" className={CAMPO} />
          <input aria-label={`Cuentas de la ONU ${nombre}`} value={config[id].cuentas} onChange={(e) => cambiar(id, 'cuentas', e.target.value)} placeholder="usuario:contraseña, usuario2:contraseña2" className={`${CAMPO} font-mono`} />
          <label className="flex items-center gap-3 text-xs font-bold text-slate-500">
            <span className="shrink-0">Puerto web por su IP</span>
            <input aria-label={`Puerto web de la ONU ${nombre}`} inputMode="numeric" value={config[id].puerto} onChange={(e) => cambiar(id, 'puerto', soloNumeros(e.target.value))} placeholder={puerto} className={`${CAMPO} font-mono`} />
          </label>
        </fieldset>
      ))}
      <p className="mb-5 text-xs text-slate-500">Varias cuentas separadas por coma, cada una como usuario:contraseña. Deja la dirección vacía para no mostrar esa marca. Al tocar la IP de un cliente en Clientes se abre su ONU en el puerto de su marca; si no contesta, se prueban los demás puertos.</p>

      <fieldset className="mb-5 space-y-2">
        <legend className="mb-2 text-sm font-black text-slate-600 dark:text-slate-300">Router de clientes por radio</legend>
        <input
          aria-label="Puerto web del router de clientes por radio"
          inputMode="numeric"
          value={config.radio.puerto}
          onChange={(e) => setConfig((actual) => ({ ...actual, radio: { puerto: soloNumeros(e.target.value) } }))}
          placeholder="8080"
          className={`${CAMPO} font-mono`}
        />
        <p className="text-xs text-slate-500">Al tocar la IP de un cliente de radio en Clientes se abre su router en este puerto (administración remota del Mercusys). Vacío abre el puerto 80.</p>
      </fieldset>

      <fieldset className="mb-5 space-y-2">
        <legend className="mb-2 text-sm font-black text-slate-600 dark:text-slate-300">Antena del radioenlace</legend>
        <input
          aria-label="Puerto web de la antena"
          inputMode="numeric"
          value={config.antena.puerto}
          onChange={(e) => setConfig((actual) => ({ ...actual, antena: { puerto: soloNumeros(e.target.value) } }))}
          placeholder="443"
          className={`${CAMPO} font-mono`}
        />
        <p className="text-xs text-slate-500">La antena está en la VLAN de su MikroTik: al abrirla, el MikroTik abre un puente por 30 minutos y se cierra solo. Ubiquiti usa el 443 (HTTPS); acepta el aviso del certificado.</p>
      </fieldset>

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className="w-full rounded-xl bg-blue-600 py-3 font-black text-white shadow-md transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? 'Guardando...' : 'Guardar acceso a la ONU'}
      </button>
    </div>
  );
}
