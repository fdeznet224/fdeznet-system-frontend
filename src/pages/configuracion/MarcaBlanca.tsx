import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, PaintBrushIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import client from '@/api/axios';
import { DEFAULT_BRAND, type BrandConfig } from '@/context/brand/brand';
import { useBrand } from '@/context/brand/useBrand';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export default function MarcaBlanca() {
  const navigate = useNavigate();
  const { brand, refreshBrand } = useBrand();
  const [form, setForm] = useState<BrandConfig>(brand);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(brand); }, [brand]);
  const update = <K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    try { await client.put('/configuracion/marca', form); await refreshBrand(); toast.success('Marca actualizada'); }
    catch { toast.error('No se pudo guardar la marca'); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 sm:p-6">
    <div className="flex items-center gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><ArrowLeftIcon className="h-6 w-6" /></button>
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><PaintBrushIcon className="h-6 w-6 text-blue-500" /> Marca blanca</h1><p className="text-sm text-slate-500">Identidad visible de esta instalación.</p></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 sm:p-7">
        <Field label="Nombre del ISP"><input className={fieldClass} value={form.empresa_nombre} onChange={(e) => update('empresa_nombre', e.target.value)} /></Field>
        <Field label="Nombre del sistema"><input className={fieldClass} value={form.sistema_nombre} onChange={(e) => update('sistema_nombre', e.target.value)} /></Field>
        <Field label="URL del logotipo"><input className={fieldClass} placeholder="https://.../logo.png" value={form.logo_url || ''} onChange={(e) => update('logo_url', e.target.value || null)} /></Field>
        <Field label="URL del favicon"><input className={fieldClass} placeholder="https://.../favicon.png" value={form.favicon_url || ''} onChange={(e) => update('favicon_url', e.target.value || null)} /></Field>
        <Field label="Color principal"><ColorField value={form.color_primario} onChange={(value) => update('color_primario', value)} /></Field>
        <Field label="Color secundario"><ColorField value={form.color_secundario} onChange={(value) => update('color_secundario', value)} /></Field>
        <Field label="Teléfono"><input className={fieldClass} value={form.empresa_telefono || ''} onChange={(e) => update('empresa_telefono', e.target.value || null)} /></Field>
        <Field label="Correo"><input type="email" className={fieldClass} value={form.empresa_email || ''} onChange={(e) => update('empresa_email', e.target.value || null)} /></Field>
        <div className="sm:col-span-2"><Field label="Dirección"><input className={fieldClass} value={form.empresa_direccion || ''} onChange={(e) => update('empresa_direccion', e.target.value || null)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Pie de recibos"><textarea rows={3} className={fieldClass} value={form.pie_recibo || ''} onChange={(e) => update('pie_recibo', e.target.value || null)} /></Field></div>
        <div className="flex gap-3 sm:col-span-2">
          <button type="button" onClick={() => setForm(DEFAULT_BRAND)} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-600 dark:border-slate-700 dark:text-slate-300">Restablecer</button>
          <button type="button" disabled={saving || !form.empresa_nombre.trim() || !form.sistema_nombre.trim()} onClick={() => void save()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><CheckCircleIcon className="h-5 w-5" />{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
      <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vista previa</p>
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${form.color_primario}, ${form.color_secundario})` }}>
          {form.logo_url ? <img src={form.logo_url} alt="Logotipo" className="h-full w-full object-contain" /> : <PhotoIcon className="h-9 w-9" />}
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{form.empresa_nombre || 'Tu ISP'}</h2>
        <p className="text-sm font-bold" style={{ color: form.color_primario }}>{form.sistema_nombre || 'Sistema ISP'}</p>
        {form.empresa_telefono && <p className="mt-4 text-xs text-slate-500">{form.empresa_telefono}</p>}
        {form.empresa_email && <p className="text-xs text-slate-500">{form.empresa_email}</p>}
      </div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>{children}</label>;
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="flex gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-14 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" /><input value={value} pattern="#[0-9a-fA-F]{6}" onChange={(e) => onChange(e.target.value)} className={fieldClass} /></div>;
}
