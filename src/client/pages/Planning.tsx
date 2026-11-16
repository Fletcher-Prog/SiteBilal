import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import api from '../lib/api.js';
import { Field, Modal, btnPrimary, btnSecondary, eur, inputCls } from './Vitrines.js';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const TRANSPORTEURS = ['', 'Bilel', 'Oussama', 'Transports Dubois', 'Société Rapid Froid'];
const mIdx = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const parse = (s: string) => new Date(s + 'T00:00:00');
const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
const fmtDay = (s?: string | null) => (s ? new Date(s.length > 10 ? s : s + 'T00:00:00').toLocaleDateString('fr-FR') : '—');
const endOf = (b: any) => {
  if (b.date_fin && !isNaN(parse(b.date_fin).getTime())) return parse(b.date_fin);
  const d = parse(b.start_date);
  if (b.type_duree === 'courte' && Number(b.duree_jours) > 0) { d.setDate(d.getDate() + Number(b.duree_jours)); return d; }
  d.setMonth(d.getMonth() + (b.duration_months || 1));
  return d;
};
const barColor = (b: any) => (b.etat === 'maintenance' ? 'bg-amber-500' : b.etat === 'paye' ? 'bg-teal-600' : b.etat === 'impaye' ? 'bg-red-500' : 'bg-teal-600');
const today = () => new Date().toISOString().slice(0, 10);
const ETATS: Record<string, string> = { paye: 'Payé', impaye: 'Impayé', maintenance: 'Maintenance', annulee: 'Annulée', termine: 'Terminée' };
const dureeLabel = (jours: number | null | undefined) => (jours == null ? '—' : jours < 28 ? `${jours} jour${jours > 1 ? 's' : ''}` : `${Math.round(jours / 30)} mois`);

