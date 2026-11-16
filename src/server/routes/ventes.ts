import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  const router = Router();
  // Une vitrine ne peut être vendue qu'une fois.
  const alreadySold = (vitrineId: any, exceptId?: any) =>
    vitrineId != null && vitrineId !== '' &&
    db.prepare('SELECT id FROM ventes WHERE vitrine_id = ? AND id != ?').get(vitrineId, exceptId ?? -1);
  router.post('/', (req, res, next) => {
    if (alreadySold(req.body?.vitrine_id)) return res.status(409).json({ error: 'Cette vitrine est déjà vendue' });
    next();
  });
  router.put('/:id', (req, res, next) => {
    if (req.body?.vitrine_id !== undefined && alreadySold(req.body.vitrine_id, req.params.id)) return res.status(409).json({ error: 'Cette vitrine est déjà vendue' });
    next();
  });
  return crud(db, {
    table: 'ventes',
    listSql: 'SELECT t.*, v.model AS vitrine_nom, v.serial AS vitrine_serie, v.date_achat AS vitrine_date_achat, v.prix_achat AS vitrine_prix_achat FROM ventes t LEFT JOIN vitrines v ON v.id = t.vitrine_id',
    filters: ['vitrine_id'],
  }, router);
}
