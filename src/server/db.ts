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
export interface User { id: number; name: string; email: string; password: string; role: string }
export interface Vitrine { id: number; serial: string; model: string; prix_achat: number | null; prix_reparation: number; commentaire: string; fonctionnelle: number | null; lieu_id: number | null; nfc_tag: string | null }
export interface Booking { id: number; vitrine_id: number; client_name: string; start_date: string; duration_months: number; montant: number; transporteur: string; etat: string; adresse_livraison: string; tel_client: string; qui: string; photo_livraison: string; photo_enlevement: string; type_duree: string; maint: number; duree_jours: number }
export interface Flux { id: number; type_flux: string; montant: number; qui: string; client: string; mois: string; is_transport: number; is_achat: number; commentaire: string }
export interface Vente { id: number; vitrine_id: number | null; prix_achat: number; prix_vente: number; frais: number; commentaire: string; date_vente: string | null }
export interface Lieu { id: number; nom: string; type: string; note: string }
export interface Action { id: number; titre: string; fait: number; commentaire: string }
export interface Contrat { id: number; client: string; vitrine_id: number; duree: number | null; montant: number; caution: number; conditions: string }
export interface Frigoriste { id: number; nom: string; tel: string; zone: string }
export interface Intervention { id: number; vitrine_id: number; frigoriste_id: number; date: string; type: string; temperature: number | null; notes: string; cout: number | null }
export interface Prospection { id: number; client: string; contact: string; notes: string; statut: string }
export interface Setting { key: string; value: string }

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS vitrines (id INTEGER PRIMARY KEY, serial TEXT, model TEXT, prix_achat REAL, prix_reparation REAL, commentaire TEXT, fonctionnelle INTEGER, lieu_id INTEGER, nfc_tag TEXT);
CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, vitrine_id INTEGER, client_name TEXT, start_date TEXT, duration_months INTEGER, montant REAL, transporteur TEXT, etat TEXT, adresse_livraison TEXT, tel_client TEXT, qui TEXT, photo_livraison TEXT, photo_enlevement TEXT, type_duree TEXT DEFAULT 'longue', maint INTEGER DEFAULT 0, duree_jours INTEGER);
CREATE TABLE IF NOT EXISTS flux (id INTEGER PRIMARY KEY, type_flux TEXT, montant REAL, qui TEXT, client TEXT, mois TEXT, is_transport INTEGER, is_achat INTEGER, commentaire TEXT);
CREATE TABLE IF NOT EXISTS ventes (id INTEGER PRIMARY KEY, vitrine_id INTEGER, prix_achat REAL, prix_vente REAL, frais REAL, commentaire TEXT, date_vente TEXT);
CREATE TABLE IF NOT EXISTS lieux (id INTEGER PRIMARY KEY, nom TEXT, type TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS actions (id INTEGER PRIMARY KEY, titre TEXT, fait INTEGER DEFAULT 0, commentaire TEXT);
CREATE TABLE IF NOT EXISTS contrats (id INTEGER PRIMARY KEY, client TEXT, vitrine_id INTEGER, duree INTEGER, montant REAL, caution REAL, conditions TEXT);
CREATE TABLE IF NOT EXISTS frigoristes (id INTEGER PRIMARY KEY, nom TEXT, tel TEXT, zone TEXT);
CREATE TABLE IF NOT EXISTS interventions (id INTEGER PRIMARY KEY, vitrine_id INTEGER, frigoriste_id INTEGER, date TEXT, type TEXT, temperature REAL, notes TEXT, cout REAL);
CREATE TABLE IF NOT EXISTS prospection (id INTEGER PRIMARY KEY, client TEXT, contact TEXT, notes TEXT, statut TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

const migrations = [
  'ALTER TABLE bookings ADD COLUMN adresse_livraison TEXT',
  'ALTER TABLE bookings ADD COLUMN tel_client TEXT',
  'ALTER TABLE bookings ADD COLUMN qui TEXT',
  'ALTER TABLE bookings ADD COLUMN photo_livraison TEXT',
  'ALTER TABLE bookings ADD COLUMN photo_enlevement TEXT',
  "ALTER TABLE bookings ADD COLUMN type_duree TEXT DEFAULT 'longue'",
  'ALTER TABLE bookings ADD COLUMN maint INTEGER DEFAULT 0',
  'ALTER TABLE bookings ADD COLUMN duree_jours INTEGER',
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
  vitrines: crud<Vitrine>('vitrines', ['serial', 'model', 'prix_achat', 'prix_reparation', 'commentaire', 'fonctionnelle', 'lieu_id', 'nfc_tag']),
  bookings: crud<Booking>('bookings', ['vitrine_id', 'client_name', 'start_date', 'duration_months', 'montant', 'transporteur', 'etat', 'adresse_livraison', 'tel_client', 'qui', 'photo_livraison', 'photo_enlevement', 'type_duree', 'maint', 'duree_jours']),
  flux: crud<Flux>('flux', ['type_flux', 'montant', 'qui', 'client', 'mois', 'is_transport', 'is_achat', 'commentaire']),
  ventes: crud<Vente>('ventes', ['vitrine_id', 'prix_achat', 'prix_vente', 'frais', 'commentaire', 'date_vente']),
  lieux: crud<Lieu>('lieux', ['nom', 'type', 'note']),
  actions: crud<Action>('actions', ['titre', 'fait', 'commentaire']),
  contrats: crud<Contrat>('contrats', ['client', 'vitrine_id', 'duree', 'montant', 'caution', 'conditions']),
  frigoristes: crud<Frigoriste>('frigoristes', ['nom', 'tel', 'zone']),
  interventions: crud<Intervention>('interventions', ['vitrine_id', 'frigoriste_id', 'date', 'type', 'temperature', 'notes', 'cout']),
  prospection: crud<Prospection>('prospection', ['client', 'contact', 'notes', 'statut']),
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

export default db;
