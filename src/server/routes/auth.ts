import { Router } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = 'vitritrack-secret';

export default function(db: any) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { name, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'name et password requis' });
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
    if (!user || user.password !== password) return res.status(401).json({ error: 'Identifiants invalides' });
    if (user.active === 0) return res.status(403).json({ error: 'Compte désactivé' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  router.get('/users', (_req, res) => {
    res.json(db.prepare('SELECT id, name, email, role, active FROM users').all());
  });

  router.post('/users', (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'Nom et mot de passe requis' });
    if (db.prepare('SELECT 1 FROM users WHERE name = ?').get(name)) return res.status(409).json({ error: 'Ce nom existe déjà' });
    try {
      const r = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email || '', password, role || 'admin');
      res.status(201).json({ id: r.lastInsertRowid, name, email: email || '', role: role || 'admin', active: 1 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/users/:id', (req, res) => {
    const { active } = req.body || {};
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
    res.json({ ok: true });
  });

  router.delete('/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  router.post('/logout', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h;
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    try {
      const p: any = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(p.id);
      if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
      res.json({ id: user.id, name: user.name, role: user.role });
    } catch {
      res.status(401).json({ error: 'Token invalide' });
    }
  });

  return router;
}
