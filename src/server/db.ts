import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_PATH || resolve(here, '../../data.db');

export const db: Database.Database = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// ---------- Types ----------
export interface User { id: number; name: string; email: string; password: string; role: string; active: number }
export interface Vitrine { id: number; serial: string; model: string; prix_achat: number | null; prix_reparation: number; commentaire: string; fonctionnelle: number | null; lieu_id: number | null; nfc_tag: string | null; date_achat: string | null }
export interface Booking { id: number; vitrine_id: number; client_name: string; start_date: string; duration_months: number; montant: number; transporteur: string; etat: string; adresse_livraison: string; tel_client: string; qui: string; photo_livraison: string; photo_enlevement: string; type_duree: string; maint: number; duree_jours: number; date_fin: string | null }
export interface Flux { id: number; type_flux: string; montant: number; qui: string; client: string; mois: string; is_transport: number; is_achat: number; commentaire: string }
export interface Vente { id: number; vitrine_id: number | null; prix_achat: number; prix_vente: number; frais: number; commentaire: string; date_vente: string | null }
export interface Lieu { id: number; nom: string; type: string; note: string }
export interface Action { id: number; titre: string; fait: number; commentaire: string }
export interface Contrat { id: number; client: string; vitrine_id: number; duree: number | null; montant: number; caution: number; conditions: string; date_debut: string | null; date_fin: string | null }
export interface Frigoriste { id: number; nom: string; tel: string; zone: string }
export interface Intervention { id: number; vitrine_id: number; frigoriste_id: number; date: string; type: string; temperature: number | null; notes: string; cout: number | null }
export interface Prospection { id: number; client: string; contact: string; notes: string; statut: string }
export interface Client { id: number; nom: string; tel: string; email: string; adresse: string }
export interface Facture { id: number; contrat_id: number; periode: string; montant: number; client: string; vitrine_id: number; statut: string; date_emission: string }
export interface Setting { key: string; value: string }

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT DEFAULT '', password TEXT, role TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS vitrines (id INTEGER PRIMARY KEY, serial TEXT, model TEXT, prix_achat REAL, prix_reparation REAL, commentaire TEXT, fonctionnelle INTEGER, lieu_id INTEGER, nfc_tag TEXT);
CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, vitrine_id INTEGER, client_name TEXT, start_date TEXT, duration_months INTEGER, montant REAL, transporteur TEXT, etat TEXT, adresse_livraison TEXT, tel_client TEXT, qui TEXT, photo_livraison TEXT, photo_enlevement TEXT, type_duree TEXT DEFAULT 'longue', maint INTEGER DEFAULT 0, duree_jours INTEGER);
CREATE TABLE IF NOT EXISTS flux (id INTEGER PRIMARY KEY, type_flux TEXT, montant REAL, qui TEXT, client TEXT, mois TEXT, is_transport INTEGER, is_achat INTEGER, commentaire TEXT);
CREATE TABLE IF NOT EXISTS ventes (id INTEGER PRIMARY KEY, vitrine_id INTEGER, prix_achat REAL, prix_vente REAL, frais REAL, commentaire TEXT, date_vente TEXT);
CREATE TABLE IF NOT EXISTS lieux (id INTEGER PRIMARY KEY, nom TEXT, type TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS actions (id INTEGER PRIMARY KEY, titre TEXT, fait INTEGER DEFAULT 0, commentaire TEXT);
CREATE TABLE IF NOT EXISTS contrats (id INTEGER PRIMARY KEY, client TEXT, vitrine_id INTEGER, duree INTEGER, montant REAL, caution REAL, conditions TEXT, date_debut TEXT, date_fin TEXT);
CREATE TABLE IF NOT EXISTS devis_location (id INTEGER PRIMARY KEY, numero TEXT UNIQUE, client TEXT, adresse_client TEXT, tel_client TEXT, email_client TEXT, vitrine_id INTEGER, marque TEXT, modele TEXT, serial_vitrine TEXT, equipements TEXT, date_debut TEXT, date_fin TEXT, duree INTEGER, montant REAL, caution REAL, jour_paiement INTEGER, mode_paiement TEXT, option_achat_prix REAL, conditions TEXT, date_creation TEXT DEFAULT (date('now')), signe INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS frigoristes (id INTEGER PRIMARY KEY, nom TEXT, tel TEXT, zone TEXT);
CREATE TABLE IF NOT EXISTS interventions (id INTEGER PRIMARY KEY, vitrine_id INTEGER, frigoriste_id INTEGER, date TEXT, type TEXT, temperature REAL, notes TEXT, cout REAL);
CREATE TABLE IF NOT EXISTS prospection (id INTEGER PRIMARY KEY, client TEXT, contact TEXT, notes TEXT, statut TEXT);
CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY, nom TEXT, tel TEXT, email TEXT, adresse TEXT);
CREATE TABLE IF NOT EXISTS factures (id INTEGER PRIMARY KEY, numero TEXT UNIQUE, contrat_id INTEGER, client TEXT, adresse_client TEXT, tel_client TEXT, vitrine_id INTEGER, marque TEXT, modele TEXT, serial_vitrine TEXT, montant REAL, tva REAL DEFAULT 0, periode TEXT, date_emission TEXT DEFAULT (date('now')), statut TEXT DEFAULT 'emise', notes TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

const migrations = [
  "ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''",
  'ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1',
  'ALTER TABLE bookings ADD COLUMN adresse_livraison TEXT',
  'ALTER TABLE bookings ADD COLUMN tel_client TEXT',
  'ALTER TABLE bookings ADD COLUMN qui TEXT',
  'ALTER TABLE bookings ADD COLUMN photo_livraison TEXT',
  'ALTER TABLE bookings ADD COLUMN photo_enlevement TEXT',
  "ALTER TABLE bookings ADD COLUMN type_duree TEXT DEFAULT 'longue'",
  'ALTER TABLE bookings ADD COLUMN maint INTEGER DEFAULT 0',
  'ALTER TABLE bookings ADD COLUMN duree_jours INTEGER',
  'ALTER TABLE contrats ADD COLUMN date_debut TEXT',
  'ALTER TABLE contrats ADD COLUMN date_fin TEXT',
  'ALTER TABLE contrats ADD COLUMN marque TEXT',
  'ALTER TABLE contrats ADD COLUMN modele TEXT',
  'ALTER TABLE contrats ADD COLUMN serial_vitrine TEXT',
  'ALTER TABLE contrats ADD COLUMN equipements TEXT',
  'ALTER TABLE contrats ADD COLUMN adresse_client TEXT',
  'ALTER TABLE contrats ADD COLUMN tel_client TEXT',
  'ALTER TABLE contrats ADD COLUMN email_client TEXT',
  'ALTER TABLE contrats ADD COLUMN jour_paiement INTEGER',
  'ALTER TABLE contrats ADD COLUMN mode_paiement TEXT',
  'ALTER TABLE contrats ADD COLUMN option_achat_prix REAL',
  'ALTER TABLE contrats ADD COLUMN signe INTEGER DEFAULT 0',
  'ALTER TABLE contrats ADD COLUMN client_id INTEGER',
  'ALTER TABLE contrats ADD COLUMN nb_vitrines INTEGER DEFAULT 1',
  'ALTER TABLE contrats ADD COLUMN hors_idf INTEGER DEFAULT 0',
  'ALTER TABLE contrats ADD COLUMN maintenance_forfait INTEGER DEFAULT 0',
  'ALTER TABLE contrats ADD COLUMN numero TEXT',
  "ALTER TABLE contrats ADD COLUMN vitrine_ids TEXT DEFAULT '[]'",
  "ALTER TABLE contrats ADD COLUMN mode_facturation TEXT DEFAULT 'mensuel'",
  'ALTER TABLE contrats ADD COLUMN actif INTEGER DEFAULT 1',
  'ALTER TABLE factures ADD COLUMN numero TEXT',
  'ALTER TABLE factures ADD COLUMN adresse_client TEXT',
  'ALTER TABLE factures ADD COLUMN tel_client TEXT',
  'ALTER TABLE factures ADD COLUMN marque TEXT',
  'ALTER TABLE factures ADD COLUMN modele TEXT',
  'ALTER TABLE factures ADD COLUMN serial_vitrine TEXT',
  'ALTER TABLE factures ADD COLUMN tva REAL DEFAULT 0',
  'ALTER TABLE factures ADD COLUMN notes TEXT',
  'ALTER TABLE vitrines ADD COLUMN date_achat TEXT',
  'ALTER TABLE bookings ADD COLUMN date_fin TEXT',
  'ALTER TABLE contrats ADD COLUMN qui TEXT',
  'ALTER TABLE factures ADD COLUMN qui TEXT',
  'ALTER TABLE factures ADD COLUMN date_paiement TEXT',
  'ALTER TABLE bookings ADD COLUMN date_paiement TEXT',
  'ALTER TABLE contrats ADD COLUMN montant_fixe REAL',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_numero ON factures(numero) WHERE numero IS NOT NULL'); } catch (e) { /* already exists */ }

// ---------- Seed default templates ----------
const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

seedSetting.run('template_contrat_html', `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Contrat {{numero}}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial',sans-serif;font-size:11pt;color:#111;padding:2cm;max-width:21cm;margin:auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5em;border-bottom:2px solid #1e3a5f;padding-bottom:1em}
.company{color:#1e3a5f}.company h1{font-size:18pt;font-weight:bold;letter-spacing:1px}.company p{font-size:9pt;margin-top:2px}
.doc-info{text-align:right}.doc-info .doc-type{font-size:16pt;font-weight:bold;color:#1e3a5f}.doc-info p{font-size:9pt}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:1em;margin:1.2em 0;border:1px solid #ddd;padding:0.8em;border-radius:4px}
.parties h3{font-size:10pt;font-weight:bold;text-transform:uppercase;color:#1e3a5f;margin-bottom:4px}
.parties p{font-size:9pt;margin:1px 0}
.section{margin:1em 0}
.section h2{font-size:11pt;font-weight:bold;background:#1e3a5f;color:#fff;padding:4px 8px;margin-bottom:0.5em}
.section p,.section li{font-size:9.5pt;line-height:1.5;margin:2px 0}
table{width:100%;border-collapse:collapse;margin:0.8em 0}
th{background:#1e3a5f;color:#fff;padding:6px 8px;font-size:9.5pt;text-align:left}
td{padding:5px 8px;font-size:9.5pt;border-bottom:1px solid #eee}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:2em;margin-top:2em}
.signatures .sig-box{border:1px solid #ccc;border-radius:4px;padding:0.8em;min-height:80px}
.signatures h4{font-size:9pt;font-weight:bold;margin-bottom:4px}
.signatures p{font-size:8.5pt;color:#555}
ul.contract-list{padding-left:1.5em;margin:0.3em 0}ul.contract-list li{font-size:9.5pt;line-height:1.5;margin:2px 0}
@media print{body{padding:0.5cm 1cm}}
</style></head><body>
<div class="header">
  <div class="company"><h1>{{company_nom}}</h1><p>{{company_adresse}}</p><p>SIRET : {{company_siret}}</p></div>
  <div class="doc-info"><div class="doc-type">CONTRAT DE LOCATION</div><p><strong>Réf. :</strong> {{numero}}</p><p><strong>Date :</strong> {{date_debut}}</p></div>
</div>
<p style="font-size:9pt;margin:0.5em 0"><strong>Entre les soussignés :</strong></p>
<div class="parties">
  <div><h3>Bailleur</h3><p><strong>{{company_nom}}</strong></p><p>{{company_adresse}}</p><p>SIRET : {{company_siret}}</p><p>Ci-après dénommé « le Bailleur »</p></div>
  <div><h3>Locataire</h3><p><strong>{{client}}</strong></p><p>{{adresse_client}}</p><p>Tél : {{tel_client}}</p><p>Email : {{email_client}}</p><p>Ci-après dénommé « le Locataire »</p></div>
</div>
<p style="font-size:9.5pt;font-weight:bold;text-align:center;margin:0.5em 0">IL A ÉTÉ CONVENU CE QUI SUIT :</p>

<div class="section"><h2>Article 1 – Objet du contrat</h2>
<p>Le Bailleur met à la disposition du Locataire, à titre de location, les vitrines réfrigérées suivantes :</p>
<table><tr><th>Marque</th><th>Modèle</th><th>N° Série</th><th>Nombre</th><th>Équipements</th></tr>
<tr><td>{{marque}}</td><td>{{modele}}</td><td>{{serial_vitrine}}</td><td>{{nb_vitrines}}</td><td>{{equipements}}</td></tr></table></div>

<div class="section"><h2>Article 2 – Durée de la location</h2>
<p>La location prend effet à compter du <strong>{{date_debut}}</strong> jusqu'au <strong>{{date_fin}}</strong>, soit une durée de <strong>{{duree}}</strong>.</p>
<p>Elle pourra être résiliée par l'une ou l'autre des parties sous réserve d'un préavis de <strong>90 jours</strong> sans motif nécessaire.</p></div>

<div class="section"><h2>Article 3 – Montant et modalités de paiement</h2>
<p>Le loyer mensuel est fixé à <strong>{{montant}}</strong> par vitrine réfrigérée.</p>
<p>Le paiement du loyer est exigible le <strong>{{jour_paiement}}</strong> de chaque mois et sera effectué par <strong>{{mode_paiement}}</strong>.</p>
<p>IBAN : <strong>{{company_iban}}</strong> · BIC : <strong>{{company_bic}}</strong></p></div>

<div class="section"><h2>Article 4 – Caution</h2>
<p>Le Locataire verse au Bailleur un chèque de caution de <strong>{{caution}}</strong>, correspondant à un pourcentage de la valeur des biens.</p>
<p>Ce chèque sera restitué au Locataire ou détruit dans un délai de 10 jours maximum après la restitution des vitrines réfrigérées en bon état.</p></div>

<div class="section"><h2>Article 5 – Pénalités de retard</h2>
<p>En cas de retard de paiement du loyer, des pénalités de retard calculées au taux de <strong>5 % par semaine de retard</strong> seront appliquées, à compter des 7 jours suivant la date d'exigibilité du loyer.</p></div>

<div class="section"><h2>Article 6 – Obligations du Bailleur</h2>
<ul class="contract-list">
  <li>Mettre à disposition les vitrines réfrigérées en bon état de fonctionnement.</li>
  <li>Assurer la maintenance régulière des équipements.</li>
  <li>En cas de panne non réparable, remplacer par des équipements équivalents dans un délai de 15 jours.</li>
</ul></div>

<div class="section"><h2>Article 6 bis – Clause de maintenance</h2>
<p>Le Bailleur garantit le bon fonctionnement pendant <strong>2 mois</strong>. Au-delà, l'entretien est à la charge du Locataire.</p>
<p>Un forfait de maintenance optionnel est disponible : <strong>70 € TTC / vitrine / mois</strong>.</p></div>

<div class="section"><h2>Article 7 – Obligations du Locataire</h2>
<ul class="contract-list">
  <li>Utiliser les vitrines conformément à leur usage prévu.</li>
  <li>Maintenir les équipements en bon état de fonctionnement.</li>
  <li>Ne pas sous-louer sans l'accord écrit du Bailleur.</li>
  <li>Restituer les vitrines en bon état à la fin du contrat.</li>
</ul></div>

<div class="section"><h2>Article 8 – État des lieux</h2>
<p>Un état des lieux contradictoire sera établi lors de la mise à disposition et à la restitution des vitrines réfrigérées.</p></div>

<div class="section"><h2>Article 9 – Assurance</h2>
<p>Le Locataire s'engage à souscrire une assurance couvrant les risques liés à l'utilisation des vitrines réfrigérées.</p></div>

<div class="section"><h2>Article 9 bis – Non-restitution</h2>
<p>En cas de non-restitution, le Locataire sera redevable d'une indemnité de <strong>5% du prix d'achat neuf par semaine de retard</strong>.</p></div>

<div class="section"><h2>Article 10 – Résiliation du contrat</h2>
<p>Le Bailleur pourra résilier le contrat en cas de non-paiement après <strong>20 jours</strong> de mise en demeure.</p></div>

<div class="section"><h2>Loi applicable</h2>
<p>Le présent contrat est régi par la loi française.</p></div>

<p style="font-size:9pt;text-align:center;margin:1.5em 0"><strong>Fait en deux exemplaires, à {{lieu_signature}}, le {{date_contrat}}</strong></p>
<div class="signatures">
  <div class="sig-box"><h4>Signature du Bailleur</h4><p>{{company_nom}}</p><p><br><br>Signature :</p></div>
  <div class="sig-box"><h4>Signature du Locataire</h4><p>{{client}}</p><p>Lu et approuvé :<br><br>Signature :</p></div>
</div>

<div style="page-break-before:always"></div>
<h2 style="font-size:13pt;font-weight:bold;text-align:center;margin:1em 0;border-bottom:2px solid #1e3a5f;padding-bottom:0.5em">ANNEXE 1 – BARÈME DE MAINTENANCE</h2>
<div class="section"><h2>Forfait mensuel : 70 € TTC / vitrine / mois</h2>
<ul class="contract-list"><li>1 visite préventive / trimestre</li><li>Vérification technique complète</li><li>Nettoyage technique et réglages</li><li>Main-d'œuvre réparations courantes</li><li>Pièces d'usure courante</li></ul></div>
<div class="section"><h2>Tarifs hors forfait</h2>
<ul class="contract-list"><li>Déplacement + diagnostic : 60 € TTC</li><li>Main-d'œuvre : 90 € TTC / heure</li><li>Pièces : prix fournisseur + 15%</li><li>Urgence (sous 24h) : + 60 € TTC</li></ul></div>

<div style="page-break-before:always"></div>
<h2 style="font-size:13pt;font-weight:bold;text-align:center;margin:1em 0;border-bottom:2px solid #1e3a5f;padding-bottom:0.5em">ANNEXE 2 – PRIX PAR ÉLÉMENT DÉTÉRIORÉ</h2>
<table>
  <tr><th>Élément</th><th style="text-align:right">Tarif TTC</th></tr>
  <tr><td>Une vitre</td><td style="text-align:right">300 €</td></tr>
  <tr><td>Un plexiglas</td><td style="text-align:right">90 €</td></tr>
  <tr><td>Une roue</td><td style="text-align:right">30 €</td></tr>
  <tr><td>Un plateau</td><td style="text-align:right">150 €</td></tr>
  <tr><td>Un pied</td><td style="text-align:right">80 €</td></tr>
  <tr><td>Un câblage</td><td style="text-align:right">20 €</td></tr>
  <tr><td>Un luminaire</td><td style="text-align:right">30 €</td></tr>
</table>
</body></html>`);

seedSetting.run('template_facture_html', `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Facture {{numero}}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial',sans-serif;font-size:11pt;color:#111;padding:2cm;max-width:21cm;margin:auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5em;border-bottom:2px solid #1e3a5f;padding-bottom:1em}
.company{color:#1e3a5f}.company h1{font-size:18pt;font-weight:bold;letter-spacing:1px}.company p{font-size:9pt;margin-top:2px}
.doc-info{text-align:right}.doc-info .doc-type{font-size:16pt;font-weight:bold;color:#1e3a5f}.doc-info p{font-size:9pt}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:1em;margin:1.2em 0;border:1px solid #ddd;padding:0.8em;border-radius:4px}
.parties h3{font-size:10pt;font-weight:bold;text-transform:uppercase;color:#1e3a5f;margin-bottom:4px}
.parties p{font-size:9pt;margin:1px 0}
table{width:100%;border-collapse:collapse;margin:0.8em 0}
th{background:#1e3a5f;color:#fff;padding:6px 8px;font-size:9.5pt;text-align:left}
td{padding:5px 8px;font-size:9.5pt;border-bottom:1px solid #eee}
.total-row td{font-weight:bold;background:#f0f4f8}
.section{margin:1em 0}
.section h2{font-size:11pt;font-weight:bold;background:#1e3a5f;color:#fff;padding:4px 8px;margin-bottom:0.5em}
@media print{body{padding:0.5cm 1cm}}
</style></head><body>
<div class="header">
  <div class="company"><h1>{{company_nom}}</h1><p>{{company_adresse}}</p><p>SIRET : {{company_siret}}</p></div>
  <div class="doc-info"><div class="doc-type">FACTURE</div><p><strong>N° :</strong> {{numero}}</p><p><strong>Date :</strong> {{date_emission}}</p></div>
</div>
<div class="parties">
  <div><h3>Émetteur</h3><p><strong>{{company_nom}}</strong></p><p>{{company_adresse}}</p><p>SIRET : {{company_siret}}</p></div>
  <div><h3>Facturer à</h3><p><strong>{{client}}</strong></p><p>{{adresse_client}}</p><p>Tél : {{tel_client}}</p></div>
</div>
<table>
  <tr><th>Désignation</th><th>Marque / Modèle</th><th>N° Série</th><th>Période</th><th>Montant HT</th></tr>
  <tr><td>Location vitrine réfrigérée</td><td>{{marque}} {{modele}}</td><td>{{serial_vitrine}}</td><td>{{periode}}</td><td>{{montant}}</td></tr>
</table>
<table style="max-width:300px;margin-left:auto">
  <tr><td>Total HT</td><td style="text-align:right">{{montant}}</td></tr>
  <tr><td>TVA ({{tva_pct}}%)</td><td style="text-align:right">{{tva}}</td></tr>
  <tr class="total-row"><td>Total TTC</td><td style="text-align:right">{{total_ttc}}</td></tr>
</table>
<div class="section"><h2>Règlement</h2>
<p>IBAN : <strong>{{company_iban}}</strong> · BIC : <strong>{{company_bic}}</strong></p></div>
<div style="margin-top:2em;border-top:1px solid #ddd;padding-top:1em">
  <p style="font-size:9pt;font-weight:bold;margin-bottom:0.4em">Mentions légales</p>
  <p style="font-size:8.5pt;color:#555">La vitrine louée reste la propriété exclusive de {{company_nom}}.</p>
  <p style="font-size:8.5pt;color:#555">Tout retard de paiement prolongé entraînera des frais de recouvrement.</p>
  <p style="font-size:8.5pt;color:#555;text-align:center;margin-top:0.5em">Facture payable à réception</p>
</div>
</body></html>`);

// ---------- Generic CRUD ----------
type Row = Record<string, unknown>;
function crud<T extends { id: number }>(table: string, cols: string[]) {
  const ph = cols.map(() => '?').join(',');
  const pick = (o: Row) => cols.map((c) => (o[c] === undefined ? null : o[c]));
  return {
    all: () => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as T[],
    get: (id: number) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T | undefined,
    create: (o: Partial<Omit<T, 'id'>>): T => {
      const r = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`).run(...pick(o as Row));
      return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid) as T;
    },
    update: (id: number, o: Partial<Omit<T, 'id'>>): T | undefined => {
      const keys = cols.filter((c) => (o as Row)[c] !== undefined);
      if (keys.length) db.prepare(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(',')} WHERE id = ?`).run(...keys.map((k) => (o as Row)[k]), id);
      return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T | undefined;
    },
    remove: (id: number): boolean => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0,
  };
}

const T = {
  users: crud<User>('users', ['name', 'email', 'password', 'role']),
  vitrines: crud<Vitrine>('vitrines', ['serial', 'model', 'prix_achat', 'prix_reparation', 'commentaire', 'fonctionnelle', 'lieu_id', 'nfc_tag', 'date_achat']),
  bookings: crud<Booking>('bookings', ['vitrine_id', 'client_name', 'start_date', 'duration_months', 'montant', 'transporteur', 'etat', 'adresse_livraison', 'tel_client', 'qui', 'photo_livraison', 'photo_enlevement', 'type_duree', 'maint', 'duree_jours', 'date_fin']),
  flux: crud<Flux>('flux', ['type_flux', 'montant', 'qui', 'client', 'mois', 'is_transport', 'is_achat', 'commentaire']),
  ventes: crud<Vente>('ventes', ['vitrine_id', 'prix_achat', 'prix_vente', 'frais', 'commentaire', 'date_vente']),
  lieux: crud<Lieu>('lieux', ['nom', 'type', 'note']),
  actions: crud<Action>('actions', ['titre', 'fait', 'commentaire']),
  contrats: crud<Contrat>('contrats', ['client', 'vitrine_id', 'duree', 'montant', 'montant_fixe', 'caution', 'conditions', 'date_debut', 'date_fin', 'qui']),
  frigoristes: crud<Frigoriste>('frigoristes', ['nom', 'tel', 'zone']),
  interventions: crud<Intervention>('interventions', ['vitrine_id', 'frigoriste_id', 'date', 'type', 'temperature', 'notes', 'cout']),
  prospection: crud<Prospection>('prospection', ['client', 'contact', 'notes', 'statut']),
  clients: crud<Client>('clients', ['nom', 'tel', 'email', 'adresse']),
  factures: crud<Facture>('factures', ['contrat_id', 'periode', 'montant', 'client', 'vitrine_id', 'statut', 'date_emission', 'qui']),
};

// ---------- Typed helpers ----------
export const getUsers = T.users.all, getUser = T.users.get, createUser = T.users.create, updateUser = T.users.update, deleteUser = T.users.remove;
export const getUserByName = (name: string) => db.prepare('SELECT * FROM users WHERE name = ?').get(name) as User | undefined;
export const getVitrines = T.vitrines.all, getVitrine = T.vitrines.get, createVitrine = T.vitrines.create, updateVitrine = T.vitrines.update, deleteVitrine = T.vitrines.remove;
export const getBookings = T.bookings.all, getBooking = T.bookings.get, createBooking = T.bookings.create, updateBooking = T.bookings.update, deleteBooking = T.bookings.remove;
export const getFlux = T.flux.all, getFluxItem = T.flux.get, createFlux = T.flux.create, updateFlux = T.flux.update, deleteFlux = T.flux.remove;
export const getVentes = T.ventes.all, getVente = T.ventes.get, createVente = T.ventes.create, updateVente = T.ventes.update, deleteVente = T.ventes.remove;
export const getLieux = T.lieux.all, getLieu = T.lieux.get, createLieu = T.lieux.create, updateLieu = T.lieux.update, deleteLieu = T.lieux.remove;
export const getActions = T.actions.all, getAction = T.actions.get, createAction = T.actions.create, updateAction = T.actions.update, deleteAction = T.actions.remove;
export const getContrats = T.contrats.all, getContrat = T.contrats.get, createContrat = T.contrats.create, updateContrat = T.contrats.update, deleteContrat = T.contrats.remove;
export const getFrigoristes = T.frigoristes.all, getFrigoriste = T.frigoristes.get, createFrigoriste = T.frigoristes.create, updateFrigoriste = T.frigoristes.update, deleteFrigoriste = T.frigoristes.remove;
export const getInterventions = T.interventions.all, getIntervention = T.interventions.get, createIntervention = T.interventions.create, updateIntervention = T.interventions.update, deleteIntervention = T.interventions.remove;
export const getProspections = T.prospection.all, getProspection = T.prospection.get, createProspection = T.prospection.create, updateProspection = T.prospection.update, deleteProspection = T.prospection.remove;
export const getClients = T.clients.all, getClient = T.clients.get, createClient = T.clients.create, updateClient = T.clients.update, deleteClient = T.clients.remove;
export const getFactures = T.factures.all, getFacture = T.factures.get, createFacture = T.factures.create, updateFacture = T.factures.update, deleteFacture = T.factures.remove;

export const getSettings = (): Record<string, string> =>
  Object.fromEntries((db.prepare('SELECT key, value FROM settings').all() as Setting[]).map((s) => [s.key, s.value]));
export const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
export const setSetting = (key: string, value: string) =>
  void db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
export const deleteSetting = (key: string) => db.prepare('DELETE FROM settings WHERE key = ?').run(key).changes > 0;

// ---------- Seed ----------
const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

function seed() {
  const data = JSON.parse(readFileSync(resolve(here, 'seed-data.json'), 'utf8')) as Record<string, Row[]>;
  const insertAll = (table: string, rows: Row[]) => {
    if (!rows.length || count(table) > 0) return;
    const cols = Object.keys(rows[0]);
    const st = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`);
    for (const r of rows) st.run(r);
  };
  db.transaction(() => {
    if (count('users') === 0) {
      T.users.create({ name: 'Bilel', email: 'bilel@vitritrack.fr', password: 'admin123', role: 'admin' });
      T.users.create({ name: 'Oussama', email: 'oussama@vitritrack.fr', password: 'admin123', role: 'admin' });
    }
    for (const t of ['lieux', 'vitrines', 'bookings', 'flux', 'ventes', 'actions', 'contrats', 'frigoristes', 'interventions', 'prospection', 'settings']) {
      insertAll(t, data[t] || []);
    }
  })();
}
seed();

// ---------- Auto-generate factures for active contrats ----------
function generateFactures() {
  const contrats = db.prepare('SELECT * FROM contrats WHERE date_debut IS NOT NULL').all() as Contrat[];
  const existing = new Set(
    (db.prepare('SELECT contrat_id, periode FROM factures').all() as { contrat_id: number; periode: string }[])
      .map(f => `${f.contrat_id}:${f.periode}`)
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const insert = db.prepare('INSERT OR IGNORE INTO factures (contrat_id, periode, montant, client, vitrine_id, statut, date_emission, qui) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  db.transaction(() => {
    for (const c of contrats) {
      if (!c.date_debut) continue;
      const start = new Date(c.date_debut + 'T00:00:00');
      const end = c.date_fin ? new Date(c.date_fin + 'T00:00:00') : new Date(start.getFullYear(), start.getMonth() + (c.duree || 1), start.getDate());
      const d = new Date(start);
      while (d < end) {
        const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const key = `${c.id}:${p}`;
        if (!existing.has(key)) {
          insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr, (c as any).qui || null);
          existing.add(key);
        }
        d.setMonth(d.getMonth() + 1);
      }
      if (end <= start) {
        const p = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        if (!existing.has(`${c.id}:${p}`)) {
          insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr);
        }
      }
    }
  })();
}
generateFactures();

export default db;
