import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';

export const hasNfc = typeof window !== 'undefined' && 'NDEFReader' in window;

export async function scanNfc(): Promise<string | null> {
  if (!hasNfc) return null;
  const ndef = new (window as any).NDEFReader();
  await ndef.scan();
  return new Promise(resolve => {
    ndef.onreading = (event: any) => {
      ndef.onreading = null;
      const decoder = new TextDecoder();
      for (const record of event.message.records) {
        if (record.recordType === 'url') {
          const match = decoder.decode(record.data).match(/\/vitrines\/(\d+)/);
          if (match) { resolve(match[1]); return; }
        }
        if (record.recordType === 'text') {
          resolve(decoder.decode(record.data));
          return;
        }
      }
      resolve(event.serialNumber || null);
    };
  });
}

export async function writeNfc(data: string): Promise<boolean> {
  if (!hasNfc) return false;
  const ndef = new (window as any).NDEFReader();
  await ndef.write({ records: [{ recordType: 'url', data: `${window.location.origin}/vitrines/${data}` }] });
  return true;
}

export const isOk = (v: any) => v.fonctionnelle !== 0;
export const eur = (n: any) =>
  n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const EtatBadge = ({ v }: { v: any }) =>
  isOk(v)
    ? <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Fonctionnelle</span>
    : <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">En panne</span>;

