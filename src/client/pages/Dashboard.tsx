import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const eur = (n: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const OBJECTIF = 70000;

function Card({ title, children, className = '' }: { title: string; children: any; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm p-4 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    setError('');
    api.get('/dashboard' + (q.toString() ? '?' + q : ''))
      .then(setData)
      .catch((e) => setError(e.message || 'Erreur de chargement'));
  }, [from, to, tick]);

  const marquerPaye = async (id: number) => {
    try {
      await api.put('/bookings/' + id, { etat: 'paye' });
      setTick((t) => t + 1);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    }
  };

  if (error) return <div className="bg-red-100 text-red-800 rounded-md p-3 text-sm">{error}</div>;
  if (!data) return <div className="text-slate-500">Chargement…</div>;

  const imp = typeof data.impayes === 'object' && data.impayes ? data.impayes : { count: data.impayes, total: 0, detail: [] };
  const impayes = Number(imp.count) || 0;
  const impayesTotal = Number(imp.total) || 0;
  const impayesDetail: any[] = imp.detail || [];
  const caLoc = typeof data.ca_location === 'object' && data.ca_location ? data.ca_location : { total: data.ca_location };
  const caLongue = Number(data.ca_longue ?? caLoc.ca_longue) || 0;
  const caCourte = Number(data.ca_courte ?? caLoc.ca_courte) || 0;
  const ca = Number(caLoc.total) || 0;
  const objectif = Number(caLoc.objectif) || OBJECTIF;
  const pct = Math.min(100, Math.round((ca / objectif) * 100));
  const associes = [data.tresorerie_bilel, data.tresorerie_oussama].filter(Boolean);
  const vacantes = data.vitrines_vacantes || [];
  const resas = data.prochaines_reservations || [];
  const ops = data.dernieres_operations || [];
  const lieux = data.repartition_par_lieu || [];
  const alertes = data.alertes || [];
  const maxLieu = Math.max(1, ...lieux.map((l: any) => l.count || 0));
  const alertLabel = (a: any) =>
    a.type === 'vitrine_non_fonctionnelle'
      ? `Vitrine hors service : ${a.vitrine?.modele || a.vitrine?.numero_serie || '#' + a.vitrine?.id}`
      : `Réservation en retard : ${a.booking?.client_name || '#' + a.booking?.id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Tableau de bord</h1>
        <div className="flex items-center gap-2 text-sm">
          <input aria-label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1" />
          <span className="text-slate-400">→</span>
          <input aria-label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1" />
          {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="text-teal-700 hover:underline">Réinitialiser</button>}
        </div>
      </div>

      {alertes.length > 0 && (
        <Card title="Alertes & points d'attention">
          <div className="flex flex-wrap gap-2">
            {alertes.map((a: any, i: number) => (
              <span key={i} className="bg-red-100 text-red-800 text-xs font-medium rounded-full px-3 py-1">{alertLabel(a)}</span>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Impayés" className={impayes > 0 ? 'border-red-300 bg-red-50' : ''}>
          <div className={`text-3xl font-bold ${impayes > 0 ? 'text-red-700' : 'text-green-700'}`}>{impayes}</div>
          <div className="text-xs text-slate-500">{impayes > 0 ? `${impayes} réservation${impayes > 1 ? 's' : ''} · ${eur(impayesTotal)}` : 'tout est réglé'}</div>
        </Card>
        <Card title="CA Location (objectif 70k)">
          <div className="text-3xl font-bold text-slate-800">{eur(ca)}</div>
          <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-teal-600" style={{ width: pct + '%' }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{pct}% de l'objectif annuel ({eur(objectif)})</div>
          <div className="flex justify-between text-xs text-slate-600 mt-2">
            <span>CA Longue durée : <strong>{eur(caLongue)}</strong></span>
            <span>CA Courte durée : <strong>{eur(caCourte)}</strong></span>
          </div>
        </Card>
        <Card title="Vitrines vacantes">
          <div className="text-3xl font-bold text-slate-800">{vacantes.length}</div>
          <div className="text-xs text-slate-500">sans réservation en cours</div>
        </Card>
        <Card title="Valeur du parc">
          <div className="text-3xl font-bold text-slate-800">{eur(data.valeur_parc)}</div>
          <div className="text-xs text-slate-500">prix d'achat cumulé</div>
        </Card>
        <Card title="Trésorerie par associé" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {associes.map((a: any) => (
              <div key={a.qui} className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600">{a.qui}</div>
                <div className="text-xl font-semibold text-teal-700">{eur(a.total)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {impayesDetail.length > 0 && (
        <Card title={`Impayés à relancer (${eur(impayesTotal)})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 text-xs"><th className="py-1 pr-3">Client</th><th className="pr-3">Vitrine</th><th className="pr-3">Montant</th><th className="pr-3">Période</th><th className="pr-3">Téléphone</th><th></th></tr></thead>
              <tbody>
                {impayesDetail.map((b: any) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-1 pr-3 font-medium">{b.client_name}</td>
                    <td className="pr-3">{b.vitrine_model || '#' + b.vitrine_id}</td>
                    <td className="pr-3 font-medium text-red-700">{eur(b.montant)}</td>
                    <td className="pr-3">{b.start_date} · {b.duration_months} mois{b.type_duree ? ` (${b.type_duree})` : ''}</td>
                    <td className="pr-3">{b.tel_client ? <a href={'tel:' + b.tel_client} className="text-teal-700 hover:underline">{b.tel_client}</a> : '—'}</td>
                    <td className="text-right"><button onClick={() => marquerPaye(b.id)} className="bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-md px-2 py-1">Marquer payé</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Prochaines réservations">
          {resas.length === 0 ? <div className="text-sm text-slate-500">Aucune réservation à venir</div> : (
            <ul className="divide-y divide-slate-100">
              {resas.map((r: any) => (
                <li key={r.id} className="py-2 flex justify-between text-sm">
                  <span><strong>{r.client_name}</strong> <span className="text-slate-500">· {r.start_date}</span></span>
                  <span className="font-medium">{eur(r.montant)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Répartition du parc par lieu">
          {lieux.length === 0 ? <div className="text-sm text-slate-500">Aucun lieu</div> : (
            <ul className="space-y-2">
              {lieux.map((l: any) => (
                <li key={l.lieu_id} className="text-sm">
                  <div className="flex justify-between"><span>{l.lieu}</span><span className="font-medium">{l.count}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: (l.count / maxLieu) * 100 + '%' }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Dernières opérations">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs"><th className="py-1 pr-3">Mois</th><th className="pr-3">Type</th><th className="pr-3">Client</th><th className="pr-3">Qui</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {ops.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-500">Aucune opération</td></tr>}
              {ops.map((o: any) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="py-1 pr-3">{o.mois || o.date}</td><td className="pr-3">{o.type_flux}</td><td className="pr-3">{o.client}</td><td className="pr-3">{o.qui}</td>
                  <td className={`text-right font-medium ${Number(o.montant) < 0 ? 'text-red-700' : 'text-green-700'}`}>{eur(o.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
