// Extrait DATA + seeds de index.html vers src/server/seed-data.json
import fs from 'fs'; import vm from 'vm';
const h = fs.readFileSync('index.html', 'utf8');
const s = h.indexOf('const DATA = ') + 13;
const D = vm.runInNewContext('(' + h.slice(s, h.indexOf(']};', s) + 2) + ')');
const a = h.indexOf('function seedBookings'), b = h.indexOf('function loadState');
const ds = h.indexOf('function defaultSettings'); const dsEnd = h.indexOf('\n}', ds) + 2;
const ctx = { state: null };
vm.createContext(ctx);
vm.runInContext(h.slice(ds, dsEnd) + h.slice(a, b), ctx);
const num = (id) => parseInt(String(id).replace(/\D/g, ''), 10);
const pad = (n) => String(n).padStart(2, '0');
const cyc = (i) => ({ y: i <= 3 ? 2026 : 2027, m: (i + 8) % 12 });
const lieuxSrc = vm.runInContext('seedLieux()', ctx);
const lieux = lieuxSrc.map((l, i) => ({ id: i + 1, ...l }));
const lid = (nom) => {
  let l = lieux.find((x) => x.nom === nom);
  if (!l && nom) { l = { id: lieux.length + 1, nom, type: 'Incertain', note: '' }; lieux.push(l); }
  return l ? l.id : null;
};
const vitrines = D.vitrines.map((v) => ({
  id: num(v.id), serial: v.id, model: v.model, prix_achat: v.prix, prix_reparation: v.reparation || 0,
  commentaire: v.commentaire || '', fonctionnelle: v.fonctionnelle === null ? null : v.fonctionnelle ? 1 : 0,
  lieu_id: lid(v.lieu), nfc_tag: null,
}));
const dispo = D.vitrines.filter((v) => !/vendu/i.test(v.model) && v.fonctionnelle !== false);
const bookings = vm.runInContext('seedBookings()', ctx).map((b, i) => {
  const v = dispo[i % dispo.length]; const c = cyc(b.start);
  return {
    id: i + 1, vitrine_id: num(v.id), client_name: b.name, start_date: `${c.y}-${pad(c.m + 1)}-01`,
    duration_months: b.len, montant: v.prix || 300, transporteur: b.transporteur || '',
    etat: b.maint ? 'maintenance' : b.paiementRecu ? 'paye' : 'impaye',
  };
});
const flux = D.flux.map((f, i) => ({
  id: i + 1, type_flux: f.in ? 'entree' : 'sortie', montant: f.in || f.out || 0, qui: f.qui, client: f.client,
  mois: f.mois, is_transport: f.isTransport ? 1 : 0, is_achat: f.isAchat ? 1 : 0, commentaire: f.comm || '',
}));
const ventes = D.ventes.map((v, i) => ({
  id: i + 1, vitrine_id: null, prix_achat: v.achete, prix_vente: v.vendu, frais: v.depense || 0,
  commentaire: v.vitrine, date_vente: null,
}));
const actions = D.actions.map((a, i) => ({
  id: i + 1, titre: a.action, fait: a.statut === 'Fait' ? 1 : 0,
  commentaire: [a.comm, a.statut && a.statut !== 'Fait' ? `[statut: ${a.statut}]` : ''].filter(Boolean).join(' '),
}));
const contrats = vm.runInContext('seedContrats()', ctx).map((c, i) => {
  const d = (c.duree.match(/(\d\d)\/(\d\d)\/(\d{4})/g) || []).map((x) => { const [dd, mm, yy] = x.split('/'); return Date.UTC(+yy, +mm - 1, +dd); });
  return {
    id: i + 1, client: c.client, vitrine_id: num(c.vitrineId),
    duree: d.length === 2 ? Math.round((d[1] - d[0]) / 86400000) : null, montant: c.montant, caution: c.caution,
    conditions: [c.duree, c.conditionsRetour, c.etatLieux].filter(Boolean).join(' | '),
  };
});
const frigoristes = D.frigoristes.map((f) => ({ id: num(f.id), nom: f.nom, tel: f.tel, zone: f.specialite }));
const interventions = D.interventions.map((x) => ({
  id: num(x.id), vitrine_id: num(x.vitrineId), frigoriste_id: num(x.frigoriste), date: x.date, type: x.description,
  temperature: x.tempSoufflage, notes: `Coût: ${x.cout} €`, cout: x.cout,
}));
const prospection = D.prospection.map((p, i) => ({
  id: i + 1, client: p.qui, contact: p.ou, notes: `${p.quand} - ${p.combien} €`, statut: p.concretise ? 'Concrétisé' : 'Non concrétisé',
}));
const settings = Object.entries(vm.runInContext('defaultSettings()', ctx)).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
const out = { vitrines, bookings, flux, ventes, lieux, actions, contrats, frigoristes, interventions, prospection, settings };
fs.writeFileSync('src/server/seed-data.json', JSON.stringify(out, null, 1));
for (const k in out) console.log(k, out[k].length);
