import { Router } from 'express';
import { crud } from './_crud.js';

const SQL = 'SELECT t.*, v.nom AS vitrine_nom, c.nom AS client_nom FROM contrats t LEFT JOIN vitrines v ON v.id = t.vitrine_id LEFT JOIN clients c ON c.id = t.client_id';

export default function(db: any) {
  const router = Router();
  router.get('/:id', (req, res) => {
    try {
      let row;
      try {
        row = db.prepare(`${SQL} WHERE t.id = ?`).get(req.params.id);
      } catch {
        row = db.prepare('SELECT * FROM contrats WHERE id = ?').get(req.params.id);
      }
      if (!row) return res.status(404).json({ error: 'Introuvable' });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  return crud(db, { table: 'contrats', listSql: SQL, filters: ['vitrine_id', 'client_id'] }, router);
}
