import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  const router = Router();
  // /stats registered before /:id routes
  router.get('/stats', (req, res) => {
    try {
      const params: any[] = [];
      let w = '';
      if (req.query.mois) {
        w = ' WHERE mois = ?';
        params.push(String(req.query.mois));
      }
      const parMois = db.prepare(`SELECT mois, type_flux, SUM(montant) AS total, COUNT(*) AS nb FROM flux${w} GROUP BY mois, type_flux ORDER BY MIN(id)`).all(...params);
      const parType = db.prepare(`SELECT type_flux, SUM(montant) AS total, COUNT(*) AS nb FROM flux${w} GROUP BY type_flux`).all(...params);
      const total = db.prepare(`SELECT COALESCE(SUM(montant),0) AS total FROM flux${w}`).get(...params).total;
      res.json({ parMois, parType, total });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/', (req, res) => {
    try {
      const where: string[] = [];
      const p: any[] = [];
      if (req.query.type_flux) { where.push('type_flux = ?'); p.push(req.query.type_flux); }
      if (req.query.mois) { where.push('mois = ?'); p.push(req.query.mois); }
      res.json(db.prepare(`SELECT * FROM flux${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`).all(...p));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  return crud(db, { table: 'flux' }, router);
}
