import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useList, PageHeader, Status, Modal, Field, FormActions, useSave, eur, num, inputCls, btnPrimary, btnGhost, btnDanger, card } from '../components/ui.js';
import { btnSecondary } from './Vitrines.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmtMonth = (m: string) => { const [y, mo] = m.split('-'); return `${MONTHS[Number(mo) - 1]} ${y}`; };

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
    <tr><th>Début</th><td>${esc(contrat.date_debut) || '—'}</td></tr>
    <tr><th>Fin</th><td>${esc(contrat.date_fin) || '—'}</td></tr>
    <tr><th>Durée</th><td>${esc(contrat.duree)} mois</td></tr>
    <tr><th>Montant mensuel</th><td>${esc(contrat.montant || 0)} €</td></tr>
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
  const cli = useList('/clients');
  const [edit, setEdit] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [factureFor, setFactureFor] = useState<any | null>(null);
  const [factures, setFactures] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const { save, saving, error: saveErr } = useSave('/contrats', () => { setEdit(null); setDetail(null); reload(); });

  useEffect(() => { api.get('/settings').then(setSettings).catch(() => {}); }, []);

  const client = (c: any) => c.client_nom || c.client || '—';
  const vitrine = (c: any) => {
    const v = vit.data.find((x: any) => x.id === c.vitrine_id);
    return v ? `${v.serial} — ${v.model}` : c.vitrine_nom || (c.vitrine_id ? `Vitrine #${c.vitrine_id}` : '—');
  };

  const openFacture = async (c: any) => {
    setFactureFor(c);
    try {
      const f = await api.get(`/factures?contrat_id=${c.id}`);
      setFactures(f);
    } catch { setFactures([]); }
  };

  const toggleFactureStatus = async (f: any) => {
    const endpoint = f.statut === 'payee' ? `/factures/${f.id}/impayee` : `/factures/${f.id}/payer`;
    await api.put(endpoint, {});
    if (factureFor) openFacture(factureFor);
  };

  const printFacturePdf = (f: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const tva = Number(settings.tva) || 0;
    const ht = Number(f.montant) || 0;
    const tvaAmt = ht * tva / 100;
    const ttc = ht + tvaAmt;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Facture ${esc(f.client)} — ${fmtMonth(f.periode)}</title>
<style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:auto}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:left}
.total{margin-top:16px;text-align:right;font-size:1.1em}.actions{margin-top:24px;text-align:center}button{padding:8px 24px;background:#0d9488;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin:0 8px}button.close{background:#64748b}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}.paid{background:#d1fae5;color:#065f46}.unpaid{background:#fef3c7;color:#92400e}</style></head><body>
${settings.entete ? `<p>${esc(settings.entete)}</p>` : ''}
<h1>Facture — ${esc(fmtMonth(f.periode))}</h1>
<p><strong>Client :</strong> ${esc(f.client)}</p>
<p><strong>Vitrine :</strong> ${esc(f.vitrine_serial ? `${f.vitrine_serial} — ${f.vitrine_model}` : `#${f.vitrine_id}`)}</p>
<p>Date d'émission : ${esc(f.date_emission || new Date().toLocaleDateString('fr-FR'))}</p>
<p>Statut : <span class="badge ${f.statut === 'payee' ? 'paid' : 'unpaid'}">${f.statut === 'payee' ? 'Payée' : 'En attente'}</span></p>
<table><thead><tr><th>Période</th><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
<tbody><tr><td>${esc(fmtMonth(f.periode))}</td><td>Location vitrine</td><td style="text-align:right">${esc(eur(ht))}</td></tr></tbody></table>
<div class="total">
<p>Total HT : <strong>${esc(eur(ht))}</strong></p>
${tva ? `<p>TVA (${tva}%) : ${esc(eur(tvaAmt))}</p><p><strong>Total TTC : ${esc(eur(ttc))}</strong></p>` : ''}
</div>
${settings.cgv ? `<p style="margin-top:24px;font-size:12px;color:#666">${esc(settings.cgv)}</p>` : ''}
<div class="actions"><button onclick="window.print()">Imprimer</button><button class="close" onclick="window.close()">Fermer</button></div>
</body></html>`);
    w.document.close();
    w.focus();
  };
  const remove = async (c: any) => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try { await api.delete(`/contrats/${c.id}`); setDetail(null); reload(); } catch (e: any) { setError(e.message); }
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date_debut = f.get('date_debut') as string || null;
    const date_fin = f.get('date_fin') as string || null;
    let duree = num(String(f.get('duree')));
    if (date_debut && date_fin && !duree) {
      const d1 = new Date(date_debut), d2 = new Date(date_fin);
      duree = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }
    save(edit.id, {
      client: f.get('client'), vitrine_id: num(String(f.get('vitrine_id') || '')), duree,
      montant: num(String(f.get('montant'))), caution: num(String(f.get('caution'))), conditions: f.get('conditions'),
      date_debut, date_fin,
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
              <tr>{['Client', 'Vitrine', 'Début', 'Fin', 'Mensuel', 'Caution', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(c)}>
                  <td className="px-3 py-2 font-medium">{client(c)}</td>
                  <td className="px-3 py-2">{vitrine(c)}</td>
                  <td className="px-3 py-2">{c.date_debut || '—'}</td>
                  <td className="px-3 py-2">{c.date_fin || '—'}</td>
                  <td className="px-3 py-2">{eur(c.montant)}</td>
                  <td className="px-3 py-2">{eur(c.caution)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><button className={btnGhost} onClick={() => exportContratPdf(c)}>📄 Contrat</button> <button className={btnGhost} onClick={() => openFacture(c)}>📋 Facture</button> <button className={btnGhost} onClick={() => setEdit(c)}>Modifier</button></td>
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
            <dt className="text-slate-500">Début</dt><dd>{detail.date_debut || '—'}</dd>
            <dt className="text-slate-500">Fin</dt><dd>{detail.date_fin || '—'}</dd>
            <dt className="text-slate-500">Durée</dt><dd>{detail.duree != null ? `${detail.duree} mois` : '—'}</dd>
            <dt className="text-slate-500">Montant mensuel</dt><dd>{eur(detail.montant)}</dd>
            <dt className="text-slate-500">Caution</dt><dd>{eur(detail.caution)}</dd>
            <dt className="text-slate-500 col-span-2">Conditions</dt>
            <dd className="col-span-2 whitespace-pre-wrap">{detail.conditions || '—'}</dd>
          </dl>
          <div className="flex justify-end gap-2 mt-5">
            <button className={btnDanger} onClick={() => remove(detail)}>Supprimer</button>
            <button className={btnSecondary} onClick={() => { setDetail(null); openFacture(detail); }}>Voir factures</button>
            <button className={btnPrimary} onClick={() => setEdit(detail)}>Modifier</button>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.id ? 'Modifier le contrat' : 'Nouveau contrat'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <Field label="Client">
              <input name="client" required defaultValue={edit.client ?? edit.client_nom ?? ''} className={inputCls} list="client-list" placeholder="Saisir ou choisir un client" />
              <datalist id="client-list">
                {cli.data.map((c: any) => <option key={c.id} value={c.nom} />)}
              </datalist>
            </Field>
            <Field label="Vitrine">
              <select name="vitrine_id" defaultValue={edit.vitrine_id ?? ''} className={inputCls}>
                <option value="">—</option>
                {vit.data.map((x: any) => <option key={x.id} value={x.id}>{x.nom || x.serial || x.model || `#${x.id}`}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date début *"><input name="date_debut" type="date" required defaultValue={edit.date_debut ?? ''} className={inputCls} /></Field>
              <Field label="Date fin *"><input name="date_fin" type="date" required defaultValue={edit.date_fin ?? ''} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Durée (mois)"><input name="duree" type="number" min={0} defaultValue={edit.duree ?? ''} className={inputCls} placeholder="Auto si dates" /></Field>
              <Field label="Montant mensuel (€)"><input name="montant" type="number" step="any" defaultValue={edit.montant ?? ''} className={inputCls} /></Field>
              <Field label="Caution (€)"><input name="caution" type="number" step="any" defaultValue={edit.caution ?? ''} className={inputCls} /></Field>
            </div>
            <Field label="Conditions"><textarea name="conditions" rows={3} defaultValue={edit.conditions ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {factureFor && (
        <Modal title={`Factures — ${client(factureFor)}`} onClose={() => setFactureFor(null)}>
          {factures.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune facture générée pour ce contrat.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {factures.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{fmtMonth(f.periode)}</span>
                    <span className="ml-2 text-slate-500">{eur(f.montant)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${f.statut === 'payee' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {f.statut === 'payee' ? 'Payée' : 'En attente'}
                    </span>
                    <button className={btnGhost} onClick={() => toggleFactureStatus(f)}>{f.statut === 'payee' ? 'Marquer impayée' : 'Marquer payée'}</button>
                    <button className={btnGhost} onClick={() => printFacturePdf(f)}>PDF</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
            <p className="text-sm text-slate-600">{factures.length} facture(s) · Total : <strong>{eur(factures.reduce((s: number, f: any) => s + (Number(f.montant) || 0), 0))}</strong></p>
            <button className={btnSecondary} onClick={() => setFactureFor(null)}>Fermer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
