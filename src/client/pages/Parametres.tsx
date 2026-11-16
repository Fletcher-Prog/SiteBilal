import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { PageHeader, Status, Field, inputCls, btnPrimary, btnGhost, card } from '../components/ui.js';
import { useAuth } from '../App.js';
import { PERMISSIONS } from '../lib/permissions.js';

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

function AccessEditor({ role, perms, onChange, allowed }: { role: string; perms: string[]; onChange: (role: string, perms: string[]) => void; allowed: (p: string) => boolean }) {
  const toggle = (k: string) => onChange(role, perms.includes(k) ? perms.filter((p) => p !== k) : [...perms, k]);
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="admin" checked={role === 'admin'} disabled={!allowed('__admin')} onChange={(e) => onChange(e.target.checked ? 'admin' : 'user', perms)} />
        Administrateur (accès complet)
      </label>
      {role !== 'admin' && (
        <fieldset className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Onglets visibles</legend>
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex min-h-[32px] items-center gap-2 text-sm">
              <input type="checkbox" name={`perm-${p.key}`} checked={perms.includes(p.key)} disabled={!allowed(p.key)} onChange={() => toggle(p.key)} />
              {p.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

export default function Parametres() {
  const { user: me, can } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', permissions: ['planning'] as string[] });
  const [editAccess, setEditAccess] = useState<{ id: number; role: string; permissions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [ok, setOk] = useState('');
  const seesSettings = can('parametres');
  const seesAccounts = can('comptes');
  const isAdmin = me?.role === 'admin';
  // Un non-admin ne peut pas donner un droit qu'il n'a pas lui-même, ni créer d'admin.
  const grantable = (p: string) => (p === '__admin' ? isAdmin : isAdmin || can(p));

  useEffect(() => {
    const jobs: Promise<any>[] = [];
    if (seesSettings) jobs.push(api.get('/settings').then((r: any) => {
      const o: Record<string, string> = {};
      if (Array.isArray(r)) r.forEach((s: any) => (o[s.cle ?? s.key] = s.valeur ?? s.value ?? ''));
      else Object.entries(r || {}).forEach(([k, v]) => (o[k] = v == null ? '' : String(v)));
      setValues(o);
    }));
    if (seesAccounts) jobs.push(api.get('/auth/users').then((d: any) => Array.isArray(d) && setUsers(d)));
    Promise.all(jobs).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [seesSettings, seesAccounts]);

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
      const created = await api.post('/auth/users', { name: newUser.name.trim(), email: newUser.email.trim(), password: newUser.password, role: newUser.role, permissions: newUser.permissions });
      setUsers((l) => [...l, created]);
      setNewUser({ name: '', email: '', password: '', role: 'user', permissions: ['planning'] }); setShowAddUser(false);
    } catch (err: any) { setError(err.message); }
  };
  const replaceUser = (u: any) => setUsers((l) => l.map((x) => (x.id === u.id ? u : x)));
  const toggleUser = async (u: any) => {
    setError('');
    try { replaceUser(await api.patch(`/auth/users/${u.id}`, { active: !isActive(u) })); } catch (err: any) { setError(err.message); }
  };
  const saveAccess = async () => {
    if (!editAccess) return;
    setError('');
    try { replaceUser(await api.patch(`/auth/users/${editAccess.id}`, { role: editAccess.role, permissions: editAccess.permissions })); setEditAccess(null); }
    catch (err: any) { setError(err.message); }
  };
  const accessSummary = (u: any) => u.role === 'admin' ? 'Accès complet'
    : (u.permissions || []).length ? PERMISSIONS.filter((p) => u.permissions.includes(p.key)).map((p) => p.label.split(' (')[0]).join(', ') : 'Aucun accès';
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
          {seesSettings && SECTIONS.map((s) => (
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
          {seesAccounts && <div className={`${card} p-5`} data-testid="comptes">
            <h2 className="text-base font-semibold mb-1">Comptes utilisateurs</h2>
            <p className="mb-3 text-xs text-slate-500">Choisissez pour chaque compte les onglets qu'il peut voir. « Gestion des comptes » permet de voir et gérer les comptes.</p>
            {users.length === 0 && <p className="text-slate-500 mb-3">Aucun compte.</p>}
            <ul className="mb-3 divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="py-2 text-sm" data-testid={`compte-${u.name}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-slate-400">(vous)</span>}</div>
                      <div className="text-slate-500 truncate">{u.email || '—'}</div>
                      <div className="text-xs text-teal-700">{accessSummary(u)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${isActive(u) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{isActive(u) ? 'Actif' : 'Désactivé'}</span>
                      {u.id !== me?.id && <>
                        <button type="button" className={btnGhost} onClick={() => setEditAccess(editAccess?.id === u.id ? null : { id: u.id, role: u.role, permissions: u.permissions || [] })}>Accès</button>
                        <button type="button" className={btnGhost} onClick={() => toggleUser(u)}>{isActive(u) ? 'Désactiver' : 'Activer'}</button>
                        <button type="button" className={btnGhost} aria-label={`Supprimer ${u.name}`} onClick={() => deleteUser(u)}>🗑</button>
                      </>}
                    </div>
                  </div>
                  {editAccess && editAccess.id === u.id && (
                    <div className="mt-2">
                      <AccessEditor role={editAccess.role} perms={editAccess.permissions} allowed={grantable} onChange={(role, permissions) => setEditAccess({ id: editAccess.id, role, permissions })} />
                      <div className="mt-2 flex gap-2">
                        <button type="button" className={btnPrimary} onClick={saveAccess}>Enregistrer les accès</button>
                        <button type="button" className={btnGhost} onClick={() => setEditAccess(null)}>Annuler</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className={btnGhost} onClick={() => setShowAddUser((v) => !v)}>Ajouter un compte</button>
            {showAddUser && (
              <form onSubmit={addUser} className="mt-3">
                <Field label="Nom"><input name="name" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className={inputCls} /></Field>
                <Field label="Email"><input name="email" type="text" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} /></Field>
                <Field label="Mot de passe"><input name="password" type="text" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} /></Field>
                <div className="mb-3">
                  <AccessEditor role={newUser.role} perms={newUser.permissions} allowed={grantable} onChange={(role, permissions) => setNewUser({ ...newUser, role, permissions })} />
                </div>
                <button type="submit" className={btnPrimary}>Créer</button>
              </form>
            )}
          </div>}
        </div>
      )}
    </div>
  );
}
