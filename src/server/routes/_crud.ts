import { Router } from 'express';

export function cols(db: any, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => c.name);
}

export function pick(db: any, table: string, body: any): Record<string, any> {
  const allowed = cols(db, table).filter((c) => c !== 'id');
  const out: Record<string, any> = {};
  for (const k of allowed) if (body && body[k] !== undefined) out[k] = body[k];
  return out;
}

export interface CrudOpts {
  table: string;
  listSql?: string; // SELECT with joins, aliased main table as t
  filters?: string[]; // query params mapped to t.<column>
  validate?: (body: any, isCreate: boolean) => string | null;
  order?: string;
}

export function crud(db: any, o: CrudOpts, router = Router()) {
  const { table } = o;
  const order = o.order ?? 't.id DESC';
  router.get('/', (req, res) => {
    try {
      const where: string[] = [];
      const params: any[] = [];
      for (const f of o.filters ?? []) {
        if (req.query[f] !== undefined && req.query[f] !== '') {
          where.push(`t.${f} = ?`);
          params.push(req.query[f]);
        }
      }
      const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
      const base = o.listSql ?? `SELECT t.* FROM ${table} t`;
      try {
        res.json(db.prepare(`${base}${w} ORDER BY ${order}`).all(...params));
      } catch (e) {
        if (!o.listSql) throw e;
        // join target table/column missing: fall back to plain list
        res.json(db.prepare(`SELECT t.* FROM ${table} t${w} ORDER BY ${order}`).all(...params));
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/', (req, res) => {
    try {
      const err = o.validate?.(req.body, true);
      if (err) return res.status(400).json({ error: err });
      const d = pick(db, table, req.body);
      const keys = Object.keys(d);
      const info = keys.length
        ? db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => d[k]))
        : db.prepare(`INSERT INTO ${table} DEFAULT VALUES`).run();
      res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.put('/:id', (req, res) => {
    try {
      const err = o.validate?.(req.body, false);
      if (err) return res.status(400).json({ error: err });
      if (!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(req.params.id)) return res.status(404).json({ error: 'Introuvable' });
      const d = pick(db, table, req.body);
      const keys = Object.keys(d);
      if (keys.length) db.prepare(`UPDATE ${table} SET ${keys.map((k) => k + ' = ?').join(',')} WHERE id = ?`).run(...keys.map((k) => d[k]), req.params.id);
      res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete('/:id', (req, res) => {
    try {
      const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
      if (!info.changes) return res.status(404).json({ error: 'Introuvable' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  return router;
}
