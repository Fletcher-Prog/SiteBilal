import { useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../lib/api.js';
import { Field, Modal, btnPrimary, btnSecondary, eur, inputCls } from './Vitrines.js';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const TRANSPORTEURS = ['', 'Bilel', 'Oussama', 'Transports Dubois', 'Société Rapid Froid'];
const mIdx = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const parse = (s: string) => new Date(s + 'T00:00:00');
const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
const endOf = (b: any) => { const d = parse(b.start_date); d.setMonth(d.getMonth() + (b.duration_months || 1)); return d; };
const barColor = (b: any) => (b.etat === 'maintenance' ? 'bg-amber-500' : b.etat === 'impaye' ? 'bg-red-500' : 'bg-teal-600');
const today = () => new Date().toISOString().slice(0, 10);

export default function Planning() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [vitrines, setVitrines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
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

  const byMonth = useMemo(() => {
    const sorted = [...valid].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const g = new Map<string, any[]>();
    sorted.forEach(b => { const k = b.start_date.slice(0, 7); if (!g.has(k)) g.set(k, []); g.get(k)!.push(b); });
    return [...g.entries()];
  }, [valid]);

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

      {/* Desktop : Gantt */}
      <div className="hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:block" data-testid="gantt">
        <div className="mb-3 flex items-center gap-2">
          <button className={btnSecondary} aria-label="Mois précédents" onClick={() => setOffset(start - 3)}>‹</button>
          <button className={btnSecondary} aria-label="Mois suivants" onClick={() => setOffset(start + 3)}>›</button>
          <button className={btnSecondary} onClick={() => setOffset(mIdx(new Date()))}>Aujourd'hui</button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="mb-1.5 grid gap-0.5" style={{ gridTemplateColumns: '200px repeat(12, 1fr)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vitrine</div>
              {header.map((h, i) => <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">{h}</div>)}
            </div>
            {!loading && !rows.length && <div className="py-3 text-sm text-slate-500">Aucune réservation enregistrée</div>}
            {rows.map(([vid, list]) => (
              <div key={vid} className="mb-1.5 grid items-center gap-0.5" style={{ gridTemplateColumns: '200px 1fr' }}>
                <div className="truncate pr-3 text-xs font-medium" title={label(vid)}>{label(vid)}</div>
                <div className="relative h-[22px] rounded bg-slate-100">
                  {list.map(b => {
                    const st = bar(b);
                    return st && <div key={b.id} title={tip(b)} className={`absolute bottom-0.5 top-0.5 min-w-[8px] cursor-pointer rounded-sm ${barColor(b)}`} style={st} onClick={() => setEditing(b)} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-teal-600" />Payé</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />Impayé</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Maintenance</span>
        </div>
      </div>

      {/* Mobile : cartes */}
      <div className="flex flex-col gap-3 md:hidden" data-testid="planning-cards">
        {!loading && !byMonth.length && <div className="text-sm text-slate-500">Aucune réservation enregistrée</div>}
        {byMonth.map(([k, list]) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{fmt(parse(k + '-01'))}</div>
            {list.map(b => (
              <div key={b.id} className="flex min-h-[48px] items-center justify-between gap-3 border-t border-slate-100 py-2 first:border-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-teal-800">{serialOf(b.vitrine_id)}</div>
                  <div className="truncate text-xs text-slate-500">{b.client_name} · {b.duration_months} mois</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{b.montant ? eur(b.montant) : '—'}</div>
                  <div className="text-xs text-slate-500">{b.transporteur || ''}</div>
                  <button type="button" className="text-xs font-medium text-teal-700 underline" onClick={() => setEditing(b)}>Modifier</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {(adding || editing) && <BookingForm vitrines={vitrines} booking={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => { setAdding(false); setEditing(null); load(); }} />}
    </div>
  );
}

function BookingForm({ vitrines, booking, onClose, onSaved }: { vitrines: any[]; booking?: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(booking ? {
    vitrine_id: String(booking.vitrine_id ?? ''), client_name: booking.client_name ?? '', start_date: booking.start_date ?? today(),
    duration_months: String(booking.type_duree === 'courte' ? (booking.duree_jours ?? booking.duration_months ?? 1) : (booking.duration_months ?? 1)),
    montant: booking.montant ?? '', transporteur: booking.transporteur ?? '', type_duree: booking.type_duree ?? 'longue',
    qui: booking.qui ?? 'Bilel', tel_client: booking.tel_client ?? '', adresse_livraison: booking.adresse_livraison ?? '',
    maint: booking.etat === 'maintenance',
  } : { vitrine_id: '', client_name: '', start_date: today(), duration_months: '1', montant: '', transporteur: '', type_duree: 'longue', qui: 'Bilel', tel_client: '', adresse_livraison: '', maint: false });
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
            {vitrines.map(v => <option key={v.id} value={v.id}>{v.serial} — {String(v.model).slice(0, 40)}</option>)}
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
          <Field label={short ? 'Durée (jours) *' : 'Durée (mois) *'}><input className={inputCls} type="number" min="1" max={short ? 30 : 36} required value={f.duration_months} onChange={set('duration_months')} /></Field>
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
