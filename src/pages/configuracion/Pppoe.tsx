import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, KeyIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '../../api/axios';

type PasswordMode = 'fija' | 'aleatoria';
type CharacterType = 'numeros' | 'letras' | 'alfanumerica';

interface PppoeConfig {
  modo: PasswordMode;
  password?: string | null;
  longitud: number;
  tipo_caracteres: CharacterType;
}

export default function Pppoe() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<PasswordMode>('aleatoria');
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [characterType, setCharacterType] = useState<CharacterType>('alfanumerica');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get<Partial<PppoeConfig>>('/configuracion/pppoe-default')
      .then(({ data }) => {
        // Compatibilidad con instalaciones que todavía solo devuelven password.
        setMode(data.modo || (data.password ? 'fija' : 'aleatoria'));
        setPassword(data.password || '');
        setLength(data.longitud || 12);
        setCharacterType(data.tipo_caracteres || 'alfanumerica');
      })
      .catch(() => {
        toast.error('No se pudo cargar la configuración PPPoE');
      });
  }, []);

  const fixedPasswordValid = mode !== 'fija' || password.trim().length >= 3;
  const lengthValid = length >= 6 && length <= 64;

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.post('/configuracion/pppoe-default', {
        modo: mode,
        password: mode === 'fija' ? password.trim() : null,
        longitud: length,
        tipo_caracteres: characterType,
      });
      toast.success('Política de contraseñas PPPoE guardada');
    } catch {
      toast.error('No se pudo guardar la configuración PPPoE');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl animate-in p-4 fade-in duration-500">
      <button
        type="button"
        onClick={() => navigate('/admin/configuracion')}
        className="mb-6 flex items-center text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Regresar
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10">
            <KeyIcon className="h-6 w-6 text-rose-600 dark:text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Seguridad PPPoE</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Define cómo se asignan las contraseñas a los clientes nuevos.
            </p>
          </div>
        </div>

        <p className="mb-3 text-sm font-black text-slate-600 dark:text-slate-300">Tipo de contraseña</p>
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('fija')}
            className={`rounded-2xl border p-4 text-left transition ${mode === 'fija' ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 dark:bg-rose-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
          >
            <ShieldCheckIcon className="mb-2 h-6 w-6 text-rose-600" />
            <span className="block font-black text-slate-900 dark:text-white">Una contraseña fija</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">La misma para todos los clientes nuevos.</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('aleatoria')}
            className={`rounded-2xl border p-4 text-left transition ${mode === 'aleatoria' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
          >
            <SparklesIcon className="mb-2 h-6 w-6 text-blue-600" />
            <span className="block font-black text-slate-900 dark:text-white">Contraseña aleatoria</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Una diferente para cada cliente nuevo.</span>
          </button>
        </div>

        {mode === 'fija' ? (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">Contraseña fija</label>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Mínimo 3 caracteres"
            />
          </div>
        ) : (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">Cantidad de caracteres</label>
              <input
                type="number"
                min={6}
                max={64}
                value={length}
                onChange={(event) => setLength(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">Entre 6 y 64 caracteres.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">Caracteres permitidos</label>
              <select
                value={characterType}
                onChange={(event) => setCharacterType(event.target.value as CharacterType)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="numeros">Solo números</option>
                <option value="letras">Solo letras</option>
                <option value="alfanumerica">Letras y números</option>
              </select>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Este cambio se aplica únicamente a clientes nuevos. Las contraseñas actuales no serán modificadas.
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !fixedPasswordValid || !lengthValid}
          className="w-full rounded-xl bg-rose-600 py-3 font-black text-white shadow-md transition hover:bg-rose-500 hover:shadow-rose-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
