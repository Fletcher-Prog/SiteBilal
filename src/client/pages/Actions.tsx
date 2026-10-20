import { useState } from 'react';
import api from '../lib/api.js';
import { useList, PageHeader, Status, Modal, Field, FormActions, useSave, inputCls, btnPrimary, btnDanger, card } from '../components/ui.js';

type Filter = 'toutes' | 'a_faire' | 'faites';

export default function Actions() {
  const { data, loading, error, reload, setError } = useList('/actions');
  const [filter, setFilter] = useState<Filter>('toutes');
  const [open, setOpen] = useState(false);
  const { save, saving, error: saveErr } = useSave('/actions', () => { setOpen(false); reload(); });

  const toggle = async (a: any) => {
    try { await api.put(`/actions/${a.id}/toggle`); reload(); } catch (e: any) { setError(e.message); }
  };
  const remove = async (a: any) => {
    if (!window.confirm('Supprimer cette action ?')) return;
    try { await api.delete(`/actions/${a.id}`); reload(); } catch (e: any) { setError(e.message); }
  };
  const shown = data.filter((a: any) => filter === 'toutes' || (filter === 'faites' ? a.fait : !a.fait));
  const tabs: [Filter, string][] = [['toutes', 'Toutes'], ['a_faire', 'À faire'], ['faites', 'Faites']];

  return (
    <div>
      <PageHeader title="Actions" action={<button className={btnPrimary} onClick={() => setOpen(true)}>+ Ajouter une action</button>} />
      <div className="mb-4 inline-flex rounded-lg bg-white border border-slate-200 p-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-md text-sm font-medium min-h-[36px] ${filter === k ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      <Status loading={loading} error={error} />
      {!loading && shown.length === 0 && !error && <p className="text-slate-500">Aucune action.</p>}
      <ul className={`${card} divide-y divide-slate-100`}>
        {shown.map((a: any) => (
          <li key={a.id} className="flex items-start gap-3 p-3">
            <input type="checkbox" checked={!!a.fait} onChange={() => toggle(a)} aria-label={`Marquer « ${a.titre} »`} className="mt-1 h-5 w-5 accent-teal-600" />
            <div className="flex-1 min-w-0">
              <div className={a.fait ? 'line-through text-slate-400' : 'text-slate-900'}>{a.titre}</div>
              {a.commentaire && <div className="text-sm text-slate-500">{a.commentaire}</div>}
            </div>
            <button className={btnDanger} onClick={() => remove(a)} aria-label="Supprimer">×</button>
          </li>
        ))}
      </ul>
      {open && (
        <Modal title="Nouvelle action" onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save(undefined, { titre: f.get('titre'), commentaire: f.get('commentaire'), fait: 0 }); }}>
            <Field label="Titre"><input name="titre" required className={inputCls} /></Field>
            <Field label="Commentaire"><textarea name="commentaire" rows={3} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
