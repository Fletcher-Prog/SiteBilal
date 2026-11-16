import { useState, type FormEvent } from 'react';
import api from '../lib/api.js';
import { Field, Modal, btnDanger, btnPrimary, btnSecondary, eur, inputCls } from '../pages/Vitrines.js';

const today = () => new Date().toISOString().slice(0, 10);
const toNum = (s: string) => (s === '' ? null : Number(s));

// `vente` absente = nouvelle vente de `vitrine`. `vitrines` (optionnel) permet de choisir/rattacher la vitrine.
export default function VenteModal({ vitrine, vente, vitrines, onClose, onSaved }: {
  vitrine?: any; vente?: any; vitrines?: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    vitrine_id: String(vente?.vitrine_id ?? vitrine?.id ?? ''),
    prix_achat: String(vente?.prix_achat ?? vitrine?.prix_achat ?? ''),
    frais: String(vente?.frais ?? vitrine?.prix_reparation ?? 0),
    date_achat: vente?.date_achat ?? vitrine?.date_achat ?? '',
    prix_vente: String(vente?.prix_vente ?? ''),
    date_vente: vente?.date_vente ?? today(),
    commentaire: vente?.commentaire ?? '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const marge = (Number(f.prix_vente) || 0) - (Number(f.prix_achat) || 0) - (Number(f.frais) || 0);
  const label = vitrine ? `${vitrine.serial} — ${vitrine.model}` : null;

  const pickVitrine = (e: any) => {
    const v = vitrines?.find((x) => String(x.id) === e.target.value);
    setF({ ...f, vitrine_id: e.target.value, ...(v && !vente?.prix_achat ? { prix_achat: String(v.prix_achat ?? ''), frais: String(v.prix_reparation ?? 0), date_achat: v.date_achat ?? '' } : {}) });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const body = {
      vitrine_id: f.vitrine_id === '' ? null : Number(f.vitrine_id),
      prix_achat: toNum(f.prix_achat), prix_vente: toNum(f.prix_vente), frais: toNum(f.frais) ?? 0,
      date_achat: f.date_achat || null, date_vente: f.date_vente || null, commentaire: f.commentaire,
    };
    try {
      if (vente?.id) await api.put(`/ventes/${vente.id}`, body); else await api.post('/ventes', body);
      onSaved();
    } catch (x: any) { setErr(x.message); setBusy(false); }
  };
  const annuler = async () => {
    setBusy(true);
    try { await api.delete(`/ventes/${vente.id}`); onSaved(); } catch (x: any) { setErr(x.message); setBusy(false); }
  };

  return (
    <Modal title={vente?.id ? 'Modifier la vente' : 'Vendre la vitrine'} onClose={onClose}>
      <form onSubmit={submit} data-testid="vente-form">
        {label && !vitrines ? (
          <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">Vitrine : </span><strong>{label}</strong></div>
        ) : (
          <Field label="Vitrine">
            <select name="vitrine_id" className={inputCls} value={f.vitrine_id} onChange={pickVitrine}>
              <option value="">— Sans fiche vitrine —</option>
              {(vitrines ?? []).map((v) => <option key={v.id} value={v.id}>{v.serial} — {String(v.model).slice(0, 40)}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix d'achat (€)"><input name="prix_achat" className={inputCls} type="number" min="0" step="any" inputMode="decimal" value={f.prix_achat} onChange={set('prix_achat')} /></Field>
          <Field label="Date d'achat"><input name="date_achat" className={inputCls} type="date" value={f.date_achat} onChange={set('date_achat')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frais / réparations (€)"><input name="frais" className={inputCls} type="number" min="0" step="any" inputMode="decimal" value={f.frais} onChange={set('frais')} /></Field>
          <Field label="Prix de vente (€) *"><input name="prix_vente" className={inputCls} type="number" min="0" step="any" inputMode="decimal" required value={f.prix_vente} onChange={set('prix_vente')} /></Field>
        </div>
        <Field label="Date de vente"><input name="date_vente" className={inputCls} type="date" value={f.date_vente} onChange={set('date_vente')} /></Field>
        <Field label="Commentaire / acheteur"><textarea name="commentaire" className={inputCls} rows={2} value={f.commentaire} onChange={set('commentaire')} /></Field>
        <div className="mb-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Marge</span>
          <strong data-testid="vente-marge" className={marge >= 0 ? 'text-green-700' : 'text-red-700'}>{eur(marge)}</strong>
        </div>
        {err && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}
        {confirmDel ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-slate-600">La vitrine redeviendra disponible.</span>
            <button type="button" className={btnSecondary} onClick={() => setConfirmDel(false)}>Non</button>
            <button type="button" className={btnDanger} disabled={busy} onClick={annuler}>Confirmer l'annulation</button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {vente?.id && <button type="button" className={btnDanger + ' mr-auto'} onClick={() => setConfirmDel(true)}>Annuler la vente</button>}
            <button type="button" className={btnSecondary} onClick={onClose}>Fermer</button>
            <button type="submit" className={btnPrimary} disabled={busy}>{vente?.id ? 'Enregistrer' : 'Valider la vente'}</button>
          </div>
        )}
      </form>
    </Modal>
  );
}
