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
  'ALTER TABLE factures ADD COLUMN numero TEXT UNIQUE',
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
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

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
  contrats: crud<Contrat>('contrats', ['client', 'vitrine_id', 'duree', 'montant', 'caution', 'conditions', 'date_debut', 'date_fin', 'qui']),
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
