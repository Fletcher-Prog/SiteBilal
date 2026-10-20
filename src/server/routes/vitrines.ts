import { Router } from 'express';

export default function(db: any) {
  const router = Router();
  const cols = (): string[] => db.prepare('PRAGMA table_info(vitrines)').all().map((c: any) => c.name);
  const pick = (body: any) => {
    const allowed = cols();
    return Object.keys(body || {}).filter(k => k !== 'id' && allowed.includes(k));
  };

  router.get('/', (req, res) => {
    const { q, lieu_id, fonctionnelle } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];
    if (q) {
      const like = `%${q}%`;
      const searchable = cols().filter(c => ['serial', 'model', 'nfc_tag', 'commentaire'].includes(c));
      if (searchable.length) {
        where.push('(' + searchable.map(c => `${c} LIKE ?`).join(' OR ') + ')');
        searchable.forEach(() => params.push(like));
      }
    }
    if (lieu_id) { where.push('lieu_id = ?'); params.push(lieu_id); }
    if (fonctionnelle !== undefined && fonctionnelle !== '') {
      where.push(fonctionnelle === 'true' || fonctionnelle === '1' ? '(fonctionnelle IS NULL OR fonctionnelle = 1)' : 'fonctionnelle = 0');
    }
    const sql = 'SELECT * FROM vitrines' + (where.length ? ' WHERE ' + where.join(' AND ') : '');
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/:id', (req, res) => {
    const v = db.prepare('SELECT * FROM vitrines WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vitrine introuvable' });
    const bookings = db.prepare('SELECT b.* FROM bookings b JOIN vitrines v ON v.id = b.vitrine_id WHERE v.id = ?').all(req.params.id);
    const interventions = db.prepare('SELECT i.* FROM interventions i JOIN vitrines v ON v.id = i.vitrine_id WHERE v.id = ?').all(req.params.id);
    res.json({ ...v, bookings, interventions });
  });

  router.post('/', (req, res) => {
    const keys = pick(req.body);
    if (!keys.length) return res.status(400).json({ error: 'Aucun champ valide' });
    const r = db.prepare(`INSERT INTO vitrines (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
      .run(...keys.map(k => req.body[k]));
    res.status(201).json(db.prepare('SELECT * FROM vitrines WHERE id = ?').get(r.lastInsertRowid));
  });

  router.put('/:id/status', (req, res) => {
    const v = db.prepare('SELECT * FROM vitrines WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vitrine introuvable' });
    const next = req.body && req.body.fonctionnelle !== undefined ? (req.body.fonctionnelle ? 1 : 0) : (v.fonctionnelle === 0 ? 1 : 0);
    db.prepare('UPDATE vitrines SET fonctionnelle = ? WHERE id = ?').run(next, req.params.id);
    res.json(db.prepare('SELECT * FROM vitrines WHERE id = ?').get(req.params.id));
  });

  router.put('/:id/nfc', (req, res) => {
    const v = db.prepare('SELECT id FROM vitrines WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vitrine introuvable' });
    const tag = req.body && (req.body.nfc_tag ?? req.body.nfc);
    if (tag === undefined) return res.status(400).json({ error: 'nfc_tag requis' });
    db.prepare('UPDATE vitrines SET nfc_tag = ? WHERE id = ?').run(tag, req.params.id);
    res.json(db.prepare('SELECT * FROM vitrines WHERE id = ?').get(req.params.id));
  });

  router.put('/:id', (req, res) => {
    const v = db.prepare('SELECT id FROM vitrines WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vitrine introuvable' });
    const keys = pick(req.body);
    if (!keys.length) return res.status(400).json({ error: 'Aucun champ valide' });
    db.prepare(`UPDATE vitrines SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...keys.map(k => req.body[k]), req.params.id);
    res.json(db.prepare('SELECT * FROM vitrines WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const r = db.prepare('DELETE FROM vitrines WHERE id = ?').run(req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Vitrine introuvable' });
    res.json({ ok: true });
  });

  return router;
}
