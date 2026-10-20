import { useState } from 'react';
import api from '../lib/api.js';
import { useList, PageHeader, Status, Modal, Field, FormActions, useSave, eur, num, inputCls, btnPrimary, btnGhost, btnDanger, card } from '../components/ui.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

function exportContratPdf(contrat: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<html><head><title>Contrat ${esc(contrat.client_nom || contrat.client)}</title>
    <style>body{font-family:sans-serif;padding:2em;max-width:800px;margin:auto}
    h1{font-size:1.5em}table{width:100%;border-collapse:collapse;margin:1em 0}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body>
    <h1>Contrat de Location</h1>
    <table>
    <tr><th>Client</th><td>${esc(contrat.client_nom || contrat.client)}</td></tr>
    <tr><th>Durée</th><td>${esc(contrat.duree)} mois</td></tr>
    <tr><th>Montant</th><td>${esc(contrat.montant || 0)} €</td></tr>
    <tr><th>Caution</th><td>${esc(contrat.caution || 0)} €</td></tr>
    </table>
    <h2>Conditions</h2><p>${esc(contrat.conditions) || 'Aucune condition spécifiée.'}</p>
    </body></html>`);
  w.document.close();
  w.print();
}

export default function Contrats() {
  const { data, loading, error, reload, setError } = useList('/contrats');
  const vit = useList('/vitrines');
  const [edit, setEdit] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const { save, saving, error: saveErr } = useSave('/contrats', () => { setEdit(null); setDetail(null); reload(); });

  const client = (c: any) => c.client_nom || c.client || '—';
  const vitrine = (c: any) => c.vitrine_nom || (c.vitrine_id ? `Vitrine #${c.vitrine_id}` : '—');
  const remove = async (c: any) => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try { await api.delete(`/contrats/${c.id}`); setDetail(null); reload(); } catch (e: any) { setError(e.message); }
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save(edit.id, {
      client: f.get('client'), vitrine_id: num(String(f.get('vitrine_id') || '')), duree: num(String(f.get('duree'))),
      montant: num(String(f.get('montant'))), caution: num(String(f.get('caution'))), conditions: f.get('conditions'),
    });
  };

  return (
    <div>
      <PageHeader title="Contrats" action={<button className={btnPrimary} onClick={() => setEdit({})}>+ Nouveau contrat</button>} />
      <Status loading={loading} error={error} />
      {!loading && data.length === 0 && !error && <p className="text-slate-500">Aucun contrat.</p>}
      {data.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>{['Client', 'Vitrine', 'Durée', 'Montant', 'Caution', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(c)}>
                  <td className="px-3 py-2 font-medium">{client(c)}</td>
                  <td className="px-3 py-2">{vitrine(c)}</td>
                  <td className="px-3 py-2">{c.duree != null ? `${c.duree} mois` : '—'}</td>
                  <td className="px-3 py-2">{eur(c.montant)}</td>
                  <td className="px-3 py-2">{eur(c.caution)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><button className={btnGhost} onClick={() => exportContratPdf(c)}>📄 PDF</button> <button className={btnGhost} onClick={() => setEdit(c)}>Modifier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && !edit && (
        <Modal title={`Contrat — ${client(detail)}`} onClose={() => setDetail(null)}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Client</dt><dd>{client(detail)}</dd>
            <dt className="text-slate-500">Vitrine</dt><dd>{vitrine(detail)}</dd>
            <dt className="text-slate-500">Durée</dt><dd>{detail.duree != null ? `${detail.duree} mois` : '—'}</dd>
            <dt className="text-slate-500">Montant</dt><dd>{eur(detail.montant)}</dd>
            <dt className="text-slate-500">Caution</dt><dd>{eur(detail.caution)}</dd>
            <dt className="text-slate-500 col-span-2">Conditions</dt>
            <dd className="col-span-2 whitespace-pre-wrap">{detail.conditions || '—'}</dd>
          </dl>
          <div className="flex justify-end gap-2 mt-5">
            <button className={btnDanger} onClick={() => remove(detail)}>Supprimer</button>
            <button className={btnPrimary} onClick={() => setEdit(detail)}>Modifier</button>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.id ? 'Modifier le contrat' : 'Nouveau contrat'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <Field label="Client"><input name="client" required defaultValue={edit.client ?? edit.client_nom ?? ''} className={inputCls} /></Field>
            <Field label="Vitrine">
              <select name="vitrine_id" defaultValue={edit.vitrine_id ?? ''} className={inputCls}>
                <option value="">—</option>
                {vit.data.map((x: any) => <option key={x.id} value={x.id}>{x.nom || x.serial || x.model || `#${x.id}`}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Durée (mois)"><input name="duree" type="number" min={0} defaultValue={edit.duree ?? ''} className={inputCls} /></Field>
              <Field label="Montant (€)"><input name="montant" type="number" step="any" defaultValue={edit.montant ?? ''} className={inputCls} /></Field>
              <Field label="Caution (€)"><input name="caution" type="number" step="any" defaultValue={edit.caution ?? ''} className={inputCls} /></Field>
            </div>
            <Field label="Conditions"><textarea name="conditions" rows={3} defaultValue={edit.conditions ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
