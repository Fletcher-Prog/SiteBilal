import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  const router = Router();
  router.put('/:id/toggle', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Introuvable' });
      db.prepare('UPDATE actions SET fait = ? WHERE id = ?').run(row.fait ? 0 : 1, req.params.id);
      res.json(db.prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  return crud(db, { table: 'actions' }, router);
}
