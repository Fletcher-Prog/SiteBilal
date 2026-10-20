import { useState } from 'react';
import { useList, PageHeader, Status, Kpi, Modal, Field, FormActions, useSave, eur, num, inputCls, btnPrimary, btnGhost, card } from '../components/ui.js';

const marge = (v: any) => (Number(v.prix_vente) || 0) - (Number(v.prix_achat) || 0) - (Number(v.frais) || 0);

export default function Ventes() {
  const { data, loading, error, reload } = useList('/ventes');
  const vit = useList('/vitrines');
  const [edit, setEdit] = useState<any | null>(null);
  const { save, saving, error: saveErr } = useSave('/ventes', () => { setEdit(null); reload(); });

  const totalVentes = data.reduce((s: number, v: any) => s + (Number(v.prix_vente) || 0), 0);
  const totalMarge = data.reduce((s: number, v: any) => s + marge(v), 0);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save(edit.id, {
      vitrine_id: num(String(f.get('vitrine_id') || '')),
      prix_achat: num(String(f.get('prix_achat'))), prix_vente: num(String(f.get('prix_vente'))),
      frais: num(String(f.get('frais'))) ?? 0, date_vente: f.get('date_vente'), commentaire: f.get('commentaire'),
    });
  };
  const label = (v: any) => v.vitrine_nom || v.vitrine_serie || (v.vitrine_id ? `Vitrine #${v.vitrine_id}` : '—');

  return (
    <div>
      <PageHeader title="Ventes" action={<button className={btnPrimary} onClick={() => setEdit({})}>+ Ajouter une vente</button>} />
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Kpi label="Total ventes" value={eur(totalVentes)} />
        <Kpi label="Marge totale" value={eur(totalMarge)} tone={totalMarge >= 0 ? 'green' : 'red'} />
      </div>
      <Status loading={loading} error={error} />
      {!loading && data.length === 0 && !error && <p className="text-slate-500">Aucune vente.</p>}
      {data.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>{['Vitrine', 'Prix achat', 'Prix vente', 'Frais', 'Marge', 'Date', ''].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((v: any) => {
                const m = marge(v);
                return (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-medium">{label(v)}</td>
                    <td className="px-3 py-2">{eur(v.prix_achat)}</td>
                    <td className="px-3 py-2">{eur(v.prix_vente)}</td>
                    <td className="px-3 py-2">{eur(v.frais)}</td>
                    <td className={`px-3 py-2 font-semibold ${m >= 0 ? 'text-green-600' : 'text-red-600'}`}>{eur(m)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{v.date_vente || '—'}</td>
                    <td className="px-3 py-2"><button className={btnGhost} onClick={() => setEdit(v)}>Modifier</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal title={edit.id ? 'Modifier la vente' : 'Nouvelle vente'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <Field label="Vitrine">
              <select name="vitrine_id" defaultValue={edit.vitrine_id ?? ''} className={inputCls}>
                <option value="">—</option>
                {vit.data.map((x: any) => <option key={x.id} value={x.id}>{x.nom || x.serial || x.model || `#${x.id}`}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prix achat (€)"><input name="prix_achat" type="number" step="any" defaultValue={edit.prix_achat ?? ''} className={inputCls} /></Field>
              <Field label="Prix vente (€)"><input name="prix_vente" type="number" step="any" required defaultValue={edit.prix_vente ?? ''} className={inputCls} /></Field>
              <Field label="Frais (€)"><input name="frais" type="number" step="any" defaultValue={edit.frais ?? 0} className={inputCls} /></Field>
            </div>
            <Field label="Date"><input name="date_vente" type="date" defaultValue={edit.date_vente ?? new Date().toISOString().slice(0, 10)} className={inputCls} /></Field>
            <Field label="Commentaire"><textarea name="commentaire" rows={2} defaultValue={edit.commentaire ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