export const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100';
export const btnPrimary = 'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';
export const btnSecondary = 'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
export const btnDanger = 'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" aria-label="Fermer" className="px-2 text-2xl leading-none text-slate-500" onClick={onClose}>&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function VitrineForm({ initial, lieux, onSaved, onCancel, prefillNfc }: { initial?: any; lieux: any[]; onSaved: (v: any) => void; onCancel: () => void; prefillNfc?: string }) {
  const [f, setF] = useState({
    serial: initial?.serial ?? '',
    model: initial?.model ?? '',
    prix_achat: initial?.prix_achat ?? '',
    prix_reparation: initial?.prix_reparation ?? '',
    lieu_id: initial?.lieu_id ?? '',
    nfc_tag: initial?.nfc_tag ?? prefillNfc ?? '',
    commentaire: initial?.commentaire ?? '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      ...f,
      prix_achat: f.prix_achat === '' ? null : Number(f.prix_achat),
      prix_reparation: f.prix_reparation === '' ? 0 : Number(f.prix_reparation),
      lieu_id: f.lieu_id === '' ? null : Number(f.lieu_id),
      nfc_tag: f.nfc_tag || null,
      ...(initial ? {} : { fonctionnelle: 1 }),
    };
    try {
      onSaved(initial ? await api.put(`/vitrines/${initial.id}`, body) : await api.post('/vitrines', body));
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field label="Modèle *"><input className={inputCls} required maxLength={80} value={f.model} onChange={set('model')} placeholder="Ex : Vitrine Elite Froid 2m" /></Field>
      <Field label="N° de série *"><input className={inputCls} required maxLength={40} value={f.serial} onChange={set('serial')} placeholder="Ex : V-058" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix d'achat (€)"><input className={inputCls} type="number" min="0" step="any" inputMode="decimal" value={f.prix_achat} onChange={set('prix_achat')} /></Field>
        <Field label="Réparations (€)"><input className={inputCls} type="number" min="0" step="any" inputMode="decimal" value={f.prix_reparation} onChange={set('prix_reparation')} /></Field>
      </div>
      <Field label="Lieu">
        <select className={inputCls} value={f.lieu_id} onChange={set('lieu_id')}>
          <option value="">— Aucun —</option>
          {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>
      </Field>
      <Field label="Tag NFC"><input className={inputCls} value={f.nfc_tag} onChange={set('nfc_tag')} /></Field>
      <Field label="Commentaire"><textarea className={inputCls} rows={2} value={f.commentaire} onChange={set('commentaire')} /></Field>
      {err && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onCancel}>Annuler</button>
        <button type="submit" className={btnPrimary} disabled={busy}>{initial ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </form>
  );
}

export default function Vitrines() {
  const nav = useNavigate();
  const [vitrines, setVitrines] = useState<any[]>([]);
  const [lieux, setLieux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [lieu, setLieu] = useState('');
  const [etat, setEtat] = useState('');
  const [adding, setAdding] = useState(false);
  const [nfcOpen, setNfcOpen] = useState(false);
  const [serialQ, setSerialQ] = useState('');
  const [nfcPrefill, setNfcPrefill] = useState('');
  const [nfcMsg, setNfcMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showIosNfcGuide, setShowIosNfcGuide] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    if (!copyId) return;
    try { await navigator.clipboard.writeText(`${location.origin}/vitrines/${copyId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setNfcMsg(`URL : ${location.origin}/vitrines/${copyId}`); }
  };

  const handleScan = async () => {
    setNfcMsg('');
    if (!hasNfc) { setShowIosNfcGuide(true); setNfcMsg("Sur iPhone : approchez un badge NFC encodé, iOS l'ouvrira automatiquement dans Safari."); return; }
    setScanning(true);
    try {
      const tag = await scanNfc();
      if (!tag) { setNfcMsg('Badge illisible.'); return; }
      const found = vitrines.find(v => v.nfc_tag === tag || String(v.id) === tag);
      if (found) nav(`/vitrines/${found.id}`);
      else { setNfcPrefill(tag); setAdding(true); }
    } catch (e: any) {
      setNfcMsg(`Erreur NFC : ${e.message}`);
    } finally { setScanning(false); }
  };

  const searchSerial = (e: FormEvent) => {
    e.preventDefault();
    const s = serialQ.trim().toLowerCase();
    const found = vitrines.find(v => (v.serial ?? '').toLowerCase() === s || (v.nfc_tag ?? '').toLowerCase() === s);
    if (found) nav(`/vitrines/${found.id}`);
    else setNfcMsg(`Aucune vitrine pour « ${serialQ} ».`);
  };

  useEffect(() => {
    Promise.all([api.get('/vitrines'), api.get('/lieux').catch(() => [])])
      .then(([v, l]) => { setVitrines(v); setLieux(l); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const lieuNom = (id: any) => lieux.find(l => l.id === id)?.nom ?? '—';
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return vitrines.filter(v =>
      (!s || `${v.serial ?? ''} ${v.model ?? ''}`.toLowerCase().includes(s)) &&
      (!lieu || String(v.lieu_id) === lieu) &&
      (!etat || (etat === 'fonctionnelle') === isOk(v)));
  }, [vitrines, q, lieu, etat]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Parc vitrines</h1>
          <p className="text-sm text-slate-500">{list.length} vitrines affichées · {vitrines.length} au total</p>
        </div>
        <button className={btnPrimary} onClick={() => setAdding(true)}>+ Ajouter une vitrine</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className={inputCls + ' min-w-[180px] flex-1'} type="search" placeholder="Rechercher par n° de série ou modèle…" aria-label="Rechercher" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputCls + ' !w-auto'} aria-label="Filtrer par lieu" value={lieu} onChange={e => setLieu(e.target.value)}>
          <option value="">Tous les lieux</option>
          {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>
        <select className={inputCls + ' !w-auto'} aria-label="Filtrer par état" value={etat} onChange={e => setEtat(e.target.value)}>
          <option value="">Tous les états</option>
          <option value="fonctionnelle">Fonctionnelle</option>
          <option value="panne">En panne</option>
        </select>
      </div>

      <button className={btnPrimary + ' mb-3 w-full md:hidden'} disabled={scanning} onClick={handleScan}>📱 {scanning ? 'Approchez le badge…' : 'Scanner NFC'}</button>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold" aria-expanded={nfcOpen} onClick={() => setNfcOpen(o => !o)}>
          <span>Zone NFC / recherche par série</span><span>{nfcOpen ? '▲' : '▼'}</span>
        </button>
        {nfcOpen && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4">
            <form className="flex min-w-[200px] flex-1 gap-2" onSubmit={searchSerial}>
              <input className={inputCls} placeholder="N° de série ou badge (ex : V-058)" aria-label="Recherche série ou badge" value={serialQ} onChange={e => setSerialQ(e.target.value)} />
              <button type="submit" className={btnSecondary}>Ouvrir</button>
            </form>
            <button type="button" className={btnPrimary + ' hidden md:inline-flex'} disabled={scanning} onClick={handleScan}>📱 {scanning ? 'Approchez le badge…' : 'Scanner NFC'}</button>
          </div>
        )}
      </div>
      {nfcMsg && <div role="status" className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{nfcMsg}</div>}
      {!hasNfc && (
        <div className="mb-4">
          <button type="button" className={btnSecondary + ' !border-amber-300 !bg-amber-50 !text-amber-800 hover:!bg-amber-100'} aria-expanded={showIosNfcGuide} onClick={() => setShowIosNfcGuide(s => !s)}>📱 Encoder via Raccourci iOS</button>
          {showIosNfcGuide && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
              <p className="mb-2 text-sm text-slate-700">Choisissez une vitrine ci-dessous, puis copiez son URL pour l'encoder sur un badge NFC.</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <select className={inputCls + ' !w-auto min-w-[180px]'} aria-label="Vitrine à encoder" value={copyId} onChange={e => setCopyId(e.target.value)}>
                  <option value="">Choisir une vitrine…</option>
                  {vitrines.map(v => <option key={v.id} value={v.id}>{v.serial} — {v.model}</option>)}
                </select>
                <button type="button" className={btnSecondary} disabled={!copyId} onClick={copyUrl}>{copied ? 'Copié ✓' : "Copier l'URL"}</button>
              </div>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-700">
                <li>Ouvrez l'app <strong>Raccourcis</strong> sur votre iPhone</li>
                <li>Créez un nouveau raccourci → <strong>Ajouter une action</strong> → cherchez <strong>« Définir la balise NFC »</strong></li>
                <li>Dans le champ URL, collez l'URL de la vitrine</li>
                <li>Lancez le raccourci et approchez un badge NFC vierge</li>
              </ol>
              <p className="mt-3 text-sm text-slate-700">Astuce : Vous pouvez aussi utiliser l'app gratuite <strong>NFC Tools</strong> (App Store).</p>
              <button type="button" className={btnSecondary + ' mt-3'} onClick={() => setShowIosNfcGuide(false)}>Fermer</button>
            </div>
          )}
        </div>
      )}

      {error && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
              {['Serial', 'Modèle', 'Lieu', 'État', 'Prix achat', 'NFC'].map(h => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Chargement…</td></tr>}
            {!loading && !list.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucune vitrine ne correspond aux filtres.</td></tr>}
            {list.map(v => (
              <tr key={v.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => nav(`/vitrines/${v.id}`)}>
                <td className="px-3 py-2.5 font-mono font-semibold text-teal-800">{v.serial}</td>
                <td className="max-w-[260px] px-3 py-2.5">{v.model}</td>
                <td className="px-3 py-2.5">{lieuNom(v.lieu_id)}</td>
                <td className="px-3 py-2.5"><EtatBadge v={v} /></td>
                <td className="px-3 py-2.5 tabular-nums">{eur(v.prix_achat)}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{v.nfc_tag || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Ajouter une vitrine" onClose={() => { setAdding(false); setNfcPrefill(''); }}>
          <VitrineForm lieux={lieux} prefillNfc={nfcPrefill} onCancel={() => { setAdding(false); setNfcPrefill(''); }} onSaved={v => { setVitrines(p => [...p, v]); setAdding(false); setNfcPrefill(''); }} />
        </Modal>
      )}
    </div>
  );
}
