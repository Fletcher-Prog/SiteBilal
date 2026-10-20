import { useState } from 'react';
import api from '../lib/api.js';
import { useList, PageHeader, Status, Modal, Field, FormActions, useSave, inputCls, btnPrimary, btnGhost, btnDanger, card } from '../components/ui.js';

export default function Lieux() {
  const { data, loading, error, reload, setError } = useList('/lieux');
  const [edit, setEdit] = useState<any | null>(null);
  const { save, saving, error: saveErr } = useSave('/lieux', () => { setEdit(null); reload(); });

  const remove = async (l: any) => {
    if (!window.confirm(`Supprimer le lieu « ${l.nom} » ?`)) return;
    try { await api.delete(`/lieux/${l.id}`); reload(); } catch (e: any) { setError(e.message); }
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save(edit.id, { nom: f.get('nom'), type: f.get('type'), note: f.get('note') });
  };

  return (
    <div>
      <PageHeader title="Lieux de stockage" action={<button className={btnPrimary} onClick={() => setEdit({})}>+ Ajouter un lieu</button>} />
      <Status loading={loading} error={error} />
      {!loading && data.length === 0 && !error && <p className="text-slate-500">Aucun lieu.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((l: any) => (
          <div key={l.id} className={`${card} p-4 flex flex-col gap-2`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{l.nom}</h3>
              <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">{l.nb_vitrines ?? 0} vitrine{(l.nb_vitrines ?? 0) > 1 ? 's' : ''}</span>
            </div>
            {l.type && <div className="text-xs uppercase tracking-wide text-slate-500">{l.type}</div>}
            {l.note && <p className="text-sm text-slate-600">{l.note}</p>}
            <div className="mt-auto flex gap-2 pt-2">
              <button className={btnGhost} onClick={() => setEdit(l)}>Modifier</button>
              <button className={btnDanger} onClick={() => remove(l)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Modifier le lieu' : 'Nouveau lieu'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <Field label="Nom"><input name="nom" required defaultValue={edit.nom ?? ''} className={inputCls} /></Field>
            <Field label="Type"><input name="type" defaultValue={edit.type ?? ''} placeholder="Entrepôt, garage, client…" className={inputCls} /></Field>
            <Field label="Note"><textarea name="note" rows={3} defaultValue={edit.note ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
