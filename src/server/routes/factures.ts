import { Router } from 'express';

export default function(db: any) {
  const router = Router();

  router.get('/', (req, res) => {
    const { contrat_id, client, periode, statut } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];
    if (contrat_id) { where.push('contrat_id = ?'); params.push(contrat_id); }
    if (client) { where.push('client = ?'); params.push(client); }
    if (periode) { where.push('periode = ?'); params.push(periode); }
    if (statut) { where.push('statut = ?'); params.push(statut); }
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
    try {
      const rows = db.prepare(`SELECT f.*, v.serial AS vitrine_serial, v.model AS vitrine_model FROM factures f LEFT JOIN vitrines v ON v.id = f.vitrine_id${w} ORDER BY f.periode DESC, f.id DESC`).all(...params);
      res.json(rows);
    } catch {
      res.json(db.prepare(`SELECT * FROM factures${w} ORDER BY periode DESC, id DESC`).all(...params));
    }
  });

  router.put('/:id/payer', (req, res) => {
    const f = db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Facture introuvable' });
    db.prepare('UPDATE factures SET statut = ? WHERE id = ?').run('payee', req.params.id);
    res.json(db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id));
  });

  router.put('/:id/impayee', (req, res) => {
    const f = db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Facture introuvable' });
    db.prepare('UPDATE factures SET statut = ? WHERE id = ?').run('generee', req.params.id);
    res.json(db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id));
  });

  router.post('/regenerate', (_req, res) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const contrats = db.prepare('SELECT * FROM contrats WHERE date_debut IS NOT NULL').all();
    const insert = db.prepare('INSERT OR IGNORE INTO factures (contrat_id, periode, montant, client, vitrine_id, statut, date_emission) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let created = 0;
    db.transaction(() => {
      for (const c of contrats) {
        if (!c.date_debut) continue;
        const start = new Date(c.date_debut + 'T00:00:00');
        const end = c.date_fin ? new Date(c.date_fin + 'T00:00:00') : new Date(start.getFullYear(), start.getMonth() + (c.duree || 1), start.getDate());
        const d = new Date(start);
        while (d < end) {
          const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const r = insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr);
          if (r.changes) created++;
          d.setMonth(d.getMonth() + 1);
        }
        if (end <= start) {
          const p = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
          const r = insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'generee', todayStr);
          if (r.changes) created++;
        }
      }
    })();
    res.json({ created });
  });

  return router;
}
