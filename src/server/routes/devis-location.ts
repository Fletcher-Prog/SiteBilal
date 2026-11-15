import { Router } from 'express';
import { pick } from './_crud.js';

const SQL = 'SELECT t.*, v.serial AS vitrine_serial, v.model AS vitrine_model FROM devis_location t LEFT JOIN vitrines v ON v.id = t.vitrine_id';

function nextNumero(db: any): string {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT MAX(CAST(SUBSTR(numero, 9) AS INTEGER)) AS n FROM devis_location WHERE numero LIKE 'DL-${year}-%'`).get() as { n: number | null };
  const n = (row?.n ?? 0) + 1;
  return `DL-${year}-${String(n).padStart(3, '0')}`;
}

export default function (db: any) {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(db.prepare(`${SQL} ORDER BY t.id DESC`).all()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare(`${SQL} WHERE t.id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Introuvable' });
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const d = pick(db, 'devis_location', { ...req.body, numero: req.body.numero || nextNumero(db) });
      const keys = Object.keys(d);
      const info = db.prepare(`INSERT INTO devis_location (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => d[k]));
      res.status(201).json(db.prepare('SELECT * FROM devis_location WHERE id = ?').get(info.lastInsertRowid));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      if (!db.prepare('SELECT 1 FROM devis_location WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Introuvable' });
      const d = pick(db, 'devis_location', req.body);
      const keys = Object.keys(d);
      if (keys.length) db.prepare(`UPDATE devis_location SET ${keys.map((k) => k + ' = ?').join(',')} WHERE id = ?`).run(...keys.map((k) => d[k]), req.params.id);
      res.json(db.prepare('SELECT * FROM devis_location WHERE id = ?').get(req.params.id));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      const info = db.prepare('DELETE FROM devis_location WHERE id = ?').run(req.params.id);
      if (!info.changes) return res.status(404).json({ error: 'Introuvable' });
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  return router;
}