export default function Planning() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [vitrines, setVitrines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<{ id: number; siblings: any[] } | null>(null);
  const [offset, setOffset] = useState<number | null>(null); // first month index of the window

  const load = () =>
    Promise.all([api.get('/bookings'), api.get('/vitrines')])
      .then(([b, v]) => { setBookings(b); setVitrines(v); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const valid = useMemo(() => bookings.filter(b => b.start_date && !isNaN(parse(b.start_date).getTime())), [bookings]);
  const start = useMemo(() => {
    if (offset !== null) return offset;
    const now = mIdx(new Date());
    const future = valid.map(b => mIdx(parse(b.start_date))).filter(m => m >= now - 2);
    return future.length ? Math.min(...future) : now;
  }, [offset, valid]);

  const serialOf = (id: any) => vitrines.find(v => v.id === id)?.serial ?? `#${id}`;
  const label = (id: any) => { const v = vitrines.find(x => x.id === id); return v ? `${v.serial} — ${String(v.model).slice(0, 22)}` : `#${id}`; };
  const rows = useMemo(() => {
    const m = new Map<any, any[]>();
    valid.forEach(b => { if (!m.has(b.vitrine_id)) m.set(b.vitrine_id, []); m.get(b.vitrine_id)!.push(b); });
    m.forEach(l => l.sort((a, b) => a.start_date.localeCompare(b.start_date)));
    return [...m.entries()].sort((a, b) => String(serialOf(a[0])).localeCompare(String(serialOf(b[0]))));
  }, [valid, vitrines]);

  const header = Array.from({ length: 12 }, (_, i) => { const k = start + i; return `${MONTHS[k % 12]}${k % 12 === 0 || i === 0 ? ' ' + String(Math.floor(k / 12)).slice(2) : ''}`; });
  const bar = (b: any) => {
    const s = (parse(b.start_date).getTime() - new Date(Math.floor(start / 12), start % 12, 1).getTime());
    const e = endOf(b).getTime() - new Date(Math.floor(start / 12), start % 12, 1).getTime();
    const total = new Date(Math.floor(start / 12), start % 12 + 12, 1).getTime() - new Date(Math.floor(start / 12), start % 12, 1).getTime();
    const l = Math.max(0, s / total), r = Math.min(1, e / total);
    return r > l ? { left: `${l * 100}%`, width: `${(r - l) * 100}%` } : null;
  };

  // Clic sur la vitrine : réservation en cours, sinon la prochaine, sinon la plus récente.
  const openVitrine = (list: any[]) => {
    const t = today();
    const cur = list.find(b => b.start_date <= t && endOf(b).toISOString().slice(0, 10) >= t)
      || list.find(b => b.start_date > t) || list[list.length - 1];
    setDetail({ id: cur.id, siblings: list });
  };

  const tip = (b: any) => `${b.client_name} · ${fmt(parse(b.start_date))} → ${fmt(endOf(b))} · ${b.montant ? eur(b.montant) : 'montant non défini'} · ${b.transporteur || '?'}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Planning</h1>
          <p className="text-sm text-slate-500">{valid.length} réservations</p>
        </div>
        <button className={btnPrimary} onClick={() => setAdding(true)}>+ Ajouter une réservation</button>
      </div>
      {error && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {loading && <p className="text-slate-500">Chargement…</p>}

      {/* Gantt : même vue sur ordinateur et téléphone (défilement horizontal, colonne vitrine figée) */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:p-4 [--lbl:118px] md:[--lbl:200px]" data-testid="gantt">
        <div className="mb-3 flex items-center gap-2">
          <button className={btnSecondary} aria-label="Mois précédents" onClick={() => setOffset(start - 3)}>‹</button>
          <button className={btnSecondary} aria-label="Mois suivants" onClick={() => setOffset(start + 3)}>›</button>
          <button className={btnSecondary} onClick={() => setOffset(mIdx(new Date()))}>Aujourd'hui</button>
        </div>
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-[760px] md:min-w-[900px]">
            <div className="mb-1.5 grid gap-0.5" style={{ gridTemplateColumns: 'var(--lbl) repeat(12, 1fr)' }}>
              <div className="sticky left-0 z-10 bg-white text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vitrine</div>
              {header.map((h, i) => <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">{h}</div>)}
            </div>
            {!loading && !rows.length && <div className="py-3 text-sm text-slate-500">Aucune réservation enregistrée</div>}
            {rows.map(([vid, list]) => (
              <div key={vid} className="mb-1.5 grid items-center gap-0.5" style={{ gridTemplateColumns: 'var(--lbl) 1fr' }}>
                <button type="button" className="sticky left-0 z-10 truncate bg-white pr-2 text-left text-xs font-medium text-slate-800 hover:text-teal-700 hover:underline" title={label(vid)} data-testid="gantt-vitrine" onClick={() => openVitrine(list)}>{label(vid)}</button>
                <div className="relative h-[30px] rounded bg-slate-100 md:h-[22px]">
                  {list.map(b => {
                    const st = bar(b);
                    return st && <button type="button" key={b.id} title={tip(b)} aria-label={`Réservation ${b.client_name}`} data-testid="gantt-bar" className={`absolute bottom-0.5 top-0.5 min-w-[10px] cursor-pointer rounded-sm ${barColor(b)}`} style={st} onClick={() => setDetail({ id: b.id, siblings: list })} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-teal-600" />Payé</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />Impayé</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Maintenance</span>
          <span className="md:hidden">Glissez pour voir les mois · touchez une vitrine pour le détail</span>
        </div>
      </div>

      {detail && !editing && (
        <BookingDetail
          key={detail.id}
          id={detail.id}
          siblings={detail.siblings}
          onSelect={(id) => setDetail({ ...detail, id })}
          onClose={() => setDetail(null)}
          onEdit={(b) => setEditing(b)}
        />
      )}
      {(adding || editing) && <BookingForm vitrines={vitrines} booking={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => { setAdding(false); setEditing(null); setDetail(null); load(); }} />}
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (<><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{children}</dd></>);
}

function BookingDetail({ id, siblings, onSelect, onClose, onEdit }: { id: number; siblings: any[]; onSelect: (id: number) => void; onClose: () => void; onEdit: (b: any) => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/bookings/${id}/details`).then(setD).catch(e => setErr(e.message)); }, [id]);
  const b = d?.booking;
  const v = d?.vitrine;
  const title = v ? `${v.serial} — ${String(v.model || '').slice(0, 28)}` : 'Réservation';

  return (
    <Modal title={title} onClose={onClose}>
      <div data-testid="booking-detail">
        {siblings.length > 1 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Réservations de cette vitrine">
            {siblings.map(s => (
              <button key={s.id} type="button" onClick={() => onSelect(s.id)} className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${s.id === id ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-slate-600'}`}>
                {fmtDay(s.start_date)} · {s.client_name}
              </button>
            ))}
          </div>
        )}
        {err && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}
        {!d && !err && <p className="text-sm text-slate-500">Chargement…</p>}
        {b && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <Row k="Client">{b.client_name || '—'}</Row>
              {b.tel_client && <Row k="Téléphone"><a className="text-teal-700 underline" href={`tel:${b.tel_client}`}>{b.tel_client}</a></Row>}
              {b.adresse_livraison && <Row k="Livraison">{b.adresse_livraison}</Row>}
              <Row k="Réservée le">{fmtDay(b.created_at)}</Row>
              <Row k="Début">{fmtDay(b.date_debut)}</Row>
              <Row k="Fin">{fmtDay(b.date_fin_calculee)}</Row>
              <Row k="Durée">{dureeLabel(b.duree_jours_reels)} <span className="font-normal text-slate-500">({b.type_duree === 'courte' ? 'courte durée' : 'longue durée'})</span></Row>
              <Row k="Prix">{b.montant != null ? eur(b.montant) : '—'}</Row>
              <Row k="État"><span className={`rounded-full px-2 py-0.5 text-xs ${b.etat === 'paye' ? 'bg-green-50 text-green-700' : b.etat === 'maintenance' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{ETATS[b.etat] || 'Impayé'}</span></Row>
              {b.date_paiement && <Row k="Payée le">{fmtDay(b.date_paiement)}</Row>}
              <Row k="Encaissé par">{b.qui || '—'}</Row>
              <Row k="Transporteur">{b.transporteur || '—'}</Row>
              {v?.lieu_nom && <Row k="Lieu vitrine">{v.lieu_nom}</Row>}
            </dl>

            <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Contrats liés ({d.contrats.length})</h3>
            {d.contrats.length === 0 ? <p className="text-sm text-slate-500">Aucun contrat</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {d.contrats.map((c: any) => (
                  <li key={c.id} className="flex justify-between gap-2 py-1.5">
                    <span>{c.numero || `Contrat #${c.id}`} · {fmtDay(c.date_debut)} → {fmtDay(c.date_fin)}</span>
                    <span className="shrink-0 font-medium">{c.montant_fixe ? `${eur(c.montant_fixe)} fixe` : `${eur(c.montant)}/mois`}</span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Factures liées ({d.factures.length})</h3>
            {d.factures.length === 0 ? <p className="text-sm text-slate-500">Aucune facture</p> : (
              <>
                <ul className="divide-y divide-slate-100 text-sm" data-testid="booking-factures">
                  {d.factures.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 truncate">{f.numero || `#${f.id}`} · {f.periode || fmtDay(f.date_emission)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-medium">{eur(f.montant)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${f.statut === 'payee' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{f.statut === 'payee' ? 'Payée' : 'À payer'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2 text-center text-xs">
                  <div><div className="text-slate-500">Total</div><div className="font-semibold">{eur(d.totaux.factures)}</div></div>
                  <div><div className="text-slate-500">Payé</div><div className="font-semibold text-green-700">{eur(d.totaux.paye)}</div></div>
                  <div><div className="text-slate-500">Reste</div><div className="font-semibold text-red-700">{eur(d.totaux.impaye)}</div></div>
                </div>
              </>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={onClose}>Fermer</button>
              <button type="button" className={btnPrimary} onClick={() => onEdit(siblings.find(s => s.id === id) || b)}>Modifier</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function BookingForm({ vitrines, booking, onClose, onSaved }: { vitrines: any[]; booking?: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(booking ? {
    vitrine_id: String(booking.vitrine_id ?? ''), client_name: booking.client_name ?? '', start_date: booking.start_date ?? today(),
    duration_months: String(booking.type_duree === 'courte' ? (booking.duree_jours ?? booking.duration_months ?? 1) : (booking.duration_months ?? 1)),
    date_fin: booking.date_fin ?? '',
    montant: booking.montant ?? '', transporteur: booking.transporteur ?? '', type_duree: booking.type_duree ?? 'longue',
    qui: booking.qui ?? 'Bilel', tel_client: booking.tel_client ?? '', adresse_livraison: booking.adresse_livraison ?? '',
    maint: booking.etat === 'maintenance',
  } : { vitrine_id: '', client_name: '', start_date: today(), duration_months: '1', date_fin: '', montant: '', transporteur: '', type_duree: 'longue', qui: 'Bilel', tel_client: '', adresse_livraison: '', maint: false });
  const short = f.type_duree === 'courte';
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body = {
      vitrine_id: Number(f.vitrine_id),
      client_name: f.client_name.trim(),
      start_date: f.start_date,
      duration_months: short ? 1 : Number(f.duration_months),
      duree_jours: short ? Number(f.duration_months) : null,
      date_fin: f.date_fin || null,
      type_duree: f.type_duree,
      qui: f.qui,
      tel_client: f.tel_client.trim(),
      adresse_livraison: f.adresse_livraison.trim(),
      montant: f.montant === '' ? null : Number(f.montant),
      transporteur: f.transporteur,
      etat: f.maint ? 'maintenance' : booking && booking.etat !== 'maintenance' ? booking.etat : 'impaye',
    };
    try {
      const c = await api.post('/bookings/check-conflict', body);
      const others = (c.bookings || []).filter((x: any) => !booking || x.id !== booking.id);
      if (c.conflict && others.length) {
        const x = others[0];
        setErr(`Conflit : cette vitrine est déjà réservée (${x.client_name}, ${x.start_date}, ${x.duration_months} mois).`);
        setBusy(false);
        return;
      }
      if (booking) await api.put(`/bookings/${booking.id}`, body);
      else await api.post('/bookings', body);
      onSaved();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={booking ? 'Modifier la réservation' : 'Ajouter une réservation'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Vitrine *">
          <select className={inputCls} required value={f.vitrine_id} onChange={set('vitrine_id')}>
            <option value="">— Choisir —</option>
            {vitrines.filter(v => v.fonctionnelle === 1).map(v => <option key={v.id} value={v.id}>{v.serial} — {String(v.model).slice(0, 40)}</option>)}
          </select>
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.maint} onChange={e => setF({ ...f, maint: e.target.checked })} />Créneau de maintenance</label>
        <Field label="Type de durée">
          <select className={inputCls} value={f.type_duree} onChange={set('type_duree')}>
            <option value="longue">Longue durée (mois)</option>
            <option value="courte">Courte durée (jours)</option>
          </select>
        </Field>
        <Field label="Client *"><input className={inputCls} required maxLength={80} value={f.client_name} onChange={set('client_name')} placeholder="Ex : Ekolo — Salon gastronomie" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de début *"><input className={inputCls} type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="Date de fin"><input className={inputCls} type="date" value={f.date_fin} onChange={set('date_fin')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={short ? 'Durée (jours)' : 'Durée (mois)'}><input className={inputCls} type="number" min="1" max={short ? 365 : 36} value={f.duration_months} onChange={set('duration_months')} placeholder="Auto si date fin" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (€)"><input className={inputCls} type="number" min="0" step="any" inputMode="decimal" value={f.montant} onChange={set('montant')} /></Field>
          <Field label="Transporteur">
            <select className={inputCls} value={f.transporteur} onChange={set('transporteur')}>
              {TRANSPORTEURS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Encaissé par">
            <select className={inputCls} value={f.qui} onChange={set('qui')}>
              <option value="Bilel">Bilel</option>
              <option value="Oussama">Oussama</option>
            </select>
          </Field>
          <Field label="Téléphone client"><input className={inputCls} type="tel" value={f.tel_client} onChange={set('tel_client')} placeholder="06 12 34 56 78" /></Field>
        </div>
        <Field label="Adresse de livraison"><input className={inputCls} value={f.adresse_livraison} onChange={set('adresse_livraison')} /></Field>
        <p className="mb-3 text-xs text-slate-400">Photos livraison / enlèvement : à venir</p>
        {err && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Annuler</button>
          <button type="submit" className={btnPrimary} disabled={busy}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}
