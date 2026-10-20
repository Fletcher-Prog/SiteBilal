import { useMemo, useState } from 'react';
import { useList, PageHeader, Status, Kpi, Modal, Field, FormActions, useSave, eur, num, inputCls, btnPrimary, btnGhost, card } from '../components/ui.js';

const isOut = (f: any) => String(f.type_flux || '').toLowerCase().startsWith('sortie');
const monthOf = (f: any) => f.mois || (f.date ? String(f.date).slice(0, 7) : '');

export default function Tresorerie() {
  const { data, loading, error, reload } = useList('/flux');
  const [type, setType] = useState<'tous' | 'entree' | 'sortie'>('tous');
  const [mois, setMois] = useState('');
  const [edit, setEdit] = useState<any | null>(null);
  const { save, saving, error: saveErr } = useSave('/flux', () => { setEdit(null); reload(); });

  const months = useMemo(() => Array.from(new Set(data.map(monthOf).filter(Boolean))).sort().reverse() as string[], [data]);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const me = useMemo(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return String(u?.name || u?.email?.split('@')[0] || '').toLowerCase(); } catch { return ''; }
  }, []);
  const mine = (f: any) => !!me && String(f.qui || '').toLowerCase() === me;
  const shown = data.filter((f: any) => (viewMode === 'all' || mine(f)) && (type === 'tous' || (type === 'sortie') === isOut(f)) && (!mois || monthOf(f) === mois));
  const scope = data.filter((f: any) => (viewMode === 'all' || mine(f)) && (!mois || monthOf(f) === mois));
  const entrees = scope.filter((f: any) => !isOut(f)).reduce((s: number, f: any) => s + (Number(f.montant) || 0), 0);
  const sorties = scope.filter(isOut).reduce((s: number, f: any) => s + (Number(f.montant) || 0), 0);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const d = String(f.get('date') || '');
    save(edit.id, {
      type_flux: f.get('type_flux'), montant: num(String(f.get('montant'))), qui: f.get('qui'), client: f.get('client'),
      date: d, mois: d.slice(0, 7), commentaire: f.get('commentaire'),
    });
  };
  const seg = (k: typeof type, l: string) => (
    <button key={k} onClick={() => setType(k)} className={`px-3 py-1.5 rounded-md text-sm font-medium min-h-[36px] ${type === k ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
  );

  return (
    <div>
      <PageHeader title="Trésorerie" action={<button className={btnPrimary} onClick={() => setEdit({})}>+ Ajouter un flux</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Kpi label={`Entrées ${mois || '(total)'}`} value={eur(entrees)} tone="green" />
        <Kpi label={`Sorties ${mois || '(total)'}`} value={eur(sorties)} tone="red" />
        <Kpi label="Solde" value={eur(entrees - sorties)} tone={entrees - sorties >= 0 ? 'teal' : 'red'} />
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('mine')} className={viewMode === 'mine' ? 'bg-blue-600 text-white px-3 py-1 rounded' : 'bg-gray-200 px-3 py-1 rounded'}>Ma caisse</button>
        <button onClick={() => setViewMode('all')} className={viewMode === 'all' ? 'bg-blue-600 text-white px-3 py-1 rounded' : 'bg-gray-200 px-3 py-1 rounded'}>Toutes les caisses</button>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1">{seg('tous', 'Tous')}{seg('entree', 'Entrées')}{seg('sortie', 'Sorties')}</div>
        <select value={mois} onChange={(e) => setMois(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Mois">
          <option value="">Tous les mois</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <Status loading={loading} error={error} />
      {!loading && shown.length === 0 && !error && <p className="text-slate-500">Aucun flux.</p>}
      {shown.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>{['Date', 'Type', 'Montant', 'Qui', 'Client', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((f: any) => (
                <tr key={f.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{f.date || f.mois || '—'}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isOut(f) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{f.type_flux || '—'}</span></td>
                  <td className={`px-3 py-2 font-semibold ${isOut(f) ? 'text-red-600' : 'text-green-600'}`}>{isOut(f) ? '−' : '+'}{eur(f.montant)}</td>
                  <td className="px-3 py-2">{f.qui || '—'}</td>
                  <td className="px-3 py-2">{f.client || '—'}</td>
                  <td className="px-3 py-2"><button className={btnGhost} onClick={() => setEdit(f)}>Modifier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? 'Modifier le flux' : 'Nouveau flux'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select name="type_flux" defaultValue={edit.type_flux ?? 'entree'} className={inputCls}><option value="entree">Entrée</option><option value="sortie">Sortie</option></select>
              </Field>
              <Field label="Montant (€)"><input name="montant" type="number" step="any" required defaultValue={edit.montant ?? ''} className={inputCls} /></Field>
            </div>
            <Field label="Date"><input name="date" type="date" defaultValue={edit.date ?? new Date().toISOString().slice(0, 10)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qui"><input name="qui" defaultValue={edit.qui ?? ''} className={inputCls} /></Field>
              <Field label="Client"><input name="client" defaultValue={edit.client ?? ''} className={inputCls} /></Field>
            </div>
            <Field label="Commentaire"><textarea name="commentaire" rows={2} defaultValue={edit.commentaire ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
