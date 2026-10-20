import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { PageHeader, Status, Field, inputCls, btnPrimary, btnGhost, card } from '../components/ui.js';

type Def = { key: string; label: string; area?: boolean; type?: string };
const SECTIONS: { id: string; title: string; fields: Def[] }[] = [
  {
    id: 'company', title: 'Informations entreprise',
    fields: [
      { key: 'company_nom', label: 'Nom' }, { key: 'company_adresse', label: 'Adresse' }, { key: 'company_siret', label: 'SIRET' },
      { key: 'company_tel', label: 'Téléphone', type: 'tel' }, { key: 'company_email', label: 'Email', type: 'email' },
    ],
  },
  {
    id: 'template', title: 'Template devis/facture',
    fields: [
      { key: 'template_entete', label: 'En-tête', area: true }, { key: 'template_pied', label: 'Pied de page', area: true },
      { key: 'template_cgv', label: 'CGV', area: true }, { key: 'template_tva', label: 'Taux TVA (%)', type: 'number' },
    ],
  },
];

export default function Parametres() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [ips, setIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api.get('/settings')
      .then((r: any) => {
        const o: Record<string, string> = {};
        if (Array.isArray(r)) r.forEach((s: any) => (o[s.cle ?? s.key] = s.valeur ?? s.value ?? ''));
        else Object.entries(r || {}).forEach(([k, v]) => (o[k] = v == null ? '' : String(v)));
        setValues(o);
        try { const l = JSON.parse(o.ip_whitelist || '[]'); setIps(Array.isArray(l) ? l.map(String) : []); } catch { setIps([]); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (id: string, payload: Record<string, string>) => {
    setSaving(id); setError(''); setOk('');
    try { await api.put('/settings', payload); setOk(id); } catch (err: any) { setError(err.message); }
    finally { setSaving(''); }
  };
  const saveSection = (e: React.FormEvent, id: string, fields: Def[]) => {
    e.preventDefault();
    persist(id, Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ''])));
  };
  const saveIps = (list: string[]) => { setIps(list); persist('ips', { ip_whitelist: JSON.stringify(list) }); };
  const addIp = () => {
    const ip = newIp.trim();
    if (!ip || ips.includes(ip)) return;
    setNewIp(''); saveIps([...ips, ip]);
  };
  const okMsg = (id: string) => ok === id && <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700" role="status">Paramètres enregistrés.</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Paramètres" />
      <Status loading={loading} error={error} />
      {!loading && (
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <form key={s.id} onSubmit={(e) => saveSection(e, s.id, s.fields)} className={`${card} p-5`}>
              <h2 className="text-base font-semibold mb-3">{s.title}</h2>
              {s.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.area
                    ? <textarea rows={3} value={values[f.key] ?? ''} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setOk(''); }} className={inputCls} />
                    : <input type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} value={values[f.key] ?? ''} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setOk(''); }} className={inputCls} />}
                </Field>
              ))}
              {okMsg(s.id)}
              <button type="submit" className={btnPrimary} disabled={saving === s.id}>{saving === s.id ? 'Enregistrement…' : 'Enregistrer'}</button>
            </form>
          ))}
          <div className={`${card} p-5`}>
            <h2 className="text-base font-semibold mb-3">IPs autorisées</h2>
            {ips.length === 0 && <p className="text-slate-500 mb-3">Aucune IP autorisée.</p>}
            <ul className="mb-3 divide-y divide-slate-100">
              {ips.map((ip) => (
                <li key={ip} className="flex items-center justify-between py-2 text-sm">
                  <span>{ip}</span>
                  <button type="button" className={btnGhost} onClick={() => saveIps(ips.filter((x) => x !== ip))}>Supprimer</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mb-3">
              <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="192.168.1.10" className={inputCls} />
              <button type="button" className={btnGhost} onClick={addIp}>Ajouter</button>
            </div>
            {okMsg('ips')}
          </div>
        </div>
      )}
    </div>
  );
}
