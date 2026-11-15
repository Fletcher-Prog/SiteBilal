import { Router } from 'express';
import { pick } from './_crud.js';

const LIST_SQL = `SELECT t.*, v.serial AS vitrine_serial, v.model AS vitrine_model, v.serial AS vitrine_nom,
  COALESCE(t.marque, '') AS marque, COALESCE(t.modele, v.model) AS modele, COALESCE(t.serial_vitrine, v.serial) AS serial_vitrine,
  c.nom AS client_nom, c.adresse AS adresse_client_auto, c.tel AS tel_client_auto, c.email AS email_client_auto
  FROM contrats t
  LEFT JOIN vitrines v ON v.id = t.vitrine_id
  LEFT JOIN clients c ON c.nom = t.client`;

function generateFacturesForContrat(db: any, contratId: number) {
  const c = db.prepare('SELECT * FROM contrats WHERE id = ?').get(contratId);
  if (!c || !c.date_debut) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const start = new Date(c.date_debut + 'T00:00:00');
  const end = c.date_fin ? new Date(c.date_fin + 'T00:00:00') : new Date(start.getFullYear(), start.getMonth() + (c.duree || 1), start.getDate());
  const insert = db.prepare('INSERT OR IGNORE INTO factures (contrat_id, periode, montant, client, vitrine_id, statut, date_emission) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const d = new Date(start);
  while (d < end) {
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr);
    d.setMonth(d.getMonth() + 1);
  }
  if (start.getTime() === end.getTime() || end <= start) {
    const p = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr);
  }
}

export default function(db: any) {
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      res.json(db.prepare(`${LIST_SQL} ORDER BY t.id DESC`).all());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Introuvable' });
      const factures = db.prepare('SELECT * FROM factures WHERE contrat_id = ? ORDER BY periode').all(req.params.id);
      res.json({ ...row, factures });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', (req, res) => {
    try {
      const d = pick(db, 'contrats', req.body);
      const keys = Object.keys(d);
      if (!keys.length) return res.status(400).json({ error: 'Aucun champ valide' });
      const info = db.prepare(`INSERT INTO contrats (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .run(...keys.map(k => d[k]));
      const contrat = db.prepare('SELECT * FROM contrats WHERE id = ?').get(info.lastInsertRowid);
      generateFacturesForContrat(db, contrat.id);
      res.status(201).json(contrat);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      if (!db.prepare('SELECT 1 FROM contrats WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Introuvable' });
      const d = pick(db, 'contrats', req.body);
      const keys = Object.keys(d);
      if (keys.length) db.prepare(`UPDATE contrats SET ${keys.map(k => k + ' = ?').join(',')} WHERE id = ?`).run(...keys.map(k => d[k]), req.params.id);
      generateFacturesForContrat(db, Number(req.params.id));
      res.json(db.prepare('SELECT * FROM contrats WHERE id = ?').get(req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM factures WHERE contrat_id = ?').run(req.params.id);
      const info = db.prepare('DELETE FROM contrats WHERE id = ?').run(req.params.id);
      if (!info.changes) return res.status(404).json({ error: 'Introuvable' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
