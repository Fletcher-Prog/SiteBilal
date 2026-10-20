import { useCallback, useEffect, useState, type ReactNode } from 'react';
import api from '../lib/api.js';

export const eur = (n: any) => (n == null || n === '' || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }));
export const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
export const btnPrimary = 'inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 min-h-[40px]';
export const btnGhost = 'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]';
export const btnDanger = 'inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 min-h-[40px]';
export const card = 'rounded-xl bg-white border border-slate-200 shadow-sm';

export function useList<T = any>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setError('');
      const r = await api.get(path);
      setData(Array.isArray(r) ? r : []);
    } catch (e: any) { setError(e.message || 'Erreur de chargement'); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setError };
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {action}
    </div>
  );
}

export function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="py-10 text-center text-slate-500" role="status">Chargement…</div>;
  if (error) return <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>;
  return null;
}

export function Kpi({ label, value, tone = 'teal' }: { label: string; value: ReactNode; tone?: 'teal' | 'red' | 'green' | 'slate' }) {
  const c = { teal: 'text-teal-700', red: 'text-red-600', green: 'text-green-600', slate: 'text-slate-800' }[tone];
  return (
    <div className={`${card} p-4`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${c}`}>{value}</div>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-2xl leading-none text-slate-400 hover:text-slate-700 px-2">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function FormActions({ saving, onCancel, error }: { saving: boolean; onCancel: () => void; error?: string }) {
  return (
    <>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div>}
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" className={btnGhost} onClick={onCancel}>Annuler</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </>
  );
}

/** Generic save helper: POST when no id, PUT otherwise. */
export function useSave(path: string, onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async (id: number | undefined, body: any) => {
    setSaving(true); setError('');
    try {
      if (id) await api.put(`${path}/${id}`, body); else await api.post(path, body);
      onDone();
    } catch (e: any) { setError(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };
  return { save, saving, error };
}

export const num = (v: string) => (v === '' ? null : Number(v));
