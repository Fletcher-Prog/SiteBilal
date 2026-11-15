import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { EtatBadge, Field, Modal, VitrineForm, btnDanger, btnPrimary, btnSecondary, eur, hasNfc, inputCls, isOk, scanNfc, writeNfc } from './Vitrines.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const fmtDate = (d?: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—');
const etatLabel: Record<string, string> = { paye: 'Payé', impaye: 'Impayé', maintenance: 'Maintenance' };
const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';

export default function VitrineDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [v, setV] = useState<any>(null);
  const [lieux, setLieux] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nfcMsg, setNfcMsg] = useState('');
  const [nfcBusy, setNfcBusy] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [addingIntervention, setAddingIntervention] = useState(false);
  const [intBusy, setIntBusy] = useState(false);

  useEffect(() => {
    setV(null);
    setError('');
    Promise.all([api.get(`/vitrines/${id}`), api.get('/lieux').catch(() => [])])
      .then(([d, l]) => { setV(d); setLieux(l); })
      .catch(e => setError(e.message));
  }, [id]);

  const back = <button className="mb-3 min-h-[40px] text-sm font-medium text-slate-500 hover:text-slate-900" onClick={() => nav('/vitrines')}>← Retour</button>;
  if (!v) {
    return (
      <div>
        {back}
        {error ? <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : <p className="text-slate-500">Chargement…</p>}
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      const u = await api.put(`/vitrines/${v.id}/status`, { fonctionnelle: isOk(v) ? 0 : 1 });
      setV({ ...v, ...u });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const del = async () => {
    try { await api.delete(`/vitrines/${v.id}`); nav('/vitrines'); }
    catch (e: any) { setError(e.message); setConfirming(false); }
  };

  const writeBadge = async () => {
    setNfcMsg('');
    if (!hasNfc) { setShowIosGuide(true); return; }
    setNfcBusy(true);
    setNfcMsg('Approchez un badge NFC vierge…');
    try {
      const tagId = String(v.id);
      await writeNfc(tagId);
      const u = await api.put(`/vitrines/${v.id}/nfc`, { nfc_tag: tagId });
      setV({ ...v, ...u, nfc_tag: u?.nfc_tag ?? tagId });
      setNfcMsg(`Badge écrit : ${tagId}`);
    } catch (e: any) { setNfcMsg(`Erreur NFC : ${e.message}`); } finally { setNfcBusy(false); }
  };
  const readBadge = async () => {
    setNfcMsg('');
    if (!hasNfc) { setNfcMsg('Sur iPhone, approchez simplement un badge encodé — iOS l\'ouvrira automatiquement.'); return; }
    setNfcBusy(true);
    setNfcMsg('Approchez le badge à lire…');
    try {
      const tag = await scanNfc();
      if (!tag) { setNfcMsg('Badge illisible.'); return; }
      if (tag === v.nfc_tag || tag === String(v.id)) { setNfcMsg(`Badge ${tag} → ${v.serial} · ${v.model} (${isOk(v) ? 'fonctionnelle' : 'en panne'})`); return; }
      const all = await api.get('/vitrines');
      const o = all.find((x: any) => x.nfc_tag === tag || String(x.id) === tag);
      setNfcMsg(o ? `Badge ${tag} → ${o.serial} · ${o.model} (${isOk(o) ? 'fonctionnelle' : 'en panne'})` : `Badge ${tag} : aucune vitrine associée.`);
    } catch (e: any) { setNfcMsg(`Erreur NFC : ${e.message}`); } finally { setNfcBusy(false); }
  };
  const capital = (v.bookings ?? []).filter((b: any) => b.etat === 'paye').reduce((s: number, b: any) => s + (Number(b.montant) || 0), 0);
  const devis = () => {
    const w = window.open('', '_blank');
    if (!w) { setError("Impossible d'ouvrir la fenêtre de devis (pop-up bloqué)."); return; }
    const lines = (v.bookings ?? []).map((b: any) => `<tr><td>${esc(b.client_name)}</td><td>${esc(fmtDate(b.start_date))}</td><td>${esc(b.duration_months)} mois</td><td>${esc(eur(b.montant))}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Devis ${esc(v.serial)}</title><style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:6px;text-align:left}.actions{margin-top:24px;text-align:center}button{padding:8px 24px;background:#0d9488;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin:0 8px}button.close{background:#64748b}</style></head><body><h1>Devis — ${esc(v.serial)}</h1><p>${esc(v.model)}<br>Lieu : ${esc(lieu)}<br>Date : ${new Date().toLocaleDateString('fr-FR')}</p><p>Prix d'achat : ${esc(eur(v.prix_achat))}<br>Réparations : ${esc(eur(v.prix_reparation))}</p><table><thead><tr><th>Client</th><th>Début</th><th>Durée</th><th>Montant</th></tr></thead><tbody>${lines}</tbody></table><p><strong>CA généré : ${esc(eur(capital))}</strong></p><div class="actions"><button onclick="window.print()">Imprimer</button><button class="close" onclick="window.close()">Fermer</button></div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const lieu = lieux.find(l => l.id === v.lieu_id)?.nom ?? '—';
  const rows: [string, ReactNode][] = [
    ['Serial', <span className="font-mono">{v.serial}</span>],
    ['Modèle', v.model],
    ["Prix d'achat", eur(v.prix_achat)],
    ['Prix de réparation', eur(v.prix_reparation)],
    ['Lieu', lieu],
    ['Tag NFC', v.nfc_tag || '—'],
    ['Commentaire', v.commentaire || '—'],
  ];

  return (
    <div>
      {back}
      {error && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">{v.serial} <EtatBadge v={v} /></h1>
        <div className="flex flex-wrap gap-2">
          <button className={btnSecondary} disabled={busy} onClick={toggle}>{isOk(v) ? 'Marquer en panne' : 'Marquer fonctionnelle'}</button>
          <button className={btnPrimary} onClick={() => setEditing(true)}>Modifier</button>
          <button className={btnDanger} onClick={() => setConfirming(true)}>Supprimer</button>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Informations</h2>
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-semibold">{val}</span>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Badge NFC</h2>
        <p className="mb-3 text-sm">{v.nfc_tag ? <>Tag actuel : <span className="font-mono font-semibold">{v.nfc_tag}</span></> : 'Aucun badge associé'}</p>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={nfcBusy} onClick={writeBadge}>Écrire sur badge NFC</button>
          <button className={btnSecondary} disabled={nfcBusy} onClick={readBadge}>Lire le badge NFC</button>
        </div>
        {nfcMsg && <p role="status" className="mt-3 text-sm text-slate-700">{nfcMsg}</p>}
        {!hasNfc && (
          <div className="mt-3">
            <p className="text-sm text-slate-600">💡 Pour lire : approchez simplement un badge encodé, iOS l'ouvrira automatiquement via Safari.</p>
            {!showIosGuide && (
              <button className="mt-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600" onClick={() => setShowIosGuide(true)}>📱 Encoder via Raccourci iOS</button>
            )}
            {showIosGuide && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1 bg-white border rounded px-2 py-1 font-mono text-xs break-all">{`${location.origin}/vitrines/${v.id}`}</div>
                  <button
                    className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                    onClick={() => {
                      const url = `${location.origin}/vitrines/${v.id}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(url).then(() => setNfcMsg('URL copiée ✓')).catch(() => setNfcMsg(url));
                      } else {
                        setNfcMsg(url);
                      }
                    }}
                  >Copier</button>
                </div>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-700">
                  <li>Ouvrez l'app <strong>Raccourcis</strong> sur votre iPhone</li>
                  <li>Créez un nouveau raccourci → <strong>Ajouter une action</strong> → cherchez <strong>"Définir la balise NFC"</strong></li>
                  <li>Dans le champ URL, collez l'URL copiée ci-dessus</li>
                  <li>Lancez le raccourci et approchez un badge NFC vierge</li>
                </ol>
                <p className="mt-3 text-sm text-slate-600">Astuce : Vous pouvez aussi télécharger l'app gratuite <strong>NFC Tools</strong> sur l'App Store pour encoder.</p>
                <button className="mt-3 rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setShowIosGuide(false)}>Fermer</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CA généré</div>
          <div className="text-2xl font-semibold tabular-nums">{eur(capital)}</div>
        </div>
        <button className={btnSecondary} onClick={devis}>Générer CA</button>
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Historique des réservations</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b-2 border-slate-200">{['Client', 'Début', 'Durée', 'Montant', 'Transporteur', 'État'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {!v.bookings?.length && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Aucune réservation</td></tr>}
              {v.bookings?.map((b: any) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{b.client_name}</td>
                  <td className="px-3 py-2">{fmtDate(b.start_date)}</td>
                  <td className="px-3 py-2">{b.duration_months} mois</td>
                  <td className="px-3 py-2 tabular-nums">{eur(b.montant)}</td>
                  <td className="px-3 py-2">{b.transporteur || '—'}</td>
                  <td className="px-3 py-2">{etatLabel[b.etat] ?? b.etat ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Historique des interventions</h2>
          <button className={btnPrimary} onClick={() => setAddingIntervention(true)}>+ Intervention</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b-2 border-slate-200">{['Date', 'Type', 'Température', 'Coût', 'Notes'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {!v.interventions?.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">Aucune intervention</td></tr>}
              {v.interventions?.map((i: any) => (
                <tr key={i.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{fmtDate(i.date)}</td>
                  <td className="px-3 py-2">{i.type}</td>
                  <td className="px-3 py-2">{i.temperature != null ? `${i.temperature} °C` : '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{eur(i.cout)}</td>
                  <td className="px-3 py-2">{i.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${v.serial}`} onClose={() => setEditing(false)}>
          <VitrineForm initial={v} lieux={lieux} onCancel={() => setEditing(false)} onSaved={u => { setV({ ...v, ...u }); setEditing(false); }} />
        </Modal>
      )}
      {confirming && (
        <Modal title="Supprimer la vitrine" onClose={() => setConfirming(false)}>
          <p className="mb-4 text-sm">Supprimer définitivement <strong>{v.serial}</strong> ? Cette action est irréversible.</p>
          <div className="flex justify-end gap-2">
            <button className={btnSecondary} onClick={() => setConfirming(false)}>Annuler</button>
            <button className={btnDanger} onClick={del}>Confirmer la suppression</button>
          </div>
        </Modal>
      )}
      {addingIntervention && (
        <Modal title="Nouvelle intervention" onClose={() => setAddingIntervention(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIntBusy(true);
            const fd = new FormData(e.currentTarget);
            try {
              await api.post('/interventions', {
                vitrine_id: v.id,
                date: fd.get('date'),
                type: fd.get('type'),
                temperature: fd.get('temperature') ? Number(fd.get('temperature')) : null,
                cout: fd.get('cout') ? Number(fd.get('cout')) : null,
                notes: fd.get('notes'),
                frigoriste_id: null,
              });
              const updated = await api.get(`/vitrines/${v.id}`);
              setV(updated);
              setAddingIntervention(false);
            } catch (err: any) { setError(err.message); }
            setIntBusy(false);
          }}>
            <Field label="Date *"><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></Field>
            <Field label="Type *">
              <select name="type" required className={inputCls}>
                <option value="maintenance">Maintenance</option>
                <option value="reparation">Réparation</option>
                <option value="controle">Contrôle</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Température (°C)"><input name="temperature" type="number" step="0.1" className={inputCls} /></Field>
              <Field label="Coût (€)"><input name="cout" type="number" step="any" min="0" className={inputCls} /></Field>
            </div>
            <Field label="Notes"><textarea name="notes" rows={2} className={inputCls} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setAddingIntervention(false)}>Annuler</button>
              <button type="submit" className={btnPrimary} disabled={intBusy}>Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
