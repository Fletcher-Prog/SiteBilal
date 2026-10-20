import { Router } from 'express';

export default function(db: any) {
  const router = Router();
  const pick = (body: any) => {
    const allowed: string[] = db.prepare('PRAGMA table_info(bookings)').all().map((c: any) => c.name);
    return Object.keys(body || {}).filter(k => k !== 'id' && allowed.includes(k));
  };
  const addMonths = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + (Number(n) || 1)); return x.getTime(); };
  const span = (o: any): [number, number] | null => {
    const start = o.start_date || o.date_debut;
    if (!start || isNaN(Date.parse(start))) return null;
    const s0 = Date.parse(start + 'T00:00:00Z');
    const e0 = o.date_fin ? Date.parse(o.date_fin + 'T00:00:00Z') : addMonths(start, o.duration_months);
    return [s0, e0];
  };
  const conflict = (o: any, excludeId?: any) => {
    const r = span(o);
    if (!o.vitrine_id || !r) return [];
    return db.prepare('SELECT * FROM bookings WHERE vitrine_id = ?').all(o.vitrine_id).filter((b: any) => {
      if (excludeId != null && String(b.id) === String(excludeId)) return false;
      if (b.etat === 'annulee') return false;
      const x = span(b);
      return x && x[0] < r[1] && x[1] > r[0];
    });
  };

  router.get('/', (_req, res) => {
    res.json(db.prepare('SELECT * FROM bookings ORDER BY start_date DESC').all());
  });

  router.post('/check-conflict', (req, res) => {
    const b = req.body || {};
    if (!b.vitrine_id || !span(b)) return res.status(400).json({ error: 'vitrine_id, start_date, duration_months requis' });
    const c = conflict(b, b.exclude_id);
    res.json({ conflict: c.length > 0, bookings: c });
  });

  router.post('/', (req, res) => {
    const keys = pick(req.body);
    if (!keys.length) return res.status(400).json({ error: 'Aucun champ valide' });
    const c = conflict(req.body);
    if (c.length) return res.status(409).json({ error: 'Conflit de dates', bookings: c });
    const r = db.prepare(`INSERT INTO bookings (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
      .run(...keys.map(k => req.body[k]));
    res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(r.lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const cur = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!cur) return res.status(404).json({ error: 'Booking introuvable' });
    const keys = pick(req.body);
    if (!keys.length) return res.status(400).json({ error: 'Aucun champ valide' });
    const m = { ...cur, ...req.body };
    const c = conflict(m, req.params.id);
    if (c.length) return res.status(409).json({ error: 'Conflit de dates', bookings: c });
    db.prepare(`UPDATE bookings SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...keys.map(k => req.body[k]), req.params.id);
    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const r = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Booking introuvable' });
    res.json({ ok: true });
  });

  return router;
}
