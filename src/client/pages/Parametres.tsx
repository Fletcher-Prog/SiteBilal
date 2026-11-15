import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { PageHeader, Status, Field, inputCls, btnPrimary, btnGhost, card } from '../components/ui.js';

type Def = { key: string; label: string; area?: boolean; type?: string };

const VARS_CONTRAT = 'numero, client, adresse_client, tel_client, email_client, marque, modele, serial_vitrine, nb_vitrines, equipements, date_debut, date_fin, duree, montant, montant_fixe, caution, jour_paiement, mode_paiement, option_achat_prix, conditions, company_nom, company_adresse, company_siret, company_iban, company_bic, signataire, lieu_signature, date_contrat';
const VARS_FACTURE = 'numero, client, adresse_client, tel_client, email_client, montant, tva, tva_pct, total_ttc, periode, date_emission, marque, modele, serial_vitrine, company_nom, company_adresse, company_siret, company_iban, company_bic';

const SECTIONS: { id: string; title: string; fields: Def[] }[] = [
  {
    id: 'company', title: 'Informations entreprise',
    fields: [
      { key: 'company_nom', label: 'Nom' }, { key: 'company_adresse', label: 'Adresse' }, { key: 'company_siret', label: 'SIRET' },
      { key: 'company_tel', label: 'Téléphone', type: 'tel' }, { key: 'company_email', label: 'Email', type: 'email' },
      { key: 'company_ville', label: 'Ville (juridiction)' },
    ],
  },
  {
    id: 'bank', title: 'Coordonnées bancaires',
    fields: [
      { key: 'company_iban', label: 'IBAN' }, { key: 'company_bic', label: 'BIC' },
    ],
  },
  {
    id: 'contrat', title: 'Contrats — paramètres',
    fields: [
      { key: 'company_signataire', label: 'Signataire (nom du représentant)' },
      { key: 'company_lieu_signature', label: 'Lieu de signature' },
    ],
  },
  {
    id: 'facture', title: 'Factures — paramètres',
    fields: [
      { key: 'tva', label: 'Taux TVA (%)', type: 'number' },
      { key: 'company_tva_exonere', label: 'Exonéré de TVA (1 = oui, 0 = non)' },
    ],
  },
  {
    id: 'template', title: 'Templates personnalisés',
    fields: [
      { key: 'template_contrat_html', label: 'Template contrat (HTML avec {{variables}})', area: true },
      { key: 'template_facture_html', label: 'Template facture (HTML avec {{variables}})', area: true },
    ],
  },
];

export default function Parametres() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
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
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.get('/auth/users').then((d: any) => Array.isArray(d) && setUsers(d)).catch(() => {});
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
  const isActive = (u: any) => u.active !== false && u.active !== 0;
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const created = await api.post('/auth/users', { name: newUser.name.trim(), email: newUser.email.trim(), password: newUser.password });
      setUsers((l) => [...l, created]);
      setNewUser({ name: '', email: '', password: '' }); setShowAddUser(false);
    } catch (err: any) { setError(err.message); }
  };
  const toggleUser = async (u: any) => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ active: !isActive(u) }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setUsers((l) => l.map((x) => (x.id === u.id ? { ...x, active: !isActive(u) } : x)));
    } catch (err: any) { setError(err.message); }
  };
  const deleteUser = async (u: any) => {
    if (!window.confirm(`Supprimer le compte "${u.name}" ?`)) return;
    setError('');
    try { await api.delete(`/auth/users/${u.id}`); setUsers((l) => l.filter((x) => x.id !== u.id)); }
    catch (err: any) { setError(err.message); }
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
                  {f.area ? <>
                    <textarea rows={12} value={values[f.key] ?? ''} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setOk(''); }} className={inputCls} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    {!values[f.key] && <p className="text-xs text-amber-600 mt-1">Vide — redémarrer le serveur pour charger le template par défaut.</p>}
                    <p className="text-xs text-slate-400 mt-1">Variables : {f.key.includes('contrat') ? VARS_CONTRAT : VARS_FACTURE}</p>
                  </> : <input type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} value={values[f.key] ?? ''} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setOk(''); }} className={inputCls} />}
                </Field>
              ))}
              {okMsg(s.id)}
              <button type="submit" className={btnPrimary} disabled={saving === s.id}>{saving === s.id ? 'Enregistrement…' : 'Enregistrer'}</button>
            </form>
          ))}
          <div className={`${card} p-5`}>
            <h2 className="text-base font-semibold mb-3">Comptes utilisateurs</h2>
            {users.length === 0 && <p className="text-slate-500 mb-3">Aucun compte.</p>}
            <ul className="mb-3 divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-slate-500 truncate">{u.email || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isActive(u) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{isActive(u) ? 'Actif' : 'Désactivé'}</span>
                    <button type="button" className={btnGhost} onClick={() => toggleUser(u)}>{isActive(u) ? 'Désactiver' : 'Activer'}</button>
                    <button type="button" className={btnGhost} aria-label={`Supprimer ${u.name}`} onClick={() => deleteUser(u)}>🗑</button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className={btnGhost} onClick={() => setShowAddUser((v) => !v)}>Ajouter un compte</button>
            {showAddUser && (
              <form onSubmit={addUser} className="mt-3">
                <Field label="Nom"><input required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className={inputCls} /></Field>
                <Field label="Email"><input type="text" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} /></Field>
                <Field label="Mot de passe"><input type="text" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} /></Field>
                <button type="submit" className={btnPrimary}>Créer</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
