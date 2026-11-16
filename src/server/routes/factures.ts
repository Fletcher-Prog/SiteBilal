import { Router } from 'express';
import { pick } from './_crud.js';

const SQL = 'SELECT t.*, v.serial AS vitrine_serial, v.model AS vitrine_model FROM factures t LEFT JOIN vitrines v ON v.id = t.vitrine_id';

function nextNumero(db: any): string {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT MAX(CAST(SUBSTR(numero, 9) AS INTEGER)) AS n FROM factures WHERE numero LIKE 'FC-${year}-%'`).get() as { n: number | null };
  const n = (row?.n ?? 0) + 1;
  return `FC-${year}-${String(n).padStart(3, '0')}`;
}

export default function (db: any) {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const { contrat_id, client, periode, statut } = req.query as any;
      const where: string[] = [];
      const params: any[] = [];
      if (contrat_id) { where.push('t.contrat_id = ?'); params.push(contrat_id); }
      if (client) { where.push('t.client = ?'); params.push(client); }
      if (periode) { where.push('t.periode = ?'); params.push(periode); }
      if (statut) { where.push('t.statut = ?'); params.push(statut); }
      const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
      res.json(db.prepare(`${SQL}${w} ORDER BY t.id DESC`).all(...params));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const d = pick(db, 'factures', { ...req.body, numero: req.body.numero || nextNumero(db) });
      const keys = Object.keys(d);
      const info = db.prepare(`INSERT INTO factures (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => d[k]));
      res.status(201).json(db.prepare('SELECT * FROM factures WHERE id = ?').get(info.lastInsertRowid));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      if (!db.prepare('SELECT 1 FROM factures WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Introuvable' });
      const d = pick(db, 'factures', req.body);
      const keys = Object.keys(d);
      if (keys.length) db.prepare(`UPDATE factures SET ${keys.map((k) => k + ' = ?').join(',')} WHERE id = ?`).run(...keys.map((k) => d[k]), req.params.id);
      res.json(db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.put('/:id/payer', (req, res) => {
    try {
      const facture = db.prepare('SELECT * FROM factures WHERE id = ?').get(req.params.id) as any;
      if (!facture) return res.status(404).json({ error: 'Introuvable' });
      const datePaiement = new Date().toISOString().slice(0, 10);
      db.prepare('UPDATE factures SET statut = ?, date_paiement = ? WHERE id = ?').run('payee', datePaiement, req.params.id);

      // Auto-create flux entry for the payment
      let qui = facture.qui;
      if (!qui && facture.contrat_id) {
        const contrat = db.prepare('SELECT qui FROM contrats WHERE id = ?').get(facture.contrat_id) as any;
        if (contrat?.qui) qui = contrat.qui;
      }
      if (!qui) qui = 'Commun';
      const mois = facture.periode || new Date().toISOString().slice(0, 7);
      const label = `Facture ${facture.numero || '#' + facture.id} payée — ${facture.client || ''}`.trim();
      db.prepare('INSERT INTO flux (type_flux, montant, qui, client, mois, commentaire) VALUES (?, ?, ?, ?, ?, ?)').run(
        'location', facture.montant || 0, qui, facture.client || '', mois, label
      );

      res.json(db.prepare(`${SQL} WHERE t.id = ?`).get(req.params.id));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.put('/:id/impayee', (req, res) => {
    try {
      if (!db.prepare('SELECT 1 FROM factures WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Introuvable' });
      db.prepare('UPDATE factures SET statut = ?, date_paiement = NULL WHERE id = ?').run('emise', req.params.id);
      res.json(db.prepare(`${SQL} WHERE t.id = ?`).get(req.params.id));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.post('/regenerate', (_req, res) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const contrats = db.prepare('SELECT * FROM contrats WHERE date_debut IS NOT NULL').all();
    const insert = db.prepare('INSERT OR IGNORE INTO factures (contrat_id, periode, montant, client, vitrine_id, statut, date_emission, qui) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    let created = 0;
    db.transaction(() => {
      for (const c of contrats as any[]) {
        if (!c.date_debut) continue;
        if (Number(c.montant_fixe) > 0) {
          if (insert.run(c.id, c.date_debut.slice(0, 7), c.montant_fixe, c.client || '', c.vitrine_id, 'emise', todayStr, c.qui || null).changes) created++;
          continue;
        }
        const start = new Date(c.date_debut + 'T00:00:00');
        const end = c.date_fin ? new Date(c.date_fin + 'T00:00:00') : new Date(start.getFullYear(), start.getMonth() + (c.duree || 1), start.getDate());
        const d = new Date(start);
        while (d < end) {
          const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const r = insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'emise', todayStr, c.qui || null);
          if (r.changes) created++;
          d.setMonth(d.getMonth() + 1);
        }
        if (end <= start) {
          const p = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
          const r = insert.run(c.id, p, c.montant || 0, c.client || '', c.vitrine_id, 'emise', todayStr, c.qui || null);
          if (r.changes) created++;
        }
      }
    })();
    res.json({ created });
  });

  router.delete('/:id', (req, res) => {
    try {
      const info = db.prepare('DELETE FROM factures WHERE id = ?').run(req.params.id);
      if (!info.changes) return res.status(404).json({ error: 'Introuvable' });
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  return router;
}
