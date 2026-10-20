import { Router } from 'express';

export default function(db: any) {
  const router = Router();
  const all = () => {
    const o: Record<string, any> = {};
    for (const r of db.prepare('SELECT key, value FROM settings').all()) o[r.key] = r.value;
    return o;
  };
  router.get('/', (_req, res) => {
    try {
      res.json(all());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/', (req, res) => {
    try {
      const b = req.body;
      if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ error: 'Objet attendu' });
      const st = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      db.transaction(() => {
        for (const [k, v] of Object.entries(b)) st.run(k, v == null ? null : String(v));
      })();
      res.json(all());
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  return router;
}
